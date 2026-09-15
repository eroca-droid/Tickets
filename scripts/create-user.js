#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const { pool, transaction } = require('../server/db');
const { hashPassword } = require('../server/auth');

const VALID_ROLES = new Set(['coordinator', 'supervisor', 'wfm', 'management', 'superadmin']);

function argumentsMap(values) {
    const result = {};
    for (let index = 0; index < values.length; index += 1) {
        if (!values[index].startsWith('--')) continue;
        result[values[index].slice(2)] = values[index + 1];
        index += 1;
    }
    return result;
}

async function main() {
    const args = argumentsMap(process.argv.slice(2));
    let id = args.id || null;
    const email = String(args.email || '').trim().toLowerCase();
    const fullName = String(args.name || '').trim();
    const role = String(args.role || '').trim();
    const password = process.env.USER_PASSWORD || '';
    const coordinatorId = args['coordinator-id'] || null;
    const department = String(args.department || '').trim() || null;
    const passwordChangeRequired = args['force-password-change'] === 'true';

    if (id && !/^[0-9a-f-]{36}$/i.test(id)) throw new Error('El argumento --id debe ser un UUID válido.');
    if (!email || !email.includes('@')) throw new Error('Falta un --email válido.');
    if (!fullName) throw new Error('Falta --name.');
    if (!VALID_ROLES.has(role)) throw new Error('El --role no es válido.');
    if (password.length < 10) throw new Error('Define USER_PASSWORD con al menos 10 caracteres.');
    if (coordinatorId && !/^[0-9a-f-]{36}$/i.test(coordinatorId)) {
        throw new Error('--coordinator-id debe ser un UUID válido.');
    }

    if (!id) {
        const existing = await pool.query('select id from profiles where email = $1', [email]);
        id = existing.rows[0]?.id || crypto.randomUUID();
    }

    const passwordHash = await hashPassword(password);
    await transaction(async client => {
        if (coordinatorId) {
            const coordinator = await client.query(
                `select id from profiles where id = $1 and role = 'coordinator' and active = true`,
                [coordinatorId]
            );
            if (!coordinator.rows[0]) throw new Error('El coordinador indicado no existe o no está activo.');
        }

        await client.query(
            `insert into profiles (
                id, email, password_hash, password_change_required, full_name,
                role, department, coordinator_id, active
             ) values ($1, $2, $3, $4, $5, $6, $7, $8, true)
             on conflict (id) do update set
                email = excluded.email,
                password_hash = excluded.password_hash,
                password_change_required = excluded.password_change_required,
                full_name = excluded.full_name,
                role = excluded.role,
                department = excluded.department,
                coordinator_id = excluded.coordinator_id,
                active = true`,
            [id, email, passwordHash, passwordChangeRequired, fullName, role, department, coordinatorId]
        );
        await client.query('delete from sessions where user_id = $1', [id]);
    });

    console.log(`Usuario listo: ${email} (${role}) · ${id}`);
}

main()
    .catch(error => {
        console.error(error.message);
        process.exitCode = 1;
    })
    .finally(() => pool.end());
