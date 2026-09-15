'use strict';

const config = require('./config');
process.env.TZ = config.appTimezone;

const { pool, transaction } = require('./db');
const { createApp } = require('./app');

const app = createApp({ pool, transaction });
const server = app.listen(config.port, '0.0.0.0', () => {
    console.log(`Seguimiento de tickets escuchando en el puerto ${config.port}.`);
});

async function shutdown(signal) {
    console.log(`${signal}: cerrando servidor...`);
    server.close(async () => {
        await pool.end();
        process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
