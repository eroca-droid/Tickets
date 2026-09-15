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

    resolved:
        'Resuelto',

    rejected:
        'Rechazado',

    approved:
        'Aprobada'
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

const previousOpenReview =
    window.openReview;


window.openReview = async id => {

    /* -----------------------------------------
       ABRIR EL DETALLE ORIGINAL
       ----------------------------------------- */

    await previousOpenReview?.(id);


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
                    ${escapeHtml(ticket.requester_name || 'Usuario registrado')}
                </b>
            </span>


            <span>
                Estado:
                <b>
                    ${stateLabels[ticket.status] || ticket.status}
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
       HORARIOS ACTUALES
       ================================================= */

    const currentHours =

        [
            'schedule_change',
            'swap',
            'exception'
        ].includes(ticket.type)

            ? `

                <p>

                    <b>
                        Horarios actuales
                    </b>

                    <br>

                    Asesor 1:
                    ${ticket.current_start_time || '--:--'}
                    a
                    ${ticket.current_end_time || '--:--'}

                    ${
                        ticket.employee_dni_2

                            ? `

                                <br>

                                Asesor 2:
                                ${ticket.current_start_time_2 || '--:--'}
                                a
                                ${ticket.current_end_time_2 || '--:--'}

                              `

                            : ''
                    }

                </p>

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
            exceptionOriginName;


        /* -----------------------------------------
           SI EL ORIGEN ES SUPERVISOR
           MOSTRAMOS SU NOMBRE
           ----------------------------------------- */

        if (
            ticket.exception_origin === 'supervisor'
        ) {

            if (
                ticket.exception_supervisor_name
            ) {

                originText =
                    `Supervisor: <b>${escapeHtml(ticket.exception_supervisor_name)}</b>`;

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
                    ${exceptionTypeName}
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
       INSERTAR INFORMACIÓN EN EL DETALLE
       ================================================= */

    const reviewBody =
        document.querySelector(
            '#reviewBody'
        );


    if (!reviewBody) {
        return;
    }


    reviewBody.insertAdjacentHTML(

        'beforeend',

        `

            ${exceptionDetails}


            <div class="review-section">

                <strong>
                    Fechas asociadas
                </strong>

                <div>
                    ${dates}
                </div>

            </div>


            ${
                currentHours

                    ? `

                        <div class="review-section">

                            <strong>
                                Horarios actuales
                            </strong>

                            <div>

                                ${
                                    currentHours
                                        .replace(
                                            '<p><b>Horarios actuales</b><br>',
                                            ''
                                        )
                                        .replace(
                                            '</p>',
                                            ''
                                        )
                                }

                            </div>

                        </div>

                      `

                    : ''
            }


            <div class="review-section">

                <strong>
                    Observación de WFM
                </strong>

                <div>
                    ${
                        escapeHtml(ticket.review_comment) ||
                        'Aún no hay observación.'
                    }
                </div>

            </div>

        `
    );
};


/* =========================================================
   CARGA INICIAL
   ========================================================= */

renderVisibleTickets();


