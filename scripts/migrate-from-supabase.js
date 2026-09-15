#!/usr/bin/env node
'use strict';

const { Pool, types } = require('pg');
const config = require('../server/config');

types.setTypeParser(1082, value => value);

const TABLE_ORDER = ['profiles', 'dotacion', 'business_rules', 'requests', 'request_events'];
const IDENTITY_TABLES = new Set(['business_rules', 'requests', 'request_events']);
const EXCLUDED_COLUMNS = new Set(['email', 'password_hash']);
const JSON_COLUMNS = new Set(['event_dates']);

function targetOptions() {
    if (config.databaseUrl) return { connectionString: config.databaseUrl, ssl: config.databaseSsl ? { rejectUnauthorized: false } : false };
    return {
        host: config.databaseHost,
        port: config.databasePort,
        database: config.databaseName,
        user: config.databaseUser,
        password: config.databasePassword,
        ssl: config.databaseSsl ? { rejectUnauthorized: false } : false
    };
}

function quoted(identifier) {
    return `"${identifier.replaceAll('"', '""')}"`;
}

async function columns(client, table) {
    const result = await client.query(
        `select column_name from information_schema.columns
         where table_schema = 'public' and table_name = $1
         order by ordinal_position`,
        [table]
    );
    return result.rows.map(row => row.column_name);
}

async function main() {
    const sourceUrl = process.env.SOURCE_DATABASE_URL;
    if (!sourceUrl) throw new Error('Falta SOURCE_DATABASE_URL con la conexión directa a Supabase.');

    const source = new Pool({
        connectionString: sourceUrl,
        ssl: process.env.SOURCE_DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
        max: 2
    });
    const target = new Pool({ ...targetOptions(), max: 2 });
    const targetClient = await target.connect();

    try {
        const existing = await targetClient.query(
            `select (select count(*) from profiles)::int as profiles,
                    (select count(*) from requests)::int as requests`
        );
        if ((existing.rows[0].profiles > 0 || existing.rows[0].requests > 0)
            && process.env.CONFIRM_REPLACE_TARGET !== 'YES') {
            throw new Error('El destino contiene datos. Define CONFIRM_REPLACE_TARGET=YES para reemplazarlos.');
        }

        await targetClient.query('begin');
        await targetClient.query('set constraints all deferred');
        await targetClient.query(
            'truncate request_events, evidence_uploads, requests, sessions, business_rules, dotacion, profiles restart identity cascade'
        );

        for (const table of TABLE_ORDER) {
            const [sourceColumns, targetColumns] = await Promise.all([
                columns(source, table),
                columns(targetClient, table)
            ]);
            const common = sourceColumns.filter(column => targetColumns.includes(column) && !EXCLUDED_COLUMNS.has(column));
            if (!common.length) throw new Error(`No hay columnas compatibles para ${table}.`);

            const sourceRows = await source.query(
                `select ${common.map(quoted).join(', ')} from public.${quoted(table)} order by 1`
            );
            for (const row of sourceRows.rows) {
                const values = common.map(column => {
                    const value = row[column];
                    return JSON_COLUMNS.has(column) && value !== null && typeof value !== 'string'
                        ? JSON.stringify(value)
                        : value;
                });
                const placeholders = values.map((_value, index) => `$${index + 1}`).join(', ');
                const override = IDENTITY_TABLES.has(table) ? ' overriding system value' : '';
                await targetClient.query(
                    `insert into ${quoted(table)} (${common.map(quoted).join(', ')})${override} values (${placeholders})`,
                    values
                );
            }
            console.log(`${table}: ${sourceRows.rowCount} registros migrados.`);
        }

        try {
            const authUsers = await source.query(
                `select id, email from auth.users where email is not null and deleted_at is null`
            );
            for (const user of authUsers.rows) {
                await targetClient.query('update profiles set email = $1 where id = $2', [user.email, user.id]);
            }
            console.log(`auth.users: ${authUsers.rowCount} correos asociados (las contraseñas deben regenerarse).`);
        } catch {
            console.warn('No se pudieron leer los correos de auth.users; asígnalos al crear las credenciales.');
        }

        for (const table of IDENTITY_TABLES) {
            await targetClient.query(
                `select setval(pg_get_serial_sequence($1, 'id'), coalesce(max(id), 1), max(id) is not null) from ${quoted(table)}`,
                [table]
            );
        }
        await targetClient.query(`
            insert into business_rules (
                rule_key, title, description, min_advance_hours, same_day_cutoff,
                requires_evidence, coordinator_allowed, supervisor_allowed
            ) values
                ('schedule_change', 'Cambios de horario', 'Anticipación mínima configurada por WFM.', 48, null, true, true, true),
                ('swap', 'Enroques', 'Anticipación mínima configurada por WFM.', 48, null, false, true, true),
                ('comp_time', 'Compensados', 'Solo fechas futuras. El día en curso se recibe hasta la hora configurada.', 0, '15:00', false, true, false),
                ('overtime', 'Horas extra', 'Registrar el intervalo trabajado y adjuntar soporte si WFM lo solicita.', 0, null, false, true, true),
                ('siop_validation', 'Validación SIOP', 'Anticipación mínima y evidencia de conexión del asesor.', 48, null, true, false, true),
                ('exception', 'Excepciones', 'Revisión especial por WFM y Gerencia.', 0, null, true, true, true)
            on conflict (rule_key) do nothing
        `);
        await targetClient.query('commit');
        console.log('Migración de datos completada. Asigna credenciales con scripts/create-user.js.');
    } catch (error) {
        await targetClient.query('rollback').catch(() => {});
        throw error;
    } finally {
        targetClient.release();
        await Promise.all([source.end(), target.end()]);
    }
}

main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
});
