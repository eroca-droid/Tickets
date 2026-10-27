'use strict';

const ExcelJS = require('exceljs');

async function generateGeneralReport(pool, from, to) {
    const result = await pool.query(`
        SELECT
            r.id,
            r.created_at,
            r.requester_name,
            r.type::text,
            r.status::text,
            r.employee_dni,
            r.employee_name,
            r.employee_dni_2,
            r.employee_name_2,
            r.employee_service,
            r.event_date,
            r.reason,
            r.review_comment,
            r.reviewed_at,
            p.full_name AS reviewer_name
        FROM requests r
        LEFT JOIN profiles p ON p.id = r.reviewed_by
        WHERE r.created_at >= $1::date
          AND r.created_at < ($2::date + INTERVAL '1 day')
        ORDER BY r.created_at DESC, r.id DESC
    `, [from, to]);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Tickets generales');

    const fields = [
        'id', 'created_at', 'requester_name',
        'type', 'status', 'employee_dni',
        'employee_name', 'employee_dni_2',
        'employee_name_2', 'employee_service',
        'event_date', 'reason', 'review_comment',
        'reviewed_at', 'reviewer_name'
    ];

    sheet.columns = fields.map(key => ({
        header: key,
        key,
        width: 22
    }));

    result.rows.forEach(row => sheet.addRow(row));

    const titles = [
        'ID Ticket', 'Fecha de creación', 'Solicitante',
        'Tipo de solicitud', 'Estado', 'DNI Asesor 1',
        'Asesor 1', 'DNI Asesor 2', 'Asesor 2',
        'Servicio', 'Fecha solicitada', 'Motivo',
        'Comentario WF', 'Fecha de resolución', 'Revisado por'
    ];

    sheet.getRow(1).values = titles;
    sheet.getRow(1).font = {
        bold: true,
        color: { argb: 'FFFFFFFF' }
    };
    sheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0072AC' }
    };

    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.autoFilter = {
        from: 'A1',
        to: 'O1'
    };

    sheet.getColumn('created_at').numFmt = 'dd/mm/yyyy hh:mm';
    sheet.getColumn('reviewed_at').numFmt = 'dd/mm/yyyy hh:mm';
    sheet.getColumn('event_date').numFmt = 'dd/mm/yyyy';

    const buffer = await workbook.xlsx.writeBuffer();

    return {
        buffer,
        count: result.rows.length
    };
}

module.exports = { generateGeneralReport };
