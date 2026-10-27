'use strict';

const { randomBytes } = require('node:crypto');
const { hashPassword } = require('./auth');

const ALLOWED_ROLES = new Set([
    'coordinator',
    'supervisor',
    'wfm',
    'management',
    'superadmin'
]);

function registerAdminUsers(app, {
    pool,
    transaction,
    authenticate,
    requireCompletedPasswordChange,
    requireRole,
    ApiError
}) {
    const adminOnly = [
        authenticate,
        requireCompletedPasswordChange,
        requireRole('superadmin')
    ];

    app.get('/api/admin/users', ...adminOnly, async (_request, response) => {
        const result = await pool.query(`
            SELECT
                p.id,
                p.email::text AS email,
                p.full_name,
                p.role::text AS role,
                p.department,
                p.coordinator_id,
                c.full_name AS coordinator_name,
                p.active,
                p.password_change_required,
                p.created_at,
                p.updated_at
            FROM profiles p
            LEFT JOIN profiles c
                ON c.id = p.coordinator_id
            ORDER BY p.full_name ASC
        `);

        response.set('Cache-Control', 'private, no-store');
        response.json({
            data: result.rows
        });
    });

    app.post('/api/admin/users', ...adminOnly, async (request, response) => {
        const body = request.body || {};

        const fullName = String(body.full_name || '').trim();
        const email = String(body.email || '').trim().toLowerCase();
        const role = String(body.role || '');
        const department = String(body.department || '').trim() || null;
        const password = String(body.temporary_password || '');
        const coordinatorId = body.coordinator_id || null;

        if (fullName.length < 3 || fullName.length > 200) {
            throw new ApiError(400, 'El nombre debe tener entre 3 y 200 caracteres.');
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320) {
            throw new ApiError(400, 'Correo electrónico no válido.');
        }

        if (!ALLOWED_ROLES.has(role)) {
            throw new ApiError(400, 'Rol no válido.');
        }

        if (department && department.length > 200) {
            throw new ApiError(400, 'El área supera los 200 caracteres.');
        }

        if (password.length < 10 || password.length > 200) {
            throw new ApiError(400, 'La contraseña temporal debe tener entre 10 y 200 caracteres.');
        }

        if (role === 'supervisor') {
            if (!coordinatorId) {
                throw new ApiError(400, 'Debes asignar un coordinador al supervisor.');
            }

            const coordinator = await pool.query(
                `SELECT id FROM profiles
                 WHERE id = $1 AND role = 'coordinator' AND active = true`,
                [coordinatorId]
            );

            if (!coordinator.rowCount) {
                throw new ApiError(400, 'El coordinador seleccionado no está activo o no existe.');
            }
        } else if (coordinatorId) {
            throw new ApiError(400, 'Solo los supervisores pueden tener un coordinador asignado.');
        }

        const passwordHash = await hashPassword(password);

        const result = await pool.query(
            `INSERT INTO profiles
             (email, full_name, role, department, coordinator_id,
              password_hash, password_change_required, active)
             VALUES ($1, $2, $3, $4, $5, $6, true, true)
             RETURNING id, email::text, full_name, role::text,
                       department, coordinator_id, active, created_at`,
            [
                email, fullName, role, department,
                coordinatorId, passwordHash
            ]
        );

        response.set('Cache-Control', 'private, no-store');
        response.status(201).json({ data: result.rows[0] });
    });


    app.patch('/api/admin/users/:id', ...adminOnly, async (request, response) => {
        const id = request.params.id;
        const body = request.body || {};

        const fullName = String(body.full_name || '').trim();
        const email = String(body.email || '').trim().toLowerCase();
        const role = String(body.role || '');
        const department = String(body.department || '').trim() || null;
        const coordinatorId = body.coordinator_id || null;

        if (fullName.length < 3 || fullName.length > 200) {
            throw new ApiError(400, 'El nombre debe tener entre 3 y 200 caracteres.');
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320) {
            throw new ApiError(400, 'Correo electrónico no válido.');
        }

        if (!ALLOWED_ROLES.has(role)) {
            throw new ApiError(400, 'Rol no válido.');
        }

        if (department && department.length > 200) {
            throw new ApiError(400, 'El área supera los 200 caracteres.');
        }

        const updated = await transaction(async client => {
            await client.query(
                'SELECT pg_advisory_xact_lock($1)',
                [825731]
            );

            const current = await client.query(
                'SELECT id, role, active FROM profiles WHERE id = $1 FOR UPDATE',
                [id]
            );

            if (!current.rowCount) {
                throw new ApiError(404, 'Usuario no encontrado.');
            }

            if (id === request.user.id && role !== current.rows[0].role) {
                throw new ApiError(400, 'No puedes modificar tu propio rol.');
            }

            if (current.rows[0].role === 'superadmin' && role !== 'superadmin'
                && current.rows[0].active) {
                const count = await client.query(
                    "SELECT COUNT(*)::int AS total FROM profiles WHERE role = 'superadmin' AND active = true"
                );

                if (count.rows[0].total <= 1) {
                    throw new ApiError(400, 'No puedes quitar el último Superadmin activo.');
                }
            }

            if (current.rows[0].role === 'coordinator'
                && role !== 'coordinator') {
                const assigned = await client.query(
                    `SELECT COUNT(*)::int AS total
                     FROM profiles
                     WHERE coordinator_id = $1`,
                    [id]
                );

                if (assigned.rows[0].total > 0) {
                    throw new ApiError(
                        400,
                        'Reasigna primero los supervisores de este coordinador.'
                    );
                }
            }

            if (role === 'supervisor') {
                if (!coordinatorId) {
                    throw new ApiError(400, 'Debes asignar un coordinador.');
                }

                const coordinator = await client.query(
                    "SELECT id FROM profiles WHERE id = $1 AND role = 'coordinator' AND active = true",
                    [coordinatorId]
                );

                if (!coordinator.rowCount) {
                    throw new ApiError(400, 'Coordinador no válido.');
                }
            } else if (coordinatorId) {
                throw new ApiError(400, 'Solo supervisores pueden tener coordinador.');
            }

            const result = await client.query(
                `UPDATE profiles
                 SET full_name = $1, email = $2, role = $3,
                     department = $4, coordinator_id = $5, updated_at = now()
                 WHERE id = $6
                 RETURNING id, email::text, full_name, role::text,
                           department, coordinator_id, active`,
                [fullName, email, role, department, coordinatorId, id]
            );

            if (role !== current.rows[0].role) {
                await client.query('DELETE FROM sessions WHERE user_id = $1', [id]);
            }

            return result.rows[0];
        });

        response.set('Cache-Control', 'private, no-store');
        response.json({ data: updated });
    });


    app.patch('/api/admin/users/:id/status', ...adminOnly, async (request, response) => {
        const id = request.params.id;
        const active = request.body?.active;

        if (typeof active !== 'boolean') {
            throw new ApiError(400, 'El estado debe ser true o false.');
        }

        const updated = await transaction(async client => {
            await client.query(
                'SELECT pg_advisory_xact_lock($1)',
                [825731]
            );

            const current = await client.query(
                'SELECT id, role, active FROM profiles WHERE id = $1 FOR UPDATE',
                [id]
            );

            if (!current.rowCount) {
                throw new ApiError(404, 'Usuario no encontrado.');
            }

            const user = current.rows[0];

            if (!active && id === request.user.id) {
                throw new ApiError(400, 'No puedes desactivar tu propia cuenta.');
            }

            if (!active && user.role === 'superadmin' && user.active) {
                const count = await client.query(
                    `SELECT COUNT(*)::int AS total
                     FROM profiles
                     WHERE role = 'superadmin' AND active = true`
                );

                if (count.rows[0].total <= 1) {
                    throw new ApiError(400, 'No puedes desactivar el último Superadmin activo.');
                }
            }

            if (!active && user.role === 'coordinator') {
                const assigned = await client.query(
                    `SELECT COUNT(*)::int AS total
                     FROM profiles
                     WHERE coordinator_id = $1`,
                    [id]
                );

                if (assigned.rows[0].total > 0) {
                    throw new ApiError(
                        400,
                        'Reasigna primero los supervisores de este coordinador.'
                    );
                }
            }

            const result = await client.query(
                `UPDATE profiles
                 SET active = $1, updated_at = now()
                 WHERE id = $2
                 RETURNING id, email::text, full_name, role::text, active`,
                [active, id]
            );

            if (!active) {
                await client.query(
                    'DELETE FROM sessions WHERE user_id = $1',
                    [id]
                );
            }

            return result.rows[0];
        });

        response.set('Cache-Control', 'private, no-store');
        response.json({ data: updated });
    });


    app.post('/api/admin/users/:id/reset-password', ...adminOnly, async (request, response) => {
        const id = request.params.id;

        if (id === request.user.id) {
            throw new ApiError(
                400,
                'Para cambiar tu propia contraseña utiliza la opción de tu perfil.'
            );
        }

        const temporaryPassword = randomBytes(18).toString('base64url');
        const passwordHash = await hashPassword(temporaryPassword);

        const updated = await transaction(async client => {
            const result = await client.query(
                `UPDATE profiles
                 SET password_hash = $1,
                     password_change_required = true,
                     updated_at = now()
                 WHERE id = $2 AND active = true
                 RETURNING id, email::text, full_name`,
                [passwordHash, id]
            );

            if (!result.rowCount) {
                throw new ApiError(
                    404,
                    'Usuario no encontrado o cuenta desactivada.'
                );
            }

            await client.query(
                'DELETE FROM sessions WHERE user_id = $1',
                [id]
            );

            return result.rows[0];
        });

        response.set('Cache-Control', 'no-store');
        response.json({
            data: updated,
            temporary_password: temporaryPassword
        });
    });

}

module.exports = { registerAdminUsers };
