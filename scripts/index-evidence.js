#!/usr/bin/env node
'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const config = require('../server/config');
const { pool } = require('../server/db');

const MIME_TYPES = Object.freeze({
    '.csv': 'text/csv',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.txt': 'text/plain',
    '.webp': 'image/webp',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
});

async function filesBelow(directory) {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const nested = await Promise.all(entries.filter(entry => !entry.name.startsWith('.')).map(async entry => {
        const fullPath = path.join(directory, entry.name);
        return entry.isDirectory() ? filesBelow(fullPath) : [fullPath];
    }));
    return nested.flat();
}

async function main() {
    await fs.mkdir(config.uploadDir, { recursive: true });
    const files = await filesBelow(config.uploadDir);
    let indexed = 0;

    for (const file of files) {
        const relativePath = path.relative(config.uploadDir, file).split(path.sep).join('/');
        const [ownerId] = relativePath.split('/');
        if (!/^[0-9a-f-]{36}$/i.test(ownerId)) {
            console.warn(`Omitido (ruta sin UUID): ${relativePath}`);
            continue;
        }
        const owner = await pool.query('select id from profiles where id = $1', [ownerId]);
        if (!owner.rows[0]) {
            console.warn(`Omitido (usuario inexistente): ${relativePath}`);
            continue;
        }
        const request = await pool.query('select id from requests where evidence_path = $1', [relativePath]);
        const stats = await fs.stat(file);
        await pool.query(
            `insert into evidence_uploads (path, uploaded_by, request_id, original_name, mime_type, size_bytes)
             values ($1, $2, $3, $4, $5, $6)
             on conflict (path) do update set
                request_id = excluded.request_id,
                original_name = excluded.original_name,
                mime_type = excluded.mime_type,
                size_bytes = excluded.size_bytes`,
            [
                relativePath,
                ownerId,
                request.rows[0]?.id || null,
                path.basename(file),
                MIME_TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
                stats.size
            ]
        );
        indexed += 1;
    }
    console.log(`${indexed} evidencias indexadas.`);
}

main()
    .catch(error => {
        console.error(error.message);
        process.exitCode = 1;
    })
    .finally(() => pool.end());
