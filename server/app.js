'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const compression = require('compression');
const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const multer = require('multer');
const config = require('./config');
const {
    authMiddleware,
    clearSessionCookie,
    createSessionToken,
    sessionHash,
    setSessionCookie,
    verifyPassword,
    hashPassword
} = require('./auth');

const ROLES = new Set(['coordinator', 'supervisor', 'wfm', 'management', 'superadmin']);
const REQUEST_TYPES = new Set([
    'schedule_change',
    'swap',
    'comp_time',
    'overtime',
    'siop_validation',
    'exception'
]);
const REQUEST_STATUSES = new Set([
    'pending',
    'in_review',
    'resolved',
    'approved',
    'rejected',
    'cancelled'
]);
const PERIOD_TYPES = new Set(['specific', 'current_week', 'month', 'weekend']);
const EXCEPTION_ORIGINS = new Set(['coordinator', 'supervisor', 'agent']);
const FINAL_STATUSES = new Set(['resolved', 'approved', 'rejected', 'cancelled']);
const SAFE_UPLOAD_TYPES = new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/csv',
    'text/plain'
]);

const TABLES = Object.freeze({
    profiles: {
        columns: ['id', 'email', 'full_name', 'role', 'department', 'coordinator_id', 'active', 'created_at'],
        filters: ['id', 'role', 'coordinator_id', 'active'],
        orders: ['full_name', 'created_at']
    },
    dotacion: {
        columns: ['dni', 'full_name', 'job_title', 'service', 'active', 'created_at'],
        filters: ['dni', 'active', 'service'],
        orders: ['full_name', 'dni', 'created_at']
    },
    business_rules: {
        columns: [
            'id', 'rule_key', 'title', 'description', 'min_advance_hours', 'same_day_cutoff',
            'requires_evidence', 'coordinator_allowed', 'supervisor_allowed', 'updated_by', 'updated_at'
        ],
        filters: ['rule_key'],
        orders: ['rule_key', 'id', 'updated_at']
    },
    requests: {
        columns: [
            'id', 'requester_id', 'requester_name', 'type', 'status', 'event_date', 'start_time', 'end_time',
            'employee_name', 'employee_dni', 'employee_dni_2', 'employee_job_title', 'employee_service',
            'current_start_time', 'current_end_time', 'current_start_time_2', 'current_end_time_2',
            'event_dates', 'period_type', 'exception_type', 'exception_origin', 'exception_supervisor_id',
            'exception_supervisor_name', 'reason', 'evidence_path', 'connection_evidence_path', 'exception_detail',
            'hours', 'review_comment', 'reviewed_by', 'reviewed_at', 'created_at', 'updated_at'
        ],
        filters: ['id', 'requester_id', 'type', 'status', 'event_date'],
        orders: ['id', 'created_at', 'event_date', 'status']
    }
});

class ApiError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

function cleanText(value, maxLength, fallback = null) {
    if (value === undefined || value === null) return fallback;
    const cleaned = String(value).trim();
    if (!cleaned) return fallback;
    if (cleaned.length > maxLength) throw new ApiError(400, `Un campo supera el máximo de ${maxLength} caracteres.`);
    return cleaned;
}

function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return false;
    const parsed = new Date(`${value}T12:00:00`);
    return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

