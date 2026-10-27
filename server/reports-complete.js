'use strict';

const ExcelJS = require('exceljs');
const { generateTimesReport } = require('./reports-times');

function addSheet(workbook, name, rows, columns) {
    const sheet = workbook.addWorksheet(name, {
        views: [{ state: 'frozen', ySplit: 1 }]
    });

    sheet.columns = columns.map(([key, header]) => ({
        key,
        header,
        width: 28
    }));

    for (const row of rows) {
        sheet.addRow(row);
    }

    sheet.getRow(1).font = {
        bold: true,
        color: { argb: 'FFFFFFFF' }
    };

    sheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0072AC' }
    };

    sheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: columns.length }
    };

    return sheet;
}

async function getCompleteRequests(pool, from, to) {
    const result = await pool.query(`
        SELECT
            r.*,
            requester.full_name AS requester_full_name,
            requester.email::text AS requester_email,
            requester.role::text AS requester_role,
            reviewer.full_name AS reviewer_name,
            supervisor.full_name AS supervisor_name
        FROM requests r
        LEFT JOIN profiles requester
            ON requester.id = r.requester_id
        LEFT JOIN profiles reviewer
            ON reviewer.id = r.reviewed_by
        LEFT JOIN profiles supervisor
            ON supervisor.id = r.exception_supervisor_id
        WHERE r.created_at >= $1::date
          AND r.created_at < ($2::date + INTERVAL '1 day')
        ORDER BY r.id
    `, [from, to]);

    return result.rows;
}

async function getCompleteHistory(pool, from, to) {
    const result = await pool.query(`
        SELECT
            e.id,
            e.request_id,
            e.user_id,
            p.full_name AS user_name,
            p.email::text AS user_email,
            p.role::text AS user_role,
            e.from_status::text AS from_status,
            e.to_status::text AS to_status,
            e.comment,
            e.created_at
        FROM request_events e
        JOIN requests r
            ON r.id = e.request_id
        LEFT JOIN profiles p
            ON p.id = e.user_id
        WHERE r.created_at >= $1::date
          AND r.created_at < ($2::date + INTERVAL '1 day')
        ORDER BY e.request_id, e.created_at, e.id
    `, [from, to]);

    return result.rows;
}

async function getCompleteEvidence(pool, from, to) {
    const result = await pool.query(`
        SELECT
            e.request_id,
            e.event_id,
            e.original_name,
            e.mime_type,
            e.size_bytes,
            e.created_at,
            p.full_name AS uploaded_by_name,
            p.email::text AS uploaded_by_email,
            p.role::text AS uploaded_by_role
        FROM evidence_uploads e
        JOIN requests r
            ON r.id = e.request_id
        LEFT JOIN profiles p
            ON p.id = e.uploaded_by
        WHERE r.created_at >= $1::date
          AND r.created_at < ($2::date + INTERVAL '1 day')
        ORDER BY e.request_id, e.created_at
    `, [from, to]);

    return result.rows;
}

function prepareRows(rows) {
    return rows.map(row => {
        const result = {};

        for (const [key, value] of Object.entries(row)) {
            if (value instanceof Date) {
                result[key] = value;
            } else if (value !== null && typeof value === 'object') {
                result[key] = JSON.stringify(value);
            } else {
                result[key] = value;
            }
        }

        return result;
    });
}

function columnsFromRows(rows) {
    if (!rows.length) return [];

    return Object.keys(rows[0]).map(key => [
        key,
        key.replace(/_/g, ' ').toUpperCase()
    ]);
}

async function generateCompleteReport(pool, from, to) {
    const [requests, history, evidence, times] = await Promise.all([
        getCompleteRequests(pool, from, to),
        getCompleteHistory(pool, from, to),
        getCompleteEvidence(pool, from, to),
        generateTimesReport(pool, from, to)
    ]);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'WFM - Seguimiento de Tickets';

    const datasets = [
        ['Solicitudes', requests],
        ['Historial', history],
        ['Evidencias', evidence]
    ];

    for (const [name, rows] of datasets) {
        const prepared = prepareRows(rows);
        const columns = columnsFromRows(prepared);

        if (columns.length) {
            const sheet = addSheet(workbook, name, prepared, columns);

            for (const column of sheet.columns) {
                if (prepared[0][column.key] instanceof Date) {
                    column.numFmt = 'dd/mm/yyyy hh:mm';
                }
            }
        } else {
            const sheet = workbook.addWorksheet(name);
            sheet.addRow(['Sin registros para el período seleccionado']);
        }
    }

    const timesWorkbook = new ExcelJS.Workbook();
    await timesWorkbook.xlsx.load(times.buffer);

    const source = timesWorkbook.getWorksheet('Tiempos de atención');
    const target = workbook.addWorksheet('Tiempos de atención', {
        views: [{ state: 'frozen', ySplit: 1 }]
    });

    source.eachRow((row) => {
        const newRow = target.addRow(row.values.slice(1));

        row.eachCell((cell, col) => {
            newRow.getCell(col).numFmt = cell.numFmt;
        });
    });

    target.getRow(1).font = {
        bold: true,
        color: { argb: 'FFFFFFFF' }
    };

    target.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0072AC' }
    };

    target.autoFilter = 'A1:T1';

    for (let col = 1; col <= 20; col++) {
        target.getColumn(col).width = 27;
    }

    const buffer = await workbook.xlsx.writeBuffer();

    return {
        buffer,
        count: requests.length
    };
}

module.exports = { generateCompleteReport };
