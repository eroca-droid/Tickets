'use strict';

const ExcelJS = require('exceljs');

async function generateExceptionsReport(pool, from, to) {
    const result = await pool.query(`
        SELECT
            r.id,
            r.created_at,
            r.requester_name,
            r.exception_origin,
            CASE r.exception_origin
                WHEN 'agent' THEN r.employee_name
                WHEN 'supervisor' THEN r.exception_supervisor_name
                WHEN 'coordinator' THEN r.requester_name
                ELSE NULL
            END AS responsible_name,
            CASE
                WHEN r.exception_origin = 'agent'
                THEN r.employee_dni
                ELSE NULL
            END AS responsible_dni,
            r.exception_type,
            r.reason,
            r.exception_detail,
            r.status::text,
            r.review_comment,
            r.reviewed_at,
            p.full_name AS reviewer_name
        FROM requests r
        LEFT JOIN profiles p ON p.id = r.reviewed_by
        WHERE r.type::text = 'exception'
          AND r.created_at >= $1::date
          AND r.created_at < ($2::date + INTERVAL '1 day')
        ORDER BY r.created_at DESC, r.id DESC
    `, [from, to]);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'WFM - Seguimiento de Tickets';

    const sheet = workbook.addWorksheet('Excepciones', {
        views: [{ state: 'frozen', ySplit: 1 }]
    });

    const columns = [
        ['id', 'ID Ticket'],
        ['created_at', 'Fecha de creación'],
        ['requester_name', 'Solicitante'],
        ['exception_origin', 'Origen'],
        ['responsible_name', 'Responsable'],
        ['responsible_dni', 'DNI Responsable'],
        ['exception_type', 'Tipo de excepción'],
        ['reason', 'Motivo'],
        ['exception_detail', 'Detalle'],
        ['status', 'Estado'],
        ['review_comment', 'Comentario WF'],
        ['reviewed_at', 'Fecha de resolución'],
        ['reviewer_name', 'Revisado por']
    ];

    sheet.columns = columns.map(([key, header]) => ({
        header,
        key,
        width: 24
    }));

    result.rows.forEach(row => sheet.addRow(row));

    sheet.getRow(1).font = {
        bold: true,
        color: { argb: 'FFFFFFFF' }
    };

    sheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0072AC' }
    };

    sheet.autoFilter = 'A1:M1';

    sheet.getColumn('created_at').numFmt = 'dd/mm/yyyy hh:mm';
    sheet.getColumn('reviewed_at').numFmt = 'dd/mm/yyyy hh:mm';

    const buffer = await workbook.xlsx.writeBuffer();

    return {
        buffer,
        count: result.rows.length
    };
}

module.exports = { generateExceptionsReport };
