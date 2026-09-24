/* =========================================================
   UI FINAL - TURNACLARO
   ========================================================= */

const ownerFilter =
    document.querySelector('#ownerFilter');

const responsiveRuleLabels = [
    'Anticipación (h)',
    'Hora de corte',
    'Requiere evidencia',
    'Coordinación',
    'Supervisión'
];

document.querySelectorAll('.static-rule-row').forEach(row => {
    [...row.children].slice(1).forEach((control, index) => {
        const field = document.createElement('div');
        const label = document.createElement('span');
        field.className = 'static-rule-field';
        label.className = 'static-rule-label';
        label.textContent = responsiveRuleLabels[index] || 'Configuración';
        row.insertBefore(field, control);
        field.append(label, control);
    });
});


/* =========================================================
   NOMBRES DE TIPOS
   ========================================================= */

const typeLabels = {

    schedule_change:
        'Cambio de horario',

    swap:
        'Enroque',

    comp_time:
        'Compensado',

    overtime:
        'Horas extra',

    siop_validation:
        'Validación SIOP',

    exception:
        'Excepción'
};


/* =========================================================
   NOMBRES DE ESTADOS
   ========================================================= */

const stateLabels = {

    pending:
        'Pendiente',

    in_review:
        'En revisión',

    observed:
        'Observado',

    rejected:
        'Rechazado',

    approved:
        'Aprobado'
};


/* =========================================================
   NOMBRES DE ORIGEN
   ========================================================= */

const originLabels = {

    coordinator:
        'Coordinador',

    supervisor:
        'Supervisor',

    agent:
        'Agente'
};


/* =========================================================
   RENDER DE TICKETS
   ========================================================= */

function renderVisibleTickets() {

    const tickets =
        JSON.parse(
            localStorage.getItem(
                'turnoClaroRequests'
            ) || '[]'
        );


    const owner =
        ownerFilter?.value || 'all';


    const status =
        document.querySelector(
            '#statusFilter'
        )?.value || 'all';


    const type =
        document.querySelector(
            '#typeFilter'
        )?.value || 'all';


    const userId =
        localStorage.getItem(
            'turnoClaroUserId'
        );


    const visible =
        tickets.filter(ticket =>

            (
                owner !== 'mine' ||
                ticket.requester_id === userId
            )

            &&

            (
                status === 'all' ||
                ticket.status === status
            )

            &&

            (
                type === 'all' ||
                ticket.type === type
            )
        );


    const table =
        document.querySelector(
            '#requestsTable'
        );


    if (!table) {
        return;
    }


    table.innerHTML =

        visible.map(ticket => `

            <tr>

                <td data-label="Solicitud">
                    <strong>
                        ${ticket.id}
                    </strong>

                    <br>

                    <small>
                        ${typeLabels[ticket.type] || ticket.type}
                    </small>
                </td>


                <td data-label="Solicitante">
                    ${escapeHtml(ticket.requester_name || 'Usuario registrado')}
                </td>


                <td data-label="Fecha">
                    ${ticket.date}
                </td>


                <td data-label="Estado">

                    <span
                        class="status status-${ticket.status}"
                    >
                        ${stateLabels[ticket.status] || ticket.status}
                    </span>

                </td>


                <td data-label="Acción">

                    <button
                        class="text-button detail-button"
                        data-id="${ticket.id}"
                    >

                        Ver detalle

                        <i
                            data-lucide="arrow-right"
                        ></i>

                    </button>

                </td>

            </tr>

        `).join('')


        ||

        `
            <tr class="empty-table-row">
                <td colspan="5">
                    No hay resultados con estos filtros.
                </td>
            </tr>
        `;


    table
        .querySelectorAll('.detail-button')
        .forEach(button => {

            button.addEventListener(
                'click',
                () => {

                    window.openReview?.(
                        button.dataset.id
                    );
                }
            );
        });


    if (window.lucide) {
        lucide.createIcons();
    }
}


/* =========================================================
   FILTROS
   ========================================================= */

