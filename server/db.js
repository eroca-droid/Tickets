'use strict';

const { Pool, types } = require('pg');
const config = require('./config');

// Evita convertir DATE a un instante UTC; la interfaz trabaja con fechas civiles YYYY-MM-DD.
types.setTypeParser(1082, value => value);

if (!config.databaseUrl && !config.databaseHost) {
    throw new Error('Falta DATABASE_URL o la configuración PGHOST/PGDATABASE/PGUSER/PGPASSWORD.');
}

const pool = new Pool({
    ...(config.databaseUrl
        ? { connectionString: config.databaseUrl }
        : {
            host: config.databaseHost,
            port: config.databasePort,
            database: config.databaseName,
            user: config.databaseUser,
            password: config.databasePassword
        }),
    max: Number.parseInt(process.env.DATABASE_POOL_SIZE || '10', 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    ssl: config.databaseSsl ? { rejectUnauthorized: false } : false,
    application_name: 'seguimiento-tickets-wfm',
    options: `-c timezone=${config.appTimezone}`
});

pool.on('error', error => {
    console.error('Error inesperado en el pool de PostgreSQL:', error);
});

async function transaction(callback) {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

module.exports = { pool, transaction };