function normalizeTime(value) {
    if (value === undefined || value === null || value === '') return null;
    const match = String(value).match(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
    if (!match) throw new ApiError(400, 'El formato de hora no es válido.');
    return `${match[1]}:${match[2]}`;
}

function localDate(date = new Date()) {
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}

function minutesSinceMidnight(time) {
    const [hours, minutes] = time.slice(0, 5).split(':').map(Number);
    return hours * 60 + minutes;
}

function selectedColumns(table, requested) {
    const definition = TABLES[table];
    if (!requested || requested === '*') return definition.columns;

    const selected = requested.split(',').map(value => value.trim()).filter(Boolean);
    if (!selected.length || selected.some(column => !definition.columns.includes(column))) {
        throw new ApiError(400, 'La selección de columnas no es válida.');
    }
    return selected;
}

function parseFilters(table, rawFilters) {
    if (!rawFilters) return {};

    let filters;
    try {
        filters = JSON.parse(rawFilters);
    } catch {
        throw new ApiError(400, 'Los filtros no son válidos.');
    }

    const allowed = TABLES[table].filters;
    if (!filters || Array.isArray(filters) || Object.keys(filters).some(key => !allowed.includes(key))) {
        throw new ApiError(400, 'Uno de los filtros no está permitido.');
    }
    return filters;
}

function buildSelect(table, columns, filters, orderColumn, ascending) {
    const values = [];
    const conditions = Object.entries(filters).map(([column, value]) => {
        values.push(value);
        return `"${column}" = $${values.length}`;
    });
    const where = conditions.length ? ` where ${conditions.join(' and ')}` : '';
    const order = orderColumn
        ? ` order by "${orderColumn}" ${ascending ? 'asc' : 'desc'}`
        : '';
    return {
        text: `select ${columns.map(column => `"${column}"`).join(', ')} from "${table}"${where}${order} limit 10000`,
        values
    };
}

function ensureProfileQueryAccess(user, filters) {
    if (filters.id === user.id) return;
    if (['wfm', 'management', 'superadmin'].includes(user.role)) return;

    const assignedSupervisorQuery = user.role === 'coordinator'
        && filters.role === 'supervisor'
        && filters.coordinator_id === user.id;
    if (!assignedSupervisorQuery) throw new ApiError(403, 'No tienes permiso para consultar esos perfiles.');
}

function csrfGuard(request, _response, next) {
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return next();
    const origin = request.get('origin');
    if (!origin) return next();

    try {
        const source = new URL(origin);
        if (source.host !== request.get('host')) throw new Error('Origen distinto');
        return next();
    } catch {
        return next(new ApiError(403, 'Origen de la solicitud no permitido.'));
    }
}

function requireRole(...roles) {
    return (request, _response, next) => {
        if (!roles.includes(request.user.role)) return next(new ApiError(403, 'No tienes permiso para esta acción.'));
        next();
    };
}

function requireCompletedPasswordChange(request, _response, next) {
    if (request.user.password_change_required) {
        return next(new ApiError(403, 'Debes cambiar tu contraseña antes de continuar.'));
    }
    next();
}

function errorMessage(error) {
    if (error instanceof ApiError) return error.message;
    if (error.code === '23505') return 'Ya existe un registro con esos datos.';
    if (error.code === '23503') return 'Uno de los datos relacionados no existe.';
    if (error.code === '23514' || error.code === '22P02') return 'Los datos enviados no son válidos.';
    return 'Ocurrió un error interno. Intenta nuevamente.';
}

function createApp({ pool, transaction }) {
    const app = express();
    const authenticate = authMiddleware(pool);
    const upload = multer({
        storage: multer.memoryStorage(),
        limits: { fileSize: config.maxUploadBytes, files: 1 }
    });

    app.disable('x-powered-by');
    app.set('trust proxy', config.trustProxy);
    app.use(helmet({
        strictTransportSecurity: config.secureCookie
            ? { maxAge: 31_536_000, includeSubDomains: true }
            : false,
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                baseUri: ["'self'"],
                connectSrc: ["'self'"],
                fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
                formAction: ["'self'"],
                frameAncestors: ["'none'"],
                imgSrc: ["'self'", 'data:'],
                objectSrc: ["'none'"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
                upgradeInsecureRequests: null
            }
        },
        crossOriginEmbedderPolicy: false
    }));
    app.use(compression());
    app.use(express.json({ limit: '1mb' }));
    app.use('/api', csrfGuard);

    app.get('/healthz', async (_request, response, next) => {
        try {
            await pool.query('select 1');
            response.json({ status: 'ok' });
        } catch (error) {
            next(error);
        }
    });

    const loginLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 10,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        message: { error: 'Demasiados intentos. Espera 15 minutos antes de intentar de nuevo.' }
    });

    app.post('/api/auth/login', loginLimiter, async (request, response) => {
        const email = cleanText(request.body?.email, 320, '')?.toLowerCase();
        const password = String(request.body?.password || '');
        if (!email || !password) throw new ApiError(400, 'Correo y contraseña son obligatorios.');

        const result = await pool.query(
            `select id, email, full_name, role, password_hash, password_change_required
             from profiles where email = $1 and active = true`,
            [email]
        );
        const user = result.rows[0];
        if (!user?.password_hash || !(await verifyPassword(password, user.password_hash))) {
            throw new ApiError(401, 'Correo o contraseña incorrectos.');
        }

        const token = createSessionToken();
        const expiresAt = new Date(Date.now() + config.sessionHours * 60 * 60 * 1000);
        await pool.query('delete from sessions where expires_at <= now()');
        await pool.query(
            `insert into sessions (token_hash, user_id, expires_at, ip_address, user_agent)
             values ($1, $2, $3, $4, $5)`,
            [sessionHash(token), user.id, expiresAt, request.ip, cleanText(request.get('user-agent'), 500)]
        );
        setSessionCookie(response, token, expiresAt);
        response.json({
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    password_change_required: user.password_change_required
                }
            }
        });
    });

    app.get('/api/auth/me', authenticate, (request, response) => {
        response.json({
            data: {
                user: {
                    id: request.user.id,
                    email: request.user.email,
                    password_change_required: request.user.password_change_required
                },
                session: { expires_in: config.sessionHours * 60 * 60 }
            }
        });
    });

    app.post('/api/auth/logout', authenticate, async (request, response) => {
        await pool.query('delete from sessions where token_hash = $1', [request.sessionTokenHash]);
        clearSessionCookie(response);
        response.status(204).end();
    });

    app.patch('/api/auth/password', authenticate, async (request, response) => {
        const password = String(request.body?.password || '');
        if (password.length < 10 || password.length > 200) {
            throw new ApiError(400, 'La contraseña debe tener entre 10 y 200 caracteres.');
        }
        const current = await pool.query('select password_hash from profiles where id = $1', [request.user.id]);
        if (await verifyPassword(password, current.rows[0]?.password_hash)) {
            throw new ApiError(400, 'La nueva contraseña debe ser diferente a la contraseña actual.');
        }
        const passwordHash = await hashPassword(password);
        await transaction(async client => {
            await client.query(
                `update profiles
                 set password_hash = $1, password_change_required = false, updated_at = now()
                 where id = $2`,
                [passwordHash, request.user.id]
            );
            await client.query('delete from sessions where user_id = $1 and token_hash <> $2', [request.user.id, request.sessionTokenHash]);
        });
        response.json({ data: { updated: true } });
    });

    app.use(['/api/data', '/api/evidence'], authenticate, requireCompletedPasswordChange);

    app.get('/api/data/:table', async (request, response) => {
        const { table } = request.params;
        if (!TABLES[table]) throw new ApiError(404, 'Recurso no encontrado.');

        const columns = selectedColumns(table, request.query.select);
        const filters = parseFilters(table, request.query.filters);
        const orderColumn = request.query.order || '';
        if (orderColumn && !TABLES[table].orders.includes(orderColumn)) {
            throw new ApiError(400, 'El orden solicitado no está permitido.');
        }

        if (table === 'profiles') ensureProfileQueryAccess(request.user, filters);
        if (table === 'dotacion') filters.active = true;

        const query = buildSelect(table, columns, filters, orderColumn, request.query.ascending === 'true');
        const result = await pool.query(query);
        response.json({ data: result.rows });
    });

    app.post('/api/data/requests', async (request, response) => {
        const input = request.body?.values || {};
        const type = cleanText(input.type, 40);
        if (!REQUEST_TYPES.has(type)) throw new ApiError(400, 'Tipo de solicitud no válido.');
        if (!['coordinator', 'supervisor'].includes(request.user.role)) {
            throw new ApiError(403, 'Tu rango no puede crear solicitudes.');
        }

        const eventDate = cleanText(input.event_date, 10);
        if (!validDate(eventDate)) throw new ApiError(400, 'La fecha del evento no es válida.');
        const startTime = normalizeTime(input.start_time);
        const endTime = normalizeTime(input.end_time);
        if (startTime && endTime && endTime <= startTime) {
            throw new ApiError(400, 'La hora final debe ser posterior a la inicial.');
        }

        const employeeDni = cleanText(input.employee_dni, 30);
        const employeeDni2 = cleanText(input.employee_dni_2, 30);
        if (!employeeDni || (type === 'swap' && (!employeeDni2 || employeeDni2 === employeeDni))) {
            throw new ApiError(400, 'La información de los agentes no es válida.');
        }

        const rawDates = Array.isArray(input.event_dates) ? input.event_dates : [eventDate];
        const eventDates = [...new Set(rawDates.map(String))];
        if (!eventDates.includes(eventDate) || eventDates.some(date => !validDate(date))) {
            throw new ApiError(400, 'Las fechas asociadas no son válidas.');
        }
        if (type === 'comp_time' && eventDates.length > 5) {
            throw new ApiError(400, 'Los compensados admiten máximo 5 fechas.');
        }

        const ruleResult = await pool.query('select * from business_rules where rule_key = $1', [type]);
        const rule = ruleResult.rows[0];
        if (!rule) throw new ApiError(400, 'No existe una regla activa para esta solicitud.');
        const allowed = request.user.role === 'coordinator' ? rule.coordinator_allowed : rule.supervisor_allowed;
        if (!allowed) throw new ApiError(403, 'Este tipo de solicitud no está habilitado para tu rango.');

        const eventAt = new Date(`${eventDate}T${startTime || '00:00'}:00`);
        if (type !== 'exception' && Number(rule.min_advance_hours) > 0
            && eventAt.valueOf() - Date.now() < Number(rule.min_advance_hours) * 3_600_000) {
            throw new ApiError(400, `Esta solicitud requiere ${rule.min_advance_hours} horas de anticipación. Usa Excepción.`);
        }

        if (type === 'comp_time') {
            const today = localDate();
            if (eventDates.some(date => date < today)) throw new ApiError(400, 'Los compensados retroactivos no se aceptan.');
            if (eventDates.includes(today) && rule.same_day_cutoff) {
                const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
                if (nowMinutes >= minutesSinceMidnight(rule.same_day_cutoff)) {
                    throw new ApiError(400, `El corte para compensados de hoy fue a las ${rule.same_day_cutoff.slice(0, 5)}.`);
                }
            }
        }

        const evidencePath = cleanText(input.evidence_path, 600);
        if (rule.requires_evidence && !evidencePath) throw new ApiError(400, 'Esta solicitud requiere evidencia.');
        if (evidencePath) {
            const evidence = await pool.query(
                'select path from evidence_uploads where path = $1 and uploaded_by = $2 and request_id is null',
                [evidencePath, request.user.id]
            );
            if (!evidence.rows[0]) throw new ApiError(400, 'La evidencia no existe o ya fue utilizada.');
        }

        let hours = null;
        if (startTime && endTime) hours = (minutesSinceMidnight(endTime) - minutesSinceMidnight(startTime)) / 60;
        if (type === 'overtime' && hours > 5) throw new ApiError(400, 'Las horas extra no pueden superar 5 horas.');

        const employeeResult = await pool.query(
            'select dni, full_name, job_title, service from dotacion where dni = any($1::text[]) and active = true',
            [[employeeDni, employeeDni2].filter(Boolean)]
        );
        const employees = new Map(employeeResult.rows.map(employee => [employee.dni, employee]));
        if (!employees.has(employeeDni) || (employeeDni2 && !employees.has(employeeDni2))) {
            throw new ApiError(400, 'Uno de los DNI no existe en la dotación activa.');
        }

        const periodType = cleanText(input.period_type, 30, 'specific');
        if (!PERIOD_TYPES.has(periodType)) throw new ApiError(400, 'El período no es válido.');
        const exceptionType = cleanText(input.exception_type, 40);
        const exceptionOrigin = cleanText(input.exception_origin, 30);
        if (type === 'exception' && (!REQUEST_TYPES.has(exceptionType) || exceptionType === 'exception')) {
            throw new ApiError(400, 'El tipo de excepción no es válido.');
        }
        if (type === 'exception' && !EXCEPTION_ORIGINS.has(exceptionOrigin)) {
            throw new ApiError(400, 'El origen de la excepción no es válido.');
        }

        let supervisor = null;
        const supervisorId = cleanText(input.exception_supervisor_id, 36);
        if (type === 'exception' && exceptionOrigin === 'supervisor') {
            if (request.user.role === 'supervisor') {
                supervisor = { id: request.user.id, full_name: request.user.full_name };
            } else {
                if (!supervisorId) throw new ApiError(400, 'Selecciona el supervisor relacionado.');
                const supervisorResult = await pool.query(
                    `select id, full_name from profiles
                     where id = $1 and role = 'supervisor' and coordinator_id = $2 and active = true`,
                    [supervisorId, request.user.id]
                );
                supervisor = supervisorResult.rows[0];
                if (!supervisor) throw new ApiError(400, 'El supervisor no está asignado a este coordinador.');
            }
        }

        const currentStart1 = normalizeTime(input.current_start_time);
        const currentEnd1 = normalizeTime(input.current_end_time);
        const currentStart2 = normalizeTime(input.current_start_time_2);
        const currentEnd2 = normalizeTime(input.current_end_time_2);
        if ((currentStart1 && currentEnd1 && currentEnd1 <= currentStart1)
            || (currentStart2 && currentEnd2 && currentEnd2 <= currentStart2)) {
            throw new ApiError(400, 'Uno de los horarios actuales no es válido.');
        }

        const employee = employees.get(employeeDni);
        const values = [
            request.user.id, request.user.full_name, type, eventDate, startTime, endTime,
            employee.full_name, employee.dni, employeeDni2, employee.job_title, employee.service,
            currentStart1, currentEnd1, currentStart2, currentEnd2, JSON.stringify(eventDates), periodType,
            type === 'exception' ? exceptionType : null, type === 'exception' ? exceptionOrigin : null,
            supervisor?.id || null, supervisor?.full_name || null,
            cleanText(input.reason, 4000, 'Sin detalle adicional'), evidencePath,
            type === 'siop_validation' ? evidencePath : null, hours
        ];

        const created = await transaction(async client => {
            const result = await client.query(
                `insert into requests (
                    requester_id, requester_name, type, event_date, start_time, end_time,
                    employee_name, employee_dni, employee_dni_2, employee_job_title, employee_service,
                    current_start_time, current_end_time, current_start_time_2, current_end_time_2,
                    event_dates, period_type, exception_type, exception_origin,
                    exception_supervisor_id, exception_supervisor_name, reason, evidence_path,
                    connection_evidence_path, hours
                ) values (
                    $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb,$17,$18,$19,$20,$21,$22,$23,$24,$25
                ) returning *`,
                values
            );
            const row = result.rows[0];
            await client.query(
                `insert into request_events (request_id, user_id, from_status, to_status, comment)
                 values ($1, $2, null, 'pending', 'Solicitud creada')`,
                [row.id, request.user.id]
            );
            if (evidencePath) {
                await client.query('update evidence_uploads set request_id = $1 where path = $2', [row.id, evidencePath]);
            }
            return row;
        });

        response.status(201).json({ data: created });
    });

    app.patch('/api/data/requests', requireRole('wfm', 'management', 'superadmin'), async (request, response) => {
        const id = Number(request.body?.filters?.id);
        const status = cleanText(request.body?.values?.status, 30);
        const comment = cleanText(request.body?.values?.review_comment, 4000, '');
        if (!Number.isSafeInteger(id) || id <= 0 || !REQUEST_STATUSES.has(status) || status === 'pending') {
            throw new ApiError(400, 'La actualización solicitada no es válida.');
        }
        if (FINAL_STATUSES.has(status) && !comment) throw new ApiError(400, 'La respuesta de WF es obligatoria.');

        const updated = await transaction(async client => {
            const current = await client.query('select status from requests where id = $1 for update', [id]);
            if (!current.rows[0]) throw new ApiError(404, 'La solicitud no existe.');
            const previousStatus = current.rows[0].status;
            const result = await client.query(
                `update requests set status = $1, review_comment = $2, reviewed_by = $3,
                    reviewed_at = now(), updated_at = now()
                 where id = $4 returning *`,
                [status, comment || null, request.user.id, id]
            );
            await client.query(
                `insert into request_events (request_id, user_id, from_status, to_status, comment)
                 values ($1, $2, $3, $4, $5)`,
                [id, request.user.id, previousStatus, status, comment || null]
            );
            return result.rows[0];
        });
        response.json({ data: updated });
    });

    app.post('/api/data/business_rules', requireRole('wfm', 'superadmin'), async (request, response) => {
        if (request.body?.operation !== 'upsert' || !Array.isArray(request.body?.values)) {
            throw new ApiError(400, 'La operación solicitada no es válida.');
        }
        const rows = request.body.values;
        if (!rows.length || rows.length > REQUEST_TYPES.size) throw new ApiError(400, 'La lista de reglas no es válida.');

        const saved = await transaction(async client => {
            const output = [];
            for (const input of rows) {
                const ruleKey = cleanText(input.rule_key, 40);
                const minHours = Number(input.min_advance_hours);
                if (!REQUEST_TYPES.has(ruleKey) || !Number.isInteger(minHours) || minHours < 0 || minHours > 720) {
                    throw new ApiError(400, 'Una de las reglas contiene valores no válidos.');
                }
                const cutoff = normalizeTime(input.same_day_cutoff);
                const result = await client.query(
                    `insert into business_rules (
                        rule_key, title, description, min_advance_hours, same_day_cutoff,
                        requires_evidence, coordinator_allowed, supervisor_allowed, updated_by, updated_at
                    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,now())
                    on conflict (rule_key) do update set
                        title = excluded.title, description = excluded.description,
                        min_advance_hours = excluded.min_advance_hours,
                        same_day_cutoff = excluded.same_day_cutoff,
                        requires_evidence = excluded.requires_evidence,
                        coordinator_allowed = excluded.coordinator_allowed,
                        supervisor_allowed = excluded.supervisor_allowed,
                        updated_by = excluded.updated_by, updated_at = now()
                    returning *`,
                    [
                        ruleKey,
                        cleanText(input.title, 200, ruleKey),
                        cleanText(input.description, 1000, 'Regla operativa.'),
                        minHours,
                        cutoff,
                        Boolean(input.requires_evidence),
                        Boolean(input.coordinator_allowed),
                        Boolean(input.supervisor_allowed),
                        request.user.id
                    ]
                );
                output.push(result.rows[0]);
            }
            return output;
        });
        response.json({ data: saved });
    });

    app.post('/api/evidence', upload.single('file'), async (request, response) => {
        if (!request.file) throw new ApiError(400, 'Selecciona un archivo.');
        if (!SAFE_UPLOAD_TYPES.has(request.file.mimetype)) throw new ApiError(400, 'El tipo de archivo no está permitido.');

        const requestedPath = cleanText(request.body?.path, 600);
        const prefix = `${request.user.id}/`;
        const relativeName = requestedPath?.startsWith(prefix) ? requestedPath.slice(prefix.length) : '';
        if (!relativeName || !/^[a-zA-Z0-9._-]{1,240}$/.test(relativeName)) {
            throw new ApiError(400, 'La ruta del archivo no es válida.');
        }

        const userDir = path.join(config.uploadDir, request.user.id);
        const relativePath = `${request.user.id}/${relativeName}`;
        const destination = path.join(config.uploadDir, relativePath);
        await fs.mkdir(userDir, { recursive: true });
        let fileWritten = false;
        try {
            await fs.writeFile(destination, request.file.buffer, { flag: 'wx', mode: 0o600 });
            fileWritten = true;
            await pool.query(
                `insert into evidence_uploads (path, uploaded_by, original_name, mime_type, size_bytes)
                 values ($1, $2, $3, $4, $5)`,
                [relativePath, request.user.id, cleanText(request.file.originalname, 255, 'evidencia'), request.file.mimetype, request.file.size]
            );
        } catch (error) {
            if (fileWritten) await fs.rm(destination, { force: true });
            throw error;
        }
        response.status(201).json({ data: { path: relativePath } });
    });

    app.get('/api/evidence', async (request, response) => {
        const evidencePath = cleanText(request.query.path, 600);
        const result = await pool.query(
            `select e.path, e.original_name, e.mime_type, e.uploaded_by
             from evidence_uploads e where e.path = $1`,
            [evidencePath]
        );
        const evidence = result.rows[0];
        if (!evidence) throw new ApiError(404, 'La evidencia no existe.');
        if (evidence.uploaded_by !== request.user.id && !['wfm', 'management', 'superadmin'].includes(request.user.role)) {
            throw new ApiError(403, 'No tienes permiso para abrir esta evidencia.');
        }

        const absolutePath = path.resolve(config.uploadDir, evidence.path);
        const root = `${path.resolve(config.uploadDir)}${path.sep}`;
        if (!absolutePath.startsWith(root)) throw new ApiError(400, 'La ruta del archivo no es válida.');
        response.type(evidence.mime_type);
        response.set('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(evidence.original_name)}`);
        response.set('Cache-Control', 'private, no-store');
        response.sendFile(absolutePath);
    });

    app.get('/.well-known/security.txt', (_request, response) => {
        response.type('text/plain');
        response.set('Cache-Control', 'public, max-age=3600');
        response.sendFile(path.join(config.publicDir, 'security.txt'));
    });

    app.use(express.static(config.publicDir, {
        index: false,
        dotfiles: 'deny',
        maxAge: config.env === 'production' ? '1h' : 0,
        setHeaders(response, filePath) {
            if (filePath.endsWith('.html')) response.setHeader('Cache-Control', 'no-store');
        }
    }));
    app.get('/', (_request, response) => {
        response.set('Cache-Control', 'no-store');
        response.sendFile(path.join(config.publicDir, 'index.html'));
    });

    app.use((_request, response) => response.status(404).json({ error: 'Ruta no encontrada.' }));
    app.use((error, _request, response, _next) => {
        if (error instanceof multer.MulterError) {
            const message = error.code === 'LIMIT_FILE_SIZE'
                ? `El archivo supera el límite de ${Math.round(config.maxUploadBytes / 1024 / 1024)} MB.`
                : 'No se pudo procesar el archivo.';
            return response.status(400).json({ error: message });
        }
        const status = error.status || 500;
        if (status >= 500) console.error(error);
        response.status(status).json({ error: errorMessage(error) });
    });

    return app;
}

module.exports = { ApiError, createApp };
