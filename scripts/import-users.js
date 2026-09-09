#!/usr/bin/env node
'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { pool, transaction } = require('../server/db');
const { hashPassword } = require('../server/auth');

const VALID_ROLES = new Set(['coordinator', 'supervisor', 'wfm', 'management', 'superadmin']);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseRows(contents) {
    const lines = contents.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    const expectedHeader = 'email\tid\tfull_name\trole\tdepartment';
    if (lines.shift() !== expectedHeader) throw new Error('La cabecera del archivo de usuarios no es válida.');

    const rows = lines.map((line, index) => {
        const [email, id, fullName, role, department, ...extra] = line.split('\t');
        if (extra.length || !email?.includes('@') || !UUID_PATTERN.test(id) || !fullName || !VALID_ROLES.has(role)) {
            throw new Error(`La fila ${index + 2} del archivo de usuarios no es válida.`);
        }
        return { email: email.toLowerCase(), id, fullName, role, department: department || null };
    });

    const emails = new Set(rows.map(row => row.email));
    const ids = new Set(rows.map(row => row.id));
    if (emails.size !== rows.length || ids.size !== rows.length) throw new Error('Hay correos o UUID duplicados.');
    return rows;
}

async function main() {
    const standardPassword = process.env.USER_PASSWORD || '';
    const superadminPassword = process.env.SUPERADMIN_PASSWORD || '';
    if (standardPassword.length < 10 || superadminPassword.length < 10) {
        throw new Error('USER_PASSWORD y SUPERADMIN_PASSWORD deben tener al menos 10 caracteres.');
    }

    const filePath = path.resolve(process.env.USERS_FILE || 'db/users-2026-09.tsv');
    const rows = parseRows(await fs.readFile(filePath, 'utf8'));
    const prepared = [];
    for (const row of rows) {
        const password = row.role === 'superadmin' ? superadminPassword : standardPassword;
        prepared.push({ ...row, passwordHash: await hashPassword(password) });
    }

    await transaction(async client => {
        for (const row of prepared) {
            const existing = await client.query(
                'select id, email::text from profiles where id = $1 or email = $2',
                [row.id, row.email]
            );
            if (existing.rowCount > 1) {
                throw new Error(`El UUID y correo de ${row.email} pertenecen a cuentas distintas.`);
            }

            const targetId = existing.rows[0]?.id || row.id;
            if (existing.rowCount) {
                await client.query(
                    `update profiles set
                        email = $1, password_hash = $2, password_change_required = true,
                        full_name = $3, role = $4, department = $5, active = true,
                        updated_at = now()
                     where id = $6`,
                    [row.email, row.passwordHash, row.fullName, row.role, row.department, targetId]
                );
            } else {
                await client.query(
                    `insert into profiles (
                        id, email, password_hash, password_change_required,
                        full_name, role, department, active
                     ) values ($1, $2, $3, true, $4, $5, $6, true)`,
                    [row.id, row.email, row.passwordHash, row.fullName, row.role, row.department]
                );
            }
            await client.query('delete from sessions where user_id = $1', [targetId]);
        }
    });

    const counts = rows.reduce((result, row) => {
        result[row.role] = (result[row.role] || 0) + 1;
        return result;
    }, {});
    console.log(`Usuarios importados: ${rows.length}.`);
    console.log(Object.entries(counts).map(([role, count]) => `${role}: ${count}`).join(', '));
    console.log('Todas las cuentas deben cambiar su contraseña en el primer acceso.');
}

main()
    .catch(error => {
        console.error(error.message);
        process.exitCode = 1;
    })
    .finally(() => pool.end());
