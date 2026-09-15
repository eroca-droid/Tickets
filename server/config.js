'use strict';

const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');

function positiveInteger(value, fallback) {
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function timezone(value) {
    return /^[A-Za-z_+\-/]+$/.test(value || '') ? value : 'America/Santiago';
}

const config = Object.freeze({
    env: process.env.NODE_ENV || 'development',
    port: positiveInteger(process.env.PORT, 3000),
    databaseUrl: process.env.DATABASE_URL || '',
    databaseHost: process.env.PGHOST || '',
    databasePort: positiveInteger(process.env.PGPORT, 5432),
    databaseName: process.env.PGDATABASE || '',
    databaseUser: process.env.PGUSER || '',
    databasePassword: process.env.PGPASSWORD || '',
    databaseSsl: process.env.DATABASE_SSL === 'true',
    appTimezone: timezone(process.env.APP_TIMEZONE),
    sessionHours: positiveInteger(process.env.SESSION_HOURS, 12),
    sessionCookie: 'turnoclaro_session',
    secureCookie: process.env.SESSION_COOKIE_SECURE === 'true',
    publicDir: path.join(rootDir, 'public'),
    uploadDir: process.env.UPLOAD_DIR || path.join(rootDir, 'storage', 'evidence'),
    maxUploadBytes: positiveInteger(process.env.MAX_UPLOAD_MB, 10) * 1024 * 1024,
    trustProxy: positiveInteger(process.env.TRUST_PROXY_HOPS, 1)
});

module.exports = config;