document
    .querySelector('#ownerFilter')
    ?.addEventListener(
        'change',
        renderVisibleTickets
    );


document
    .querySelector('#statusFilter')
    ?.addEventListener(
        'change',
        renderVisibleTickets
    );


document
    .querySelector('#typeFilter')
    ?.addEventListener(
        'change',
        renderVisibleTickets
    );


/* =========================================================
   DETALLE DE SOLICITUD
   ========================================================= */



/* =========================================================
   DETALLE DE SOLICITUD + CONVERSACIÓN
   ========================================================= */

const previousOpenReview =
    window.openReview;


window.openReview = async id => {

    /* -----------------------------------------
       BUSCAR TICKET
       ----------------------------------------- */

    const ticket =
        JSON.parse(
            localStorage.getItem(
                'turnoClaroRequests'
            ) || '[]'
        )
        .find(
            item => item.id === id
        );


    if (!ticket) {
        return;
    }


    /* =================================================
       ABRIR MODAL
       ================================================= */

    const modal =
        document.querySelector(
            '#reviewModal'
        );

    if (!modal) {
        return;
    }

    modal.classList.add(
        'open'
    );

    modal.dataset.id = id;

    const title =
        document.querySelector(
            '#reviewTitle'
        );

    if (title) {

        title.textContent =
            `${ticket.id} · ${wfTypes[ticket.type]
            || ticket.type
            }`;
    }


    /* =================================================
       META
       ================================================= */

    const reviewMeta =
        document.querySelector(
            '#reviewMeta'
        );


    if (reviewMeta) {

        reviewMeta.innerHTML = `

            <span>
                Creado por:
                <b>
                    ${escapeHtml(
                        ticket.requester_name ||
                        'Usuario registrado'
                    )}
                </b>
            </span>

            <span>
                Estado:
                <b>
                    ${
                        stateLabels[ticket.status] ||
                        ticket.status
                    }
                </b>
            </span>

        `;
    }


    /* =================================================
       FECHAS
       ================================================= */

    const dates =
        ticket.event_dates?.length
            ? ticket.event_dates.join(', ')
            : ticket.date;


    /* =================================================
       HORARIOS
       ================================================= */

    const hasScheduleData =
        [
            'schedule_change',
            'swap',
            'exception'
        ].includes(ticket.type);


    const currentStart1 =
        escapeHtml(
            ticket.current_start_time ||
            '--:--'
        );


    const currentEnd1 =
        escapeHtml(
            ticket.current_end_time ||
            '--:--'
        );


    const currentStart2 =
        escapeHtml(
            ticket.current_start_time_2 ||
            '--:--'
        );


    const currentEnd2 =
        escapeHtml(
            ticket.current_end_time_2 ||
            '--:--'
        );


    const requestedStart =
        escapeHtml(
            ticket.start_time ||
            '--:--'
        );


    const requestedEnd =
        escapeHtml(
            ticket.end_time ||
            '--:--'
        );


    const requestedStart2 =
        escapeHtml(
            ticket.start_time_2 ||
            ticket.requested_start_time_2 ||
            '--:--'
        );


    const requestedEnd2 =
        escapeHtml(
            ticket.end_time_2 ||
            ticket.requested_end_time_2 ||
            '--:--'
        );


    const hasSecondAgent =
        !!ticket.employee_dni_2;


    const scheduleHtml =

        hasScheduleData

            ? `

                <div class="schedule-comparison">

                    <div class="schedule-column current">

                        <div class="schedule-column-title">
                            Horario actual
                        </div>

                        <div class="schedule-agent">

                            <span class="schedule-agent-name">
                                Asesor 1
                            </span>

                            <strong>
                                ${currentStart1}
                                <span>→</span>
                                ${currentEnd1}
                            </strong>

                        </div>

                        ${
                            hasSecondAgent

                                ? `

                                    <div class="schedule-agent">

                                        <span class="schedule-agent-name">
                                            Asesor 2
                                        </span>

                                        <strong>
                                            ${currentStart2}
                                            <span>→</span>
                                            ${currentEnd2}
                                        </strong>

                                    </div>

                                  `

                                : ''
                        }

                    </div>


                    <div class="schedule-arrow">
                        →
                    </div>


                    <div class="schedule-column requested">

                        <div class="schedule-column-title">
                            Horario solicitado
                        </div>

                        <div class="schedule-agent">

                            <span class="schedule-agent-name">
                                Asesor 1
                            </span>

                            <strong>
                                ${requestedStart}
                                <span>→</span>
                                ${requestedEnd}
                            </strong>

                        </div>

                        ${
                            hasSecondAgent

                                ? `

                                    <div class="schedule-agent">

                                        <span class="schedule-agent-name">
                                            Asesor 2
                                        </span>

                                        <strong>
                                            ${requestedStart2}
                                            <span>→</span>
                                            ${requestedEnd2}
                                        </strong>

                                    </div>

                                  `

                                : ''
                        }

                    </div>

                </div>

              `

            : '';


    /* =================================================
       DETALLE DE EXCEPCIÓN
       ================================================= */

    let exceptionDetails = '';


    if (ticket.type === 'exception') {

        const exceptionTypeName =

            typeLabels[
                ticket.exception_type
            ]

            ||

            ticket.exception_type

            ||

            'No especificado';


        const exceptionOriginName =

            originLabels[
                ticket.exception_origin
            ]

            ||

            ticket.exception_origin

            ||

            'No especificado';


        let originText =
            escapeHtml(
                exceptionOriginName
            );


        if (
            ticket.exception_origin === 'supervisor'
        ) {

            if (
                ticket.exception_supervisor_name
            ) {

                originText =
                    `Supervisor: <b>${escapeHtml(
                        ticket.exception_supervisor_name
                    )}</b>`;

            } else {

                originText =
                    'Supervisor: No especificado';
            }
        }


        exceptionDetails = `

            <div class="review-section">

                <strong>
                    Excepción sobre
                </strong>

                <div>
                    ${escapeHtml(exceptionTypeName)}
                </div>

            </div>


            <div class="review-section">

                <strong>
                    Origen del error
                </strong>

                <div>
                    ${originText}
                </div>

            </div>

        `;
    }


    /* =================================================
       REVIEW BODY
       ================================================= */

    const reviewBody =
        document.querySelector(
            '#reviewBody'
        );


    if (!reviewBody) {
        return;
    }

    /*
       Limpiar el contenido de la solicitud anterior
       antes de construir la nueva.
    */
    reviewBody.innerHTML = '';


    /* =================================================
       CARGAR TRAZABILIDAD
       ================================================= */

    let events = [];


    try {

        const eventsResponse =
            await fetch(
                `/api/request-events?request_id=${encodeURIComponent(
                    ticket.dbId
                )}`,
                {
                    credentials: 'same-origin'
                }
            );


        if (eventsResponse.ok) {

            const eventsResult =
                await eventsResponse.json();


            events =
                Array.isArray(
                    eventsResult.data
                )
                    ? eventsResult.data
                    : [];
        }

    } catch (error) {

        console.error(
            'No se pudo cargar la trazabilidad:',
            error
        );
    }


    /* =================================================
       CARGAR EVIDENCIAS
       ================================================= */

    let evidences = [];


    try {

        const evidenceResponse =
            await fetch(
                `/api/evidence?request_id=${encodeURIComponent(
                    ticket.dbId
                )}`,
                {
                    credentials: 'same-origin'
                }
            );


        if (evidenceResponse.ok) {

            const evidenceResult =
                await evidenceResponse.json();


            evidences =
                Array.isArray(
                    evidenceResult.data
                )
                    ? evidenceResult.data
                    : [];
        }

    } catch (error) {

        console.error(
            'No se pudieron cargar las evidencias:',
            error
        );
    }


    /* =================================================
       FORMATO DE FECHA / HORA
       ================================================= */

    const formatEventDate = value => {

        if (!value) {
            return 'Fecha no disponible';
        }


        const date =
            new Date(value);


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return 'Fecha no disponible';
        }


        return new Intl.DateTimeFormat(
            'es-PE',
            {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }
        ).format(date);
    };


    /* =================================================
       NOMBRES DE ROLES
       ================================================= */

    const roleLabels = {

        coordinator: 'Coordinador',

        supervisor: 'Supervisor',

        wfm: 'WFM',

        management: 'Jefatura',

        superadmin: 'Administrador'

    };


    /* =================================================
       CONVERSACIÓN
       ================================================= */

    const conversationHtml =

        events.length

            ? events.map(event => {

                const userName =
                    escapeHtml(
                        event.user_name ||
                        'Usuario registrado'
                    );


                const role =
                    roleLabels[
                        event.user_role
                    ]

                    ||

                    escapeHtml(
                        event.user_role ||
                        'Usuario'
                    );


                const comment =
                    escapeHtml(
                        event.comment ||
                        'Sin comentario.'
                    );


                const fromStatus =
                    event.from_status
                        ? (
                            stateLabels[
                                event.from_status
                            ]
                            ||
                            event.from_status
                        )
                        : 'Inicio';


                const toStatus =
                    event.to_status
                        ? (
                            stateLabels[
                                event.to_status
                            ]
                            ||
                            event.to_status
                        )
                        : '—';


                const transition =
                    event.from_status

                        ? `${escapeHtml(
                            fromStatus
                        )} → ${escapeHtml(
                            toStatus
                        )}`

                        : escapeHtml(
                            toStatus
                        );


                const eventAttachments =
                    Array.isArray(
                        event.attachments
                    )
                        ? event.attachments
                        : [];


                const eventAttachmentsHtml =
                    eventAttachments.length

                        ? `

                            <div class="conversation-attachments">

                                ${
                                    eventAttachments.map(
                                        attachment => {

                                            const fileName =
                                                escapeHtml(
                                                    attachment.original_name ||
                                                    attachment.path ||
                                                    'Evidencia'
                                                );


                                            const evidenceUrl =
                                                `/api/evidence?path=${encodeURIComponent(
                                                    attachment.path
                                                )}`;


                                            return `

                                                <div class="conversation-attachment">

                                                    <span class="conversation-attachment-icon">
                                                        📎
                                                    </span>

                                                    <a
                                                        href="${evidenceUrl}"
                                                        target="_blank"
                                                        rel="noopener"
                                                    >
                                                        ${fileName}
                                                    </a>

                                                </div>

                                            `;

                                        }
                                    ).join('')
                                }

                            </div>

                          `

                        : '';


                return `

                    <div class="conversation-item">

                        <div class="conversation-header">

                            <div class="conversation-user">

                                <strong>
                                    ${userName}
                                </strong>

                                <span>
                                    ${role}
                                </span>

                            </div>


                            <time>
                                ${formatEventDate(
                                    event.created_at
                                )}
                            </time>

                        </div>


                        <div class="conversation-message">

                            ${comment}

                        </div>


                        ${eventAttachmentsHtml}


                        <div class="conversation-status">

                            ${transition}

                        </div>

                    </div>

                `;

            }).join('')

            : `

                <div class="conversation-empty">

                    Aún no hay mensajes en la conversación.

                </div>

              `;


    /* =================================================
       EVIDENCIAS
       ================================================= */

    const evidenceHtml =

        evidences.length

            ? `

                <div class="evidence-list">

                    ${
                        evidences.map(
                            evidence => {

                                const fileName =
                                    escapeHtml(
                                        evidence.original_name ||
                                        evidence.path ||
                                        'Evidencia'
                                    );


                                const evidenceUrl =
                                    `/api/evidence?path=${encodeURIComponent(
                                        evidence.path
                                    )}`;


                                return `

                                    <div class="evidence-item">

                                        <div class="evidence-icon">
                                            📎
                                        </div>

                                        <div class="evidence-info">

                                            <a
                                                class="evidence-link"
                                                href="${evidenceUrl}"
                                                target="_blank"
                                                rel="noopener"
                                            >
                                                ${fileName}
                                            </a>

                                            <small>
                                                ${formatEventDate(
                                                    evidence.created_at
                                                )}
                                            </small>

                                        </div>

                                    </div>

                                `;

                            }
                        ).join('')
                    }

                </div>

              `

            : `

                <div>
                    No hay evidencias asociadas.
                </div>

              `;


    /* =================================================
       INSERTAR DETALLE
       ================================================= */

    const requestTypeName =
        typeLabels[ticket.type] ||
        ticket.type ||
        'Solicitud';

    const requesterName =
        escapeHtml(
            ticket.requester_name ||
            'Usuario registrado'
        );

    const employeeName1 =
        escapeHtml(
            ticket.employee ||
            ticket.employee_name ||
            '—'
        );

    const employeeDni1 =
        escapeHtml(
            ticket.employee_dni ||
            '—'
        );

    const employeeName2 =
        escapeHtml(
            ticket.employee_2 ||
            ticket.employee_name_2 ||
            '—'
        );

    const employeeDni2 =
        escapeHtml(
            ticket.employee_dni_2 ||
            ''
        );

    const requestedDates =
        ticket.event_dates?.length
            ? ticket.event_dates
                .map(date => escapeHtml(String(date)))
                .join(', ')
            : escapeHtml(ticket.date || '—');

    const requestSummaryHtml = `

        <div class="review-request-summary">

            <div class="review-summary-header">

                <div>
                    <span class="review-summary-eyebrow">
                        Solicitud
                    </span>

                    <h3>
                        ${escapeHtml(requestTypeName)}
                    </h3>
                </div>

                <span class="status status-${escapeHtml(ticket.status)}">
                    ${escapeHtml(
                        stateLabels[ticket.status] ||
                        ticket.status ||
                        '—'
                    )}
                </span>

            </div>

            <div class="review-summary-grid">

                <div class="review-summary-item">

                    <span>
                        Solicitado por
                    </span>

                    <strong>
                        ${requesterName}
                    </strong>

                </div>

                <div class="review-summary-item">

                    <span>
                        Ticket
                    </span>

                    <strong>
                        ${escapeHtml(ticket.id || '—')}
                    </strong>

                </div>

                <div class="review-summary-item review-summary-wide">

                    <span>
                        Agente(s)
                    </span>

                    <strong>
                        ${employeeDni1} · ${employeeName1}
                        ${
                            employeeDni2
                                ? `<br>${employeeDni2} · ${employeeName2}`
                                : ''
                        }
                    </strong>

                </div>

                <div class="review-summary-item review-summary-wide">

                    <span>
                        Fecha(s) solicitada(s)
                    </span>

                    <strong>
                        ${requestedDates}
                    </strong>

                </div>

                <div class="review-summary-item review-summary-wide">

                    <span>
                        Motivo
                    </span>

                    <strong class="review-summary-reason">
                        ${escapeHtml(
                            ticket.reason ||
                            'Sin detalle adicional.'
                        )}
                    </strong>

                </div>

            </div>

        </div>

    `;


    reviewBody.insertAdjacentHTML(

        'beforeend',

        `

            ${requestSummaryHtml}

            ${exceptionDetails}


            <div class="review-section conversation-section">

                <strong>
                    Conversación / trazabilidad
                </strong>

                <div class="conversation-list">

                    ${conversationHtml}

                </div>

            </div>


            <div class="review-section">

                <strong>
                    Observación actual de WFM
                </strong>

                <div>
                    ${
                        escapeHtml(
                            ticket.review_comment
                        ) ||
                        'Aún no hay observación.'
                    }
                </div>

            </div>

        `
    );


    if (window.lucide) {
        lucide.createIcons();
    }

    if (window.configureReviewActions) {
        window.configureReviewActions(id);
    }
};

/* =========================================================
   CARGA INICIAL
   ========================================================= */

renderVisibleTickets();


