'use strict';

const ExcelJS = require('exceljs');

const TIME_ZONE = 'America/Lima';
const BUSINESS_START_HOUR = 6;
const BUSINESS_END_HOUR = 16;


function businessMinutes(start, end) {
    if (!start || !end) return null;

    const a = new Date(start);
    const b = new Date(end);

    if (!Number.isFinite(a.getTime()) ||
        !Number.isFinite(b.getTime()) ||
        b <= a) return 0;

    const OFFSET = 5 * 60 * 60 * 1000;
    const DAY = 24 * 60 * 60 * 1000;

    const startLocal = a.getTime() - OFFSET;
    const endLocal = b.getTime() - OFFSET;

    let total = 0;

    for (
        let day = Math.floor(startLocal / DAY) * DAY;
        day < endLocal;
        day += DAY
    ) {
        const weekday = new Date(day).getUTCDay();

        if (weekday === 0 || weekday === 6) continue;

        const workStart = day + BUSINESS_START_HOUR * 3600000;
        const workEnd = day + BUSINESS_END_HOUR * 3600000;

        const overlapStart = Math.max(startLocal, workStart);
        const overlapEnd = Math.min(endLocal, workEnd);

        if (overlapEnd > overlapStart) {
            total += (overlapEnd - overlapStart) / 60000;
        }
    }

    return Math.round(total * 100) / 100;
}

async function generateTimesReport(pool, from, to) {
    const result = await pool.query(`
        SELECT
            r.id,
            r.requester_name,
            r.type::text AS type,
            r.status::text AS status,
            r.employee_name,
            r.employee_service,
            r.created_at,
            e.id AS event_id,
            e.from_status::text AS from_status,
            e.to_status::text AS to_status,
            e.created_at AS event_at
        FROM requests r
        LEFT JOIN request_events e
            ON e.request_id = r.id
        WHERE r.created_at >= $1::date
          AND r.created_at < ($2::date + INTERVAL '1 day')
        ORDER BY r.id, e.created_at, e.id
    `, [from, to]);

    const tickets = new Map();
    const now = new Date();

    for (const row of result.rows) {
        if (!tickets.has(row.id)) {
            tickets.set(row.id, {
                id: row.id,
                requester_name: row.requester_name,
                type: row.type,
                status: row.status,
                employee_name: row.employee_name,
                employee_service: row.employee_service,
                created_at: row.created_at,
                events: []
            });
        }

        if (row.event_id !== null) {
            tickets.get(row.id).events.push(row);
        }
    }

    const minutesBetween = (start, end) =>
        Math.max(0, (new Date(end) - new Date(start)) / 60000);

    const output = [];

    for (const ticket of tickets.values()) {
        let firstAttention = null;
        let closedAt = null;
        let observedSince = null;
        let observations = 0;
        let observedCalendar = 0;
        let observedBusiness = 0;

        for (const event of ticket.events) {
            const date = event.event_at;

            if (event.to_status === 'in_review' && !firstAttention) {
                firstAttention = date;
            }

            if (event.to_status === 'observed') {
                observations++;
                observedSince = date;
            } else if (observedSince) {
                observedCalendar += minutesBetween(observedSince, date);
                observedBusiness += businessMinutes(observedSince, date);
                observedSince = null;
            }

            if (['approved', 'rejected'].includes(event.to_status)) {
                closedAt = date;
            }
        }

        const end = closedAt || now;

        if (observedSince) {
            observedCalendar += minutesBetween(observedSince, end);
            observedBusiness += businessMinutes(observedSince, end);
        }

        const totalCalendar = minutesBetween(ticket.created_at, end);
        const totalBusiness = businessMinutes(ticket.created_at, end);

        output.push({
            ...ticket,
            first_attention_at: firstAttention,
            closed_at: closedAt,
            observations,
            first_attention_calendar_min: firstAttention
                ? minutesBetween(ticket.created_at, firstAttention) : null,
            first_attention_business_min: firstAttention
                ? businessMinutes(ticket.created_at, firstAttention) : null,
            observed_calendar_min: observedCalendar,
            observed_business_min: observedBusiness,
            total_calendar_min: totalCalendar,
            total_business_min: totalBusiness,
            outside_observation_calendar_min:
                Math.max(0, totalCalendar - observedCalendar),
            outside_observation_business_min:
                Math.max(0, totalBusiness - observedBusiness),
            resolution_calendar_min: closedAt ? totalCalendar : null,
            resolution_business_min: closedAt ? totalBusiness : null
        });
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'WFM - Seguimiento de Tickets';

    const sheet = workbook.addWorksheet('Tiempos de atención', {
        views: [{ state: 'frozen', ySplit: 1 }]
    });

    const columns = [
        ['id', 'ID Ticket'],
        ['requester_name', 'Solicitante'],
        ['type', 'Tipo de solicitud'],
        ['status', 'Estado'],
        ['employee_name', 'Ejecutivo'],
        ['employee_service', 'Servicio'],
        ['created_at', 'Fecha de creación'],
        ['first_attention_at', 'Primera atención'],
        ['closed_at', 'Fecha de cierre'],
        ['observations', 'N.º observaciones'],
        ['first_attention_calendar_min', 'Primera atención calendario (min)'],
        ['first_attention_business_min', 'Primera atención hábil (min)'],
        ['observed_calendar_min', 'Observación calendario (min)'],
        ['observed_business_min', 'Observación hábil (min)'],
        ['total_calendar_min', 'Tiempo transcurrido calendario (min)'],
        ['total_business_min', 'Tiempo transcurrido hábil (min)'],
        ['outside_observation_calendar_min', 'Fuera de observación calendario (min)'],
        ['outside_observation_business_min', 'Fuera de observación hábil (min)'],
        ['resolution_calendar_min', 'Resolución calendario (min)'],
        ['resolution_business_min', 'Resolución hábil (min)']
    ];

    sheet.columns = columns.map(([key, header]) => ({
        key,
        header,
        width: 27
    }));

    output.forEach(ticket => {
        const { events, ...data } = ticket;
        sheet.addRow(data);
    });

    sheet.getRow(1).font = {
        bold: true,
        color: { argb: 'FFFFFFFF' }
    };

    sheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0072AC' }
    };

    sheet.autoFilter = 'A1:T1';

    for (const key of ['created_at', 'first_attention_at', 'closed_at']) {
        sheet.getColumn(key).numFmt = 'dd/mm/yyyy hh:mm';
    }

    for (let col = 11; col <= 20; col++) {
        sheet.getColumn(col).numFmt = '0.00';
    }

    const buffer = await workbook.xlsx.writeBuffer();

    return {
        buffer,
        count: output.length
    };
}

module.exports = { generateTimesReport };
