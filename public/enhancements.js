
/* =========================================================
   1. AGREGAR EL TIPO DE SOLICITUD "VALIDACIÓN SIOP"
   ========================================================= */

/*
   Se crea dinámicamente una nueva tarjeta/opción para el selector
   de tipos de solicitud.

   document.createElement('label')
   crea un elemento HTML <label> desde JavaScript.
*/
const siopCard = document.createElement('label');

/*
   innerHTML inserta dentro del label:
   - Un radio button.
   - value="siop_validation" como identificador interno.
   - Un icono de Lucide.
   - Título visible.
   - Descripción corta.
*/
siopCard.innerHTML = `
    <input
        type="radio"
        name="type"
        value="siop_validation"
    >
    <span>
        <i data-lucide="badge-check"></i>
        <b>Validación SIOP</b>
        <small>Validar conexión</small>
    </span>
`;

/*
   Agrega la nueva tarjeta al contenedor existente
   con la clase .type-picker.
*/
document.querySelector('.type-picker')?.append(siopCard);


/* =========================================================
   2. MODIFICAR EL CAMPO DEL ASESOR
   ========================================================= */

/*
   Busca el campo original con id="employee".

   ?. significa "optional chaining":
   evita que JavaScript genere error si el elemento no existe.

   closest('.field') busca el contenedor padre más cercano
   que tenga la clase .field.
*/
const employeeField =
    document.querySelector('#employee')?.closest('.field');

/*
   Agrega una clase adicional al campo.
   Esto puede utilizarse posteriormente para estilos CSS.
*/
if (employeeField) {
    employeeField.classList.add('employee-field');
}


/* =========================================================
   3. AGREGAR SELECTOR DE PERÍODO
   ========================================================= */

/*
   Busca el contenedor del campo de fecha.
*/
const dateField =
    document.querySelector('#eventDate')?.closest('.field');

/*
   afterend inserta el nuevo HTML inmediatamente después
   del campo de fecha.

   Este selector permite indicar cómo se aplicará un cambio:
   - Día específico.
   - Semana actual.
   - Todo el mes.
   - Fin de semana.
*/
if (dateField) {
    dateField.insertAdjacentHTML(
        'afterend',
        `
        <label class="field" id="periodField">

            <span>Aplicación del cambio</span>

            <select id="periodType">
                <option value="specific">
                    Día específico
                </option>

                <option value="current_week">
                    Semana actual (L-D)
                </option>

                <option value="month">
                    Todo el mes
                </option>

                <option value="weekend">
                    Fin de semana
                </option>
            </select>

        </label>
        `
    );
}


/* =========================================================
   4. UBICAR EL GRID DE DETALLE
   ========================================================= */

/*
   Busca el campo #startTime y luego su contenedor
   .field-grid.

   Este contenedor será utilizado posteriormente para insertar:
   - Fechas adicionales.
   - Excepciones.
   - Otros campos dinámicos.
*/
const detailGrid =
    document.querySelector('#startTime')?.closest('.field-grid');


/* =========================================================
   5. CONTENEDOR PARA FECHAS ADICIONALES
   ========================================================= */

/*
   Se agrega un contenedor vacío.

   Inicialmente no muestra nada.

   La función updateTypeFields() agregará contenido
   dependiendo del tipo de solicitud seleccionado.
*/
if (detailGrid) {
    detailGrid.insertAdjacentHTML(
        'beforeend',
        `
        <div
            id="extraDates"
            class="full-field date-list"
        ></div>
        `
    );
}


/* =========================================================
   6. REEMPLAZAR CAMPO ORIGINAL POR DNI DEL ASESOR
   ========================================================= */

/*
   Se reemplaza el contenido original del campo employee
   por un input específico para DNI.

   También se agrega #agentData.

   #agentData mostrará el resultado de la consulta
   realizada a la tabla "dotacion" en API PostgreSQL.
*/
if (employeeField) {
    employeeField.innerHTML = `
        <div class="agent-block agent-block-primary">

            <span class="agent-block-title">
                Asesor 1
            </span>

            <label class="field agent-dni-field">

                <span>
                    DNI del asesor
                </span>

                <input
                    id="agentDni"
                    inputmode="numeric"
                    placeholder="Ej. 1234567890"
                    required
                >

                <div
                    id="agentData"
                    class="agent-data"
                    aria-live="polite"
                >
                    Escribe el DNI para consultar la dotación.
                </div>

            </label>

        </div>
    `;
}


/* =========================================================
   7. AGREGAR CAMPOS PARA EXCEPCIONES
   ========================================================= */

/*
   Se agregan campos que solo serán visibles cuando
   el tipo seleccionado sea "exception".

   Incluye:
   - Tipo de excepción.
   - Origen del error.
*/
if (detailGrid) {
    detailGrid.insertAdjacentHTML(
        'beforeend',
        `
        <label class="field full-field" id="exceptionField">

            <span>Excepción sobre</span>

            <select id="exceptionType">
                <option value="schedule_change">Cambio de horario</option>
                <option value="swap">Enroque</option>
                <option value="comp_time">Compensado</option>
                <option value="overtime">Horas extra</option>
                <option value="siop_validation">Validación SIOP</option>
            </select>

            <span class="sub-label">Origen del error</span>

            <select id="errorOrigin">
                <option value="coordinator">Coordinador</option>
                <option value="supervisor">Supervisor</option>
                <option value="agent">Agente</option>
            </select>

            <!-- NUEVO: supervisor relacionado -->
            <div id="exceptionSupervisorField" style="display:none; margin-top:12px;">
                <span class="sub-label">Supervisor relacionado</span>

                <select id="exceptionSupervisor">
                    <option value="">Selecciona un supervisor</option>
                </select>
            </div>

        </label>
        `
    );
}




/* =========================================================
   8. AGREGAR SIOP AL FILTRO DE TIPOS
   ========================================================= */

/*
   Busca el selector utilizado para filtrar solicitudes
   por tipo.
*/
const typeFilter =
    document.querySelector('#typeFilter');

/*
   Se agrega la opción Validación SIOP al filtro.

   Se valida que typeFilter exista antes de utilizar append().
*/
if (typeFilter) {

    const siopOption =
        document.createElement('option');

    siopOption.value =
        'siop_validation';

    siopOption.textContent =
        'Validación SIOP';

    typeFilter.append(siopOption);
}


/* =========================================================
   9. REGLAS DE NEGOCIO PARA EL FORMULARIO
   ========================================================= */

/*
   Las reglas de creación pertenecen al panel WFM.

   El formulario no debe tener políticas quemadas como:
   - 48 horas
   - evidencia obligatoria
   - corte 15:00

   Aquí cargamos la configuración real de business_rules
   y la dejamos disponible para el resto del formulario.
*/

window.wfmBusinessRules = {};


/*
   Carga las reglas configuradas por WFM.
*/
window.loadWfmBusinessRules = async () => {

    try {

        const result =
            await apiClient
                .from('business_rules')
                .select('*');

        if (result?.error) {
            throw result.error;
        }

        window.wfmBusinessRules = {};

        (result?.data || []).forEach(rule => {

            if (!rule?.rule_key) return;

            window.wfmBusinessRules[rule.rule_key] =
                rule;
        });

        updatePolicy();

        return window.wfmBusinessRules;

    } catch (error) {

        console.error(
            'No se pudieron cargar las reglas de WFM:',
            error
        );

        /*
           Si falla la consulta, dejamos el objeto vacío.
           El backend seguirá siendo la validación final.
        */

        window.wfmBusinessRules = {};

        updatePolicy();

        return window.wfmBusinessRules;
    }
};


/*
   Devuelve la regla correspondiente al tipo actual.
*/
const getWfmRule = type =>
    window.wfmBusinessRules?.[type] || null;


/*
   Convierte las horas configuradas en un texto
   entendible para el usuario.
*/
const formatAdvanceText = hours => {

    const value = Number(hours);

    if (!Number.isFinite(value) || value <= 0) {
        return '';
    }

    if (value === 1) {
        return 'Requiere 1 hora de anticipación.';
    }

    if (value < 24) {
        return `Requiere ${value} horas de anticipación.`;
    }

    if (value % 24 === 0) {

        const days = value / 24;

        if (days === 1) {
            return 'Requiere 1 día de anticipación.';
        }

        return `Requiere ${days} días de anticipación.`;
    }

    return `Requiere ${value} horas de anticipación.`;
};


/*
   Actualiza el mensaje visual de política
   utilizando exclusivamente business_rules.
*/
function updatePolicy() {

    const type =
        document.querySelector(
            'input[name="type"]:checked'
        )?.value;

    const rule =
        getWfmRule(type);

    const policyAlert =
        document.querySelector('#policyAlert');

    const policyText =
        document.querySelector('#policyAlert span');

    const evidence =
        document.querySelector('#evidence');


    /*
       Construye el mensaje de forma dinámica.
    */
    const messages = [];

    if (rule) {

        const advanceText =
            formatAdvanceText(
                rule.min_advance_hours
            );

        if (advanceText) {
            messages.push(advanceText);
        }

        if (rule.same_day_cutoff) {

            const cutoff =
                String(
                    rule.same_day_cutoff
                ).slice(0, 5);

            messages.push(
                `Para solicitudes del día de hoy, el corte es a las ${cutoff}.`
            );
        }

        if (rule.requires_evidence) {

            messages.push(
                'La evidencia es obligatoria.'
            );

        } else {

            messages.push(
                'La evidencia es opcional.'
            );
        }
    }


    /*
       Si todavía no se pudieron cargar las reglas,
       no mostramos una política inventada.
    */
    const message =
        messages.join(' ');


    if (policyAlert) {

        policyAlert.style.display =
            message
                ? 'flex'
                : 'none';
    }


    if (policyText) {
        policyText.textContent =
            message;
    }


    /*
       Actualiza el texto del campo de evidencia
       según la configuración de WFM.
    */
    if (evidence) {

        const evidenceField =
            evidence.closest('.field');

        const evidenceLabel =
            evidenceField?.querySelector('em');

        if (evidenceLabel) {

            if (rule?.requires_evidence) {

                evidenceLabel.textContent =
                    ' (obligatoria)';

            } else {

                evidenceLabel.textContent =
                    ' (opcional)';
            }
        }
    }
}


/*
   Actualiza la política cuando cambia el tipo.
*/
document
    .querySelectorAll('input[name="type"]')
    .forEach(input => {

        input.addEventListener(
            'change',
            updatePolicy
        );
    });


/*
   Carga las reglas configuradas por WFM
   al iniciar el formulario.
*/
window.loadWfmBusinessRules();


/*
   Vuelve a renderizar los iconos Lucide
   agregados dinámicamente.
*/
if (window.lucide) {
    lucide.createIcons();
}


/* =========================================================
   10. VALIDACIONES ESPECÍFICAS DEL FORMULARIO
   ========================================================= */

/*
   Las reglas de anticipación y evidencia ya no se
   validan aquí de forma quemada.

   api-app.js consulta business_rules y el backend
   vuelve a validar la solicitud antes de guardarla.

   Este listener únicamente conserva una validación
   básica de fecha para SIOP.
*/

document.querySelector('#requestForm')?.addEventListener(
    'submit',
    event => {

        const type =
            document.querySelector(
                'input[name="type"]:checked'
            )?.value;

        if (type !== 'siop_validation') {
            return;
        }

        const date =
            document.querySelector(
                '#eventDate'
            )?.value;

        if (!date) {

            event.preventDefault();
            event.stopImmediatePropagation();

            alert(
                'Validación SIOP: selecciona la fecha.'
            );
        }
    },
    true
);


/* =========================================================
   11. DICCIONARIO DE TIPOS DE SOLICITUD
   ========================================================= */

/*
   Este objeto convierte los valores técnicos almacenados
   en la base de datos a nombres legibles para el usuario.

   Ejemplo:

   schedule_change
   ↓
   Cambio de horario
*/
const wfTypes = {

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
   12. RENDERIZAR PANEL DE SOLICITUDES WFM
   ========================================================= */

/*
   Esta función actualiza las tarjetas del panel WFM.

   Lee las solicitudes almacenadas temporalmente
   en localStorage.
*/
function renderWF() {

    /*
       Obtiene todas las solicitudes.

       Si no existe información todavía,
       utiliza un array vacío [].
    */
    const stored =
        JSON.parse(
            localStorage.getItem(
                'turnoClaroRequests'
            ) || '[]'
        );


    /*
       Recorre cada estado que tendrá una columna/lista
       dentro del panel WFM.
    */
    [
        'pending',
        'in_review',
        'resolved',
        'rejected'
    ].forEach(status => {


        /*
           Convierte:

           pending
           ↓
           Pending

           Esto permite construir IDs como:

           #wfPendingCount
           #wfPendingList
        */
        const key =
            status[0].toUpperCase()
            + status.slice(1);


        /*
           Filtra únicamente las solicitudes
           que tengan el estado actual.
        */
        const items =
            stored.filter(
                item =>
                    item.status === status
            );


        /*
           Busca el elemento donde se muestra
           la cantidad de solicitudes.
        */
        const count =
            document.querySelector(
                `#wf${key}Count`
            );


        /*
           Busca el contenedor donde se mostrarán
           las tarjetas.
        */
        const list =
            document.querySelector(
                `#wf${key}List`
            );


        /*
           Actualiza el contador.
        */
        if (count) {
            count.textContent =
                items.length;
        }


        /*
           Construye las tarjetas HTML.
        */
        if (list) {

            /*
               slice(0, 6)
               limita la visualización a máximo
               6 solicitudes por columna.
            */
            list.innerHTML =
                items.slice(0, 6).map(item => `

                    <div class="wf-card">

                        <strong>
                            ${item.id}
                        </strong>

                        <span>
                            ${wfTypes[item.type] || item.type}
                        </span>

                        <small>
                            ${escapeHtml(item.employee)} · ${item.date}
                        </small>


                        ${
                    /*
                       Solo muestra "Ver detalle"
                       si el estado está pendiente
                       o en revisión.
                    */
                    status === 'pending'
                        || status === 'in_review'

                        ? `
                                    <button
                                        class="text-button wf-review"
                                        data-id="${item.id}"
                                    >
                                        Ver detalle
                                        <i data-lucide="arrow-right"></i>
                                    </button>
                                `

                        : ''
                    }

                    </div>

                `).join('')

                ||

                /*
                   Si no existen solicitudes,
                   muestra mensaje vacío.
                */
                '<p class="wf-empty">Sin solicitudes</p>';
        }
    });


    /*
       Agrega funcionalidad a todos los botones
       "Ver detalle".
    */
    document
        .querySelectorAll('.wf-review')
        .forEach(button => {

            button.addEventListener(
                'click',
                () => {

                    /*
                       Abre el modal de revisión
                       utilizando el ID almacenado
                       en data-id.
                    */
                    window.openReview?.(
                        button.dataset.id
                    );
                }
            );
        });


    /*
       Renderiza nuevamente iconos dinámicos.
    */
    if (window.lucide) {
        lucide.createIcons();
    }
}


/* =========================================================
   13. CREAR TABLERO VISUAL DE ESTADOS
   ========================================================= */

function renderStatusBoard() {

    /*
       Busca la cuadrícula principal de estadísticas.
    */
    const stats =
        document.querySelector(
            '.stats-grid'
        );


    /*
       Si no existe el contenedor,
       no continúa.
    */
    if (!stats) return;


    /*
       Evita crear el tablero más de una vez.
    */
    if (
        document.querySelector(
            '.status-board'
        )
    ) {
        return;
    }


    /*
       Inserta el tablero inmediatamente después
       de la cuadrícula de estadísticas.
    */
    stats.insertAdjacentHTML(
        'afterend',
        `
        <div class="status-board">

            <div class="status-board-title">

                <span class="eyebrow">
                    Estado del flujo
                </span>

                <strong>
                    Visibilidad en un vistazo
                </strong>

            </div>


            <div class="status-track">

                <div>
                    <span
                        class="track-dot pending-dot"
                    ></span>

                    <b id="pendingBoard">0</b>

                    <small>Pendientes</small>
                </div>


                <div>
                    <span
                        class="track-dot approved-dot"
                    ></span>

                    <b id="approvedBoard">0</b>

                    <small>Aprobadas</small>
                </div>


                <div>
                    <span
                        class="track-dot rejected-dot"
                    ></span>

                    <b id="rejectedBoard">0</b>

                    <small>Rechazadas</small>
                </div>


                <div
                    class="track-line"
                ></div>

            </div>

        </div>
        `
    );
}


/* =========================================================
   14. DASHBOARD WFM
   ========================================================= */

/*
   Esta función genera gráficos simples utilizando HTML/CSS.

   Actualmente muestra:
   - Solicitudes por usuario.
   - Solicitudes por motivo.
*/
function renderWfmDashboard() {

    /*
       Obtiene las solicitudes almacenadas localmente.
    */
    const tickets =
        JSON.parse(
            localStorage.getItem(
                'turnoClaroRequests'
            ) || '[]'
        );


    /*
       Función interna reutilizable para crear
       barras horizontales.

       Parámetros:

       selector → elemento HTML donde se dibujarán.
       values   → objeto con los datos.
    */
    const renderBars =
        (selector, values) => {

            const element =
                document.querySelector(
                    selector
                );

            if (!element) return;


            /*
               Convierte el objeto a array.

               Luego:
               - Ordena de mayor a menor.
               - Limita a los 6 principales.
            */
            const entries =
                Object.entries(values)
                    .sort(
                        (a, b) =>
                            b[1] - a[1]
                    )
                    .slice(0, 6);


            /*
               Obtiene el valor máximo.

               Se utiliza para calcular
               el porcentaje de ancho de cada barra.
            */
            const maximum =
                Math.max(
                    ...entries.map(
                        ([, value]) => value
                    ),
                    1
                );


            /*
               Genera cada barra.

               Fórmula:

               valor / máximo * 100

               Ejemplo:
               8 / 10 * 100 = 80%
            */
            element.innerHTML =
                entries.map(
                    ([label, value]) => `

                        <div class="bar-row">

                            <span
                                class="bar-label"
                                title="${escapeHtml(label)}"
                            >
                                ${escapeHtml(label)}
                            </span>


                            <span class="bar-track">

                                <span
                                    class="bar-fill"
                                    style="width:${value / maximum * 100}%"
                                ></span>

                            </span>


                            <span class="bar-value">
                                ${value}
                            </span>

                        </div>

                    `
                ).join('')

                ||

                '<p class="chart-empty">Sin solicitudes registradas.</p>';
        };


    /*
       Objetos para almacenar los conteos.
    */
    const byUser = {};
    const byReason = {};


    /*
       Recorre todas las solicitudes.
    */
    tickets.forEach(ticket => {

        /*
           Obtiene el usuario solicitante.
        */
        const user =
            ticket.requester_name
            || 'Usuario registrado';


        /*
           Obtiene el tipo técnico.
        */
        const typeKey =
            (
                ticket.type
                || 'Sin motivo'
            ).trim();


        /*
           Convierte el valor técnico
           al nombre visible.
        */
        const type =
            wfTypes[typeKey]
            || typeKey;


        /*
           Incrementa contador por usuario.
        */
        byUser[user] =
            (byUser[user] || 0) + 1;


        /*
           Incrementa contador por motivo.
        */
        byReason[type] =
            (byReason[type] || 0) + 1;
    });


    /*
       Renderiza ambos gráficos.
    */
    renderBars(
        '#requestsByUser',
        byUser
    );

    renderBars(
        '#requestsByReason',
        byReason
    );
}


/* =========================================================
   15. MOSTRAR/OCULTAR CAMPOS SEGÚN TIPO
   ========================================================= */

/*
   Esta es una de las funciones principales del formulario.

   Su objetivo es mostrar únicamente los campos
   necesarios para cada tipo de solicitud.
*/
function updateTypeFields() {

    const type =
        document.querySelector(
            'input[name="type"]:checked'
        )?.value;

    const period =
        document.querySelector(
            '#periodField'
        );

    const extra =
        document.querySelector(
            '#extraDates'
        );

    const exception =
        document.querySelector(
            '#exceptionField'
        );

    const employeeField =
        document.querySelector(
            '#employee'
        )?.closest('.field');

    const timeFields =
        document.querySelectorAll(
            '.time-field'
        );



    /*
       El bloque del asesor 1 se mantiene dentro
       del campo employee.
    */
    const advisor1 =
        employeeField?.querySelector(
            '.agent-block-primary'
        );


    /*
       Crea el horario actual del asesor 1
       dentro de su propia tarjeta.
    */
    if (
        advisor1 &&
        !advisor1.querySelector('.agent-current-hours')
    ) {

        advisor1.insertAdjacentHTML(
            'beforeend',
            `
            <div class="agent-current-hours">

                <span class="current-hours-title">
                    Horario actual del asesor
                </span>

                <div class="current-hours-grid">

                    <div class="field">
                        <span>Desde</span>
                        <input
                            id="currentStart1"
                            type="time"
                        >
                    </div>

                    <div class="field">
                        <span>Hasta</span>
                        <input
                            id="currentEnd1"
                            type="time"
                        >
                    </div>

                </div>

            </div>
            `
        );
    }


    /*
       Contenedor del segundo asesor.
    */
    let second =
        document.querySelector(
            '#secondAgentField'
        );


    /*
       Si todavía no existe, lo crea debajo
       del bloque del asesor 1.
    */
    if (
        !second &&
        employeeField
    ) {

        second =
            document.createElement('div');

        second.id =
            'secondAgentField';

        second.className =
            'full-field';

        employeeField.appendChild(
            second
        );
    }


    /*
       Genera el asesor 2 únicamente para Enroque.
    */
    if (second) {

        second.innerHTML =
            type === 'swap'

                ? `
                <div class="second-agent-block">

                    <span class="agent-block-title">
                        Asesor 2
                    </span>

                    <div class="field agent-dni-field">

                        <span>
                            DNI del asesor
                        </span>

                        <input
                            id="agentDni2"
                            inputmode="numeric"
                            placeholder="Ej. 1234567890"
                        >

                        <div
                            id="agentData2"
                            class="agent-data"
                            aria-live="polite"
                        >
                            Escribe el DNI del asesor.
                        </div>

                    </div>

                    <div class="agent-current-hours">

                        <span class="current-hours-title">
                            Horario actual del asesor
                        </span>

                        <div class="current-hours-grid">

                            <div class="field">
                                <span>Desde</span>
                                <input
                                    id="currentStart2"
                                    type="time"
                                >
                            </div>

                            <div class="field">
                                <span>Hasta</span>
                                <input
                                    id="currentEnd2"
                                    type="time"
                                >
                            </div>

                        </div>

                    </div>

                </div>
                `

                : '';
    }


    /*
       En Enroque, ambos asesores se presentan
       como dos tarjetas hermanas.
    */
    if (
        employeeField &&
        type === 'swap' &&
        second
    ) {

        let pairGrid =
            employeeField.querySelector(
                '#agentPairGrid'
            );

        if (!pairGrid) {

            pairGrid =
                document.createElement('div');

            pairGrid.id =
                'agentPairGrid';

            pairGrid.className =
                'agent-pair-grid full-field';

            const title =
                document.createElement('div');

            title.className =
                'agent-pair-title';

            title.innerHTML =
                `
                <span class="dynamic-subtitle">
                    Asesores involucrados
                </span>
                `;

            const cards =
                document.createElement('div');

            cards.className =
                'agent-pair-cards';

            pairGrid.appendChild(
                title
            );

            pairGrid.appendChild(
                cards
            );

            employeeField.appendChild(
                pairGrid
            );
        }


        const cards =
            pairGrid.querySelector(
                '.agent-pair-cards'
            );

        const advisor2 =
            second.querySelector(
                '.second-agent-block'
            );


        if (cards && advisor1 && advisor2) {

            cards.innerHTML = '';

            cards.appendChild(
                advisor1
            );

            cards.appendChild(
                advisor2
            );
        }

        second.innerHTML = '';
    }


    /*
       Al salir de Enroque, devolvemos el asesor 1
       a su estructura normal y retiramos el asesor 2.
    */
    if (
        employeeField &&
        type !== 'swap'
    ) {

        const pairGrid =
            employeeField.querySelector(
                '#agentPairGrid'
            );

        if (pairGrid) {

            const cards =
                pairGrid.querySelector(
                    '.agent-pair-cards'
                );

            const advisor =
                cards?.querySelector(
                    '.agent-block-primary'
                );

            if (advisor) {

                employeeField.insertBefore(
                    advisor,
                    pairGrid
                );
            }

            pairGrid.remove();
        }

        if (second) {
            second.innerHTML = '';
        }
    }


    /*
       Horario actual del asesor 1.
    */
    const advisor1Current =
        employeeField?.querySelector(
            '.agent-block-primary .agent-current-hours'
        );

    const visibleCurrentHours =
        [
            'schedule_change',
            'swap',
            'exception'
        ].includes(type);


    if (advisor1Current) {

        advisor1Current.style.display =
            visibleCurrentHours
                ? 'block'
                : 'none';
    }


    /*
       Horario actual del asesor 2.
    */
    const advisor2Current =
        employeeField?.querySelector(
            '#currentStart2'
        )?.closest(
            '.agent-current-hours'
        );

    if (advisor2Current) {

        advisor2Current.style.display =
            type === 'swap'
                ? 'block'
                : 'none';
    }


    /*
       Período.
    */
    if (period) {

        period.style.display =
            type === 'schedule_change'
            || type === 'swap'
                ? 'block'
                : 'none';
    }


    /*
       Fechas adicionales de compensado.
    */
    if (extra) {

        extra.innerHTML =
            type === 'comp_time'

                ? `
                <div class="dynamic-subsection">

                    <span class="dynamic-subtitle">
                        Fechas de compensado
                    </span>

                    <p class="dynamic-help">
                        Puedes registrar hasta 5 fechas en una misma solicitud.
                    </p>

                    <div class="extra-date-list">

                        <label class="field">
                            <span>Fecha adicional 1</span>
                            <input
                                type="date"
                                class="comp-date"
                            >
                        </label>

                        <label class="field">
                            <span>Fecha adicional 2</span>
                            <input
                                type="date"
                                class="comp-date"
                            >
                        </label>

                        <label class="field">
                            <span>Fecha adicional 3</span>
                            <input
                                type="date"
                                class="comp-date"
                            >
                        </label>

                        <label class="field">
                            <span>Fecha adicional 4</span>
                            <input
                                type="date"
                                class="comp-date"
                            >
                        </label>

                    </div>

                </div>
                `

                : '';
    }


    /*
       Excepción.
    */
    if (exception) {

        exception.style.display =
            type === 'exception'
                ? 'block'
                : 'none';
    }


    /*
       Horas del nuevo turno.
    */
    timeFields.forEach(field => {

        const visible =
            type === 'overtime'
            || type === 'schedule_change';

        field.style.display =
            visible
                ? 'block'
                : 'none';

        const input =
            field.querySelector('input');

        if (input) {
            input.required =
                visible;
        }
    });


    /*
       Ayuda para horas extra.
    */
    const timeHelp =
        document.querySelector(
            '#timeHelp'
        );

    if (timeHelp) {

        timeHelp.style.display =
            type === 'overtime'
                ? 'flex'
                : 'none';
    }


    if (window.lucide) {
        lucide.createIcons();
    }
}


document
    .querySelectorAll('input[name="type"]')
    .forEach(input => {

        input.addEventListener(
            'change',
            updateTypeFields
        );
    });


updateTypeFields();


/* =========================================================
   16. PERMISOS DE SOLICITUDES POR ROL
   ========================================================= */

/*
   Esta función consulta API PostgreSQL para determinar
   qué solicitudes puede crear cada rol.
*/
async function applyRequestPermissions() {

    /*
       Obtiene el rol actual.

       Ejemplos:
       coordinator
       supervisor
       wfm
       management
    */
    const role =
        demoRole?.key;


    /*
       Consulta la tabla business_rules.

       Solo obtiene las columnas necesarias
       para los permisos.
    */
    const result =
        await apiClient
            .from('business_rules')
            .select(
                'rule_key,coordinator_allowed,supervisor_allowed'
            );


    /*
       Convierte los registros en un objeto.

       Ejemplo:

       {
           comp_time: {...},
           swap: {...},
           schedule_change: {...}
       }

       Esto permite buscar rápidamente:

       rules[input.value]
    */
    const rules =
        Object.fromEntries(

            (result.data || []).map(
                rule => [
                    rule.rule_key,
                    rule
                ]
            )
        );


    /*
       Recorre todos los tipos disponibles
       en el formulario.
    */
    document
        .querySelectorAll(
            'input[name="type"]'
        )
        .forEach(input => {


            /*
               Busca la regla correspondiente
               al tipo actual.
            */
            const rule =
                rules[input.value];


            /*
               Determina si el usuario tiene permiso.

               Si existe una regla en API PostgreSQL:
               - Coordinador → coordinator_allowed
               - Supervisor → supervisor_allowed
               - Otros → false

               Si no existe regla:
               aplica la lógica por defecto.
            */
            const allowed =
                rule

                    ? role === 'coordinator'

                        ? rule.coordinator_allowed

                        : role === 'supervisor'

                            ? rule.supervisor_allowed

                            : false

                    : input.value === 'comp_time'

                        ? role === 'coordinator'

                        : input.value === 'siop_validation'

                            ? role === 'supervisor'

                            : role === 'coordinator'
                            || role === 'supervisor';


            /*
               Busca el label que contiene
               el radio button.
            */
            const label =
                input.closest('label');


            /*
               Oculta visualmente el tipo
               si el usuario no tiene permiso.
            */
            if (label) {

                label.style.display =
                    allowed
                        ? ''
                        : 'none';
            }


            /*
               También deshabilita el input.

               Esto agrega una segunda capa
               de protección visual.
            */
            input.disabled =
                !allowed;
        });
}

async function loadExceptionSupervisors() {

    const field = document.querySelector('#exceptionSupervisorField');
    const select = document.querySelector('#exceptionSupervisor');

    if (!field || !select) return;

    // Solo mostramos esta opción para coordinadores
    if (demoRole?.key !== 'coordinator') {
        field.style.display = 'none';
        return;
    }

    // Solo mostramos el supervisor cuando el origen sea Supervisor
    const origin = document.querySelector('#errorOrigin')?.value;

    if (origin !== 'supervisor') {
        field.style.display = 'none';
        return;
    }

    field.style.display = 'block';

    const { data: { user } } =
        await apiClient.auth.getUser();

    if (!user) {
        select.innerHTML =
            '<option value="">No se pudo identificar al usuario</option>';
        return;
    }

    const { data, error } = await apiClient
        .from('profiles')
        .select('id, full_name, role, coordinator_id, active')
        .eq('role', 'supervisor')
        .eq('coordinator_id', user.id)
        .order('full_name');

    if (error) {
        console.error(
            'Error cargando supervisores:',
            error
        );

        select.innerHTML =
            '<option value="">Error al cargar supervisores</option>';

        return;
    }

    if (!data || data.length === 0) {
        select.innerHTML =
            '<option value="">No tienes supervisores asignados</option>';

        return;
    }

    select.innerHTML = `
        <option value="">Selecciona un supervisor</option>
        ${data.map(supervisor => `
            <option value="${supervisor.id}">
                ${escapeHtml(supervisor.full_name)}
            </option>
        `).join('')}
    `;
}

document.addEventListener('change', event => {

    if (event.target.id === 'errorOrigin') {
        loadExceptionSupervisors();
    }

});

/* =========================================================
   17. ACTUALIZAR CONTADORES DEL TABLERO
   ========================================================= */

function updateStatusBoard() {

    /*
       La fuente principal de solicitudes es la variable
       global `requests`, cargada desde la API/PostgreSQL.
    */

    const stored =
        Array.isArray(window.requests)
            ? window.requests
            : (
                typeof requests !== 'undefined' && Array.isArray(requests)
                    ? requests
                    : []
            );


    const counters = {

        pending:
            stored.filter(item =>
                item.status === 'pending'
            ).length,

        in_review:
            stored.filter(item =>
                item.status === 'in_review'
            ).length,

        observed:
            stored.filter(item =>
                item.status === 'observed'
            ).length,

        approved:
            stored.filter(item =>
                item.status === 'approved'
            ).length,

        rejected:
            stored.filter(item =>
                item.status === 'rejected'
            ).length
    };


    /*
       Tarjetas principales del dashboard.
    */

    const totalStat =
        document.querySelector('#totalStat');

    const pendingStat =
        document.querySelector('#pendingStat');

    const reviewStat =
        document.querySelector('#reviewStat');

    const observedStat =
        document.querySelector('#observedStat');

    const approvedStat =
        document.querySelector('#approvedStat');

    const rejectedStat =
        document.querySelector('#rejectedStat');


    if (totalStat) {
        totalStat.textContent = stored.length;
    }

    if (pendingStat) {
        pendingStat.textContent = counters.pending;
    }

    if (reviewStat) {
        reviewStat.textContent = counters.in_review;
    }

    if (observedStat) {
        observedStat.textContent = counters.observed;
    }

    if (approvedStat) {
        approvedStat.textContent = counters.approved;
    }

    if (rejectedStat) {
        rejectedStat.textContent = counters.rejected;
    }


    /*
       Tablero compacto de estados.
    */

    const boardIds = {

        pending:
            '#pendingBoard',

        in_review:
            '#in_reviewBoard',

        observed:
            '#observedBoard',

        approved:
            '#approvedBoard',

        rejected:
            '#rejectedBoard'
    };


    Object.entries(boardIds).forEach(
        ([status, selector]) => {

            const target =
                document.querySelector(selector);

            if (target) {
                target.textContent =
                    counters[status] || 0;
            }
        }
    );
}

/* =========================================================
   18. CONSULTA DEL DNI DEL ASESOR 1
   ========================================================= */

/*
   Obtiene el input del DNI.
*/
const agentDni =
    document.querySelector(
        '#agentDni'
    );


if (agentDni) {


    /*
       EVENTO INPUT

       Se ejecuta cada vez que el usuario escribe.

       Su objetivo es limpiar los datos anteriores,
       porque el DNI está cambiando.
    */
    agentDni.addEventListener(
        'input',
        () => {

            const box =
                document.querySelector(
                    '#agentData'
                );

            if (!box) return;


            /*
               Elimina datos guardados anteriormente.
            */
            delete box.dataset.dni;
            delete box.dataset.name;
            delete box.dataset.title;
            delete box.dataset.service;


            /*
               Restablece la apariencia inicial.
            */
            box.className =
                'agent-data';


            box.textContent =
                'Escribe el DNI completo para consultar la dotación.';
        }
    );


    /*
       EVENTO BLUR

       Se ejecuta cuando el usuario sale del campo.

       Aquí se realiza la consulta real
       a API PostgreSQL.
    */
    agentDni.addEventListener(
        'blur',
        async () => {


            /*
               Obtiene y limpia el DNI.
            */
            const dni =
                agentDni.value.trim();


            const box =
                document.querySelector(
                    '#agentData'
                );

            if (!box) return;


            /*
               Si no hay DNI,
               muestra mensaje y termina.
            */
            if (!dni) {

                delete box.dataset.dni;

                box.textContent =
                    'Escribe un DNI.';

                return;
            }


            /*
               CONSULTA A POSTGRESQL

               Busca en la tabla "dotacion"
               una persona que cumpla:

               dni = DNI ingresado
               active = true

               maybeSingle() indica que esperamos
               máximo un registro.
            */
            const {
                data,
                error
            } =
                await apiClient
                    .from('dotacion')
                    .select(
                        'dni,full_name,job_title,service'
                    )
                    .eq(
                        'dni',
                        dni
                    )
                    .eq(
                        'active',
                        true
                    )
                    .maybeSingle();


            /*
               Si ocurrió un error
               o no se encontró al asesor.
            */
            if (error || !data) {

                delete box.dataset.dni;

                box.className =
                    'agent-data invalid';

                box.textContent =
                    'No encontramos ese DNI en la dotación.';

                return;
            }


            /*
               Si se encontró correctamente:

               Guarda información en atributos dataset.

               Esto permite reutilizar la información
               posteriormente sin hacer otra consulta.
            */
            box.className =
                'agent-data valid';

            box.dataset.dni =
                data.dni;

            box.dataset.name =
                data.full_name;

            box.dataset.title =
                data.job_title;

            box.dataset.service =
                data.service;


            /*
               Muestra visualmente la información.
            */
            box.innerHTML = `
                <strong>
                    ${escapeHtml(data.full_name)}
                </strong>

                <span>
                    ${escapeHtml(data.job_title)}
                    ·
                    ${escapeHtml(data.service)}
                </span>
            `;
        }
    );
}


/* =========================================================
   19. CONSULTA DNI DEL SEGUNDO ASESOR
   ========================================================= */

/*
   Se utiliza document.addEventListener porque
   #agentDni2 se crea dinámicamente.

   Por eso no podemos simplemente hacer:

   document.querySelector('#agentDni2')

   al inicio, porque en ese momento puede no existir.
*/
document.addEventListener(
    'blur',
    async event => {


        /*
           Solo continúa si el elemento que perdió
           el foco es agentDni2.
        */
        if (
            event.target.id !== 'agentDni2'
        ) {
            return;
        }


        const box =
            document.querySelector(
                '#agentData2'
            );

        if (!box) return;


        /*
           Obtiene el DNI ingresado.
        */
        const dni =
            event.target.value.trim();


        /*
           Limpia un DNI anterior almacenado.
        */
        delete box.dataset.dni;


        /*
           Si está vacío,
           muestra mensaje.
        */
        if (!dni) {

            box.textContent =
                'Escribe el DNI del segundo asesor.';

            return;
        }


        /*
           Consulta API PostgreSQL utilizando
           el DNI del segundo asesor.
        */
        const {
            data,
            error
        } =
            await apiClient
                .from('dotacion')
                .select(
                    'dni,full_name,job_title,service'
                )
                .eq(
                    'dni',
                    dni
                )
                .eq(
                    'active',
                    true
                )
                .maybeSingle();


        /*
           Si no se encontró.
        */
        if (error || !data) {

            box.className =
                'agent-data invalid';

            box.textContent =
                'No encontramos ese DNI en la dotación.';

            return;
        }


        /*
           Si se encontró correctamente.
        */
        box.className =
            'agent-data valid';

        box.dataset.dni =
            data.dni;


        /*
           Muestra nombre, cargo y servicio.
        */
        box.innerHTML = `
            <strong>
                ${escapeHtml(data.full_name)}
            </strong>

            <span>
                ${escapeHtml(data.job_title)}
                ·
                ${escapeHtml(data.service)}
            </span>
        `;
    },

    /*
       capture: true permite capturar el evento blur
       porque normalmente blur no hace bubbling.
    */
    { capture: true }
);


/* =========================================================
   20. CORREGIR ETIQUETAS EN LA TABLA
   ========================================================= */

/*
   Esta función busca las filas de solicitudes
   y reemplaza el nombre técnico del tipo
   por el nombre visible.
*/
function fixTableLabels() {

    document
        .querySelectorAll(
            '#requestsTable tr'
        )
        .forEach(row => {


            /*
               Obtiene el ID mostrado en <strong>.
            */
            const id =
                row.querySelector('strong')
                    ?.textContent;


            if (!id) return;


            /*
               Busca la solicitud correspondiente
               dentro del localStorage.
            */
            const item =
                JSON.parse(
                    localStorage.getItem(
                        'turnoClaroRequests'
                    ) || '[]'
                ).find(
                    request =>
                        request.id === id
                );


            /*
               Busca el elemento pequeño
               donde se muestra el tipo.
            */
            const label =
                row.querySelector(
                    'td small'
                );


            /*
               Si existe la solicitud y la etiqueta,
               muestra el nombre amigable.
            */
            if (item && label) {

                label.textContent =
                    wfTypes[item.type]
                    || item.type;
            }
        });
}


/* =========================================================
   21. CONFIGURACIÓN DE ROLES
   ========================================================= */

/*
   Array que define los roles disponibles.

   IMPORTANTE:

   Actualmente estos son roles DEMO para controlar
   visualmente permisos dentro de la aplicación.

   key:
   → Identificador interno.

   name:
   → Nombre visible del rol.

   person:
   → Nombre de demostración.

   canReview:
   → Define si puede aprobar/rechazar solicitudes.
*/
const demoRoles = [

    {
        key: 'coordinator',
        name: 'Coordinador',
        person: 'Laura Méndez',
        canReview: false
    },

    {
        key: 'supervisor',
        name: 'Supervisor',
        person: 'Andrés Ríos',
        canReview: false
    },

    {
        key: 'wfm',
        name: 'WFM',
        person: 'María Salas',
        canReview: true
    },

    {
        key: 'management',
        name: 'Gerencia',
        person: 'Jorge Pérez',
        canReview: false
    },

    {
        key: 'superadmin',
        name: 'Superadministrador',
        person: 'Administrador',
        canReview: true
    }
];


/* =========================================================
   22. GENERAR INICIALES AUTOMÁTICAMENTE
   ========================================================= */

/*
   Esta función recibe un nombre y genera
   las iniciales automáticamente.

   Ejemplos:

   "Laura Méndez"
   → LM

   "Andrés Ríos"
   → AR

   "María Salas"
   → MS
*/
function getInitials(name) {


    /*
       Protección:
       Si el nombre está vacío o es null,
       devuelve texto vacío.
    */
    if (!name) return '';


    /*
       Paso a paso:

       trim()
       → Elimina espacios al inicio y final.

       split(/\s+/)
       → Divide el nombre por espacios.

       map(word => word[0])
       → Obtiene la primera letra de cada palabra.

       join('')
       → Une las letras.

       substring(0, 2)
       → Mantiene máximo dos caracteres.

       toUpperCase()
       → Convierte a mayúsculas.
    */
    return name
        .trim()
        .split(/\s+/)
        .map(
            word => word[0]
        )
        .join('')
        .substring(0, 2)
        .toUpperCase();
}


/* =========================================================
   23. OBTENER EL ROL ACTIVO
   ========================================================= */

/*
   Busca en localStorage el último rol seleccionado.

   Si existe:
   → Recupera ese rol.

   Si no existe:
   → Utiliza el primer rol del array.
*/
let demoRole =
    demoRoles.find(
        role =>
            role.key ===
            localStorage.getItem(
                'turnoClaroDemoRole'
            )
    )
    ||
    demoRoles[0];


/* =========================================================
   24. CAMBIAR ROL
   ========================================================= */

/*
   Esta función se ejecuta cuando se desea
   cambiar el rol activo.
*/
function setDemoRole(roleKey) {


    /*
       Busca el rol solicitado.
    */
    const role =
        demoRoles.find(
            item =>
                item.key === roleKey
        );


    /*
       Si el rol no existe,
       termina.
    */
    if (!role) return;


    /*
       Actualiza la variable global.
    */
    demoRole =
        role;


    /*
       Guarda el rol seleccionado
       para mantenerlo incluso si se recarga
       la página.
    */
    localStorage.setItem(
        'turnoClaroDemoRole',
        role.key
    );


    /*
       Actualiza toda la interfaz
       según el nuevo rol.
    */
    applyDemoRole();
}


/* =========================================================
   25. APLICAR CONFIGURACIÓN DEL ROL
   ========================================================= */

/*
   Esta función controla gran parte de la interfaz
   dependiendo del rol activo.

   Actualiza:
   - Avatar.
   - Nombre.
   - Cargo.
   - Menús.
   - Botones.
   - Dashboard.
   - Permisos.
*/
function applyDemoRole() {


    /*
       Busca el botón/perfil del usuario.
    */
    const roleButton =
        document.querySelector(
            '#roleToggle'
        );


    /*
       Si no existe, evita error.
    */
    if (!roleButton) return;


    /*
       Obtiene el nombre real guardado.

       Prioridad:

       1. turnoClaroProfileName
       2. Nombre demo del rol

       Esto permite que cuando exista
       un usuario real, sus datos
       tengan prioridad sobre el demo.
    */
    const profileName =
        localStorage.getItem(
            'turnoClaroProfileName'
        )
        ||
        demoRole.person;


    /*
       Obtiene referencias internas
       del botón de perfil.
    */
    const avatar =
        roleButton.querySelector(
            '.avatar'
        );

    const strong =
        roleButton.querySelector(
            'strong'
        );

    const small =
        roleButton.querySelector(
            'small'
        );


    /*
       Genera automáticamente las iniciales.

       Ejemplo:

       Carlos Ramírez
       ↓
       CR
    */
    if (avatar) {

        avatar.textContent =
            getInitials(profileName);
    }


    /*
       Muestra el nombre completo.
    */
    if (strong) {

        strong.textContent =
            profileName;
    }


    /*
       Muestra el nombre del rol.
    */
    if (small) {

        small.textContent =
            demoRole.name;
    }


    /* -----------------------------------------------------
       VISTAS WFM
       -----------------------------------------------------

       Los elementos con:

       data-view="wf"

       solo se muestran si el usuario puede revisar.
    */
    document
        .querySelectorAll(
            '[data-view="wf"]'
        )
        .forEach(item => {

            item.style.display =
                demoRole.canReview
                    ? 'flex'
                    : 'none';
        });


    /* -----------------------------------------------------
       BOTONES DE REVISIÓN
       -----------------------------------------------------

       Solo usuarios con canReview = true
       pueden visualizar botones de revisión.
    */
    document
        .querySelectorAll(
            '.review-button,.wf-review'
        )
        .forEach(item => {

            item.style.display =
                demoRole.canReview
                    ? 'flex'
                    : 'none';
        });


    /* -----------------------------------------------------
       BOTÓN NUEVA SOLICITUD
       -----------------------------------------------------

       Los revisores no crean solicitudes,
       por eso se oculta para WFM/Gerencia.
    */
    document
        .querySelectorAll(
            '[data-view="new"]'
        )
        .forEach(item => {

            item.style.display =
                demoRole.canReview
                    ? 'none'
                    : 'inline-flex';
        });


    /* -----------------------------------------------------
       BOTÓN EXPORTAR
       -----------------------------------------------------

       Solo roles con capacidad de revisión
       pueden exportar solicitudes.
    */
    const exportButton =
        document.querySelector(
            '#exportTickets'
        );

    if (exportButton) {

        exportButton.style.display =
            demoRole.canReview
                ? 'flex'
                : 'none';
    }


    /* -----------------------------------------------------
       EDITOR DE REGLAS
       -----------------------------------------------------

       Solo WFM puede modificar reglas operativas.
    */
    const rulesEditor =
        document.querySelector(
            '#rulesEditor'
        );

    if (rulesEditor) {

        rulesEditor.style.display =
            ['wfm', 'superadmin'].includes(demoRole.key)
                ? 'block'
                : 'none';
    }


    /* -----------------------------------------------------
       DASHBOARD WFM
       -----------------------------------------------------

       Actualmente solo WFM visualiza
       el dashboard específico.
    */
    const wfmDashboard =
        document.querySelector(
            '#wfmDashboard'
        );

    if (wfmDashboard) {

        wfmDashboard.style.display =
            ['wfm', 'superadmin'].includes(demoRole.key)
                ? 'block'
                : 'none';
    }


    /* -----------------------------------------------------
       ESTADO DEL PORTAL
       ----------------------------------------------------- */

    const liveStatus =
        document.querySelector(
            '.live-status'
        );

    if (liveStatus) {

        liveStatus.innerHTML =
            `<span></span> ${demoRole.name} · portal activo`;
    }


    /*
       Finalmente actualiza los permisos
       de los tipos de solicitudes.
    */
    applyRequestPermissions();
}


/* =========================================================
   26. AGREGAR BOTÓN "VER DETALLE" A LA TABLA
   ========================================================= */

function enhanceRequestDetails() {

    /*
       Recorre todas las filas.
    */
    document
        .querySelectorAll(
            '#requestsTable tr'
        )
        .forEach(row => {


            /*
               Obtiene el ID de la solicitud.
            */
            const id =
                row.querySelector('strong')
                    ?.textContent;


            /*
               Si no hay ID
               o ya existe un botón,
               no hace nada.
            */
            if (
                !id
                ||
                row.querySelector(
                    '.detail-button'
                )
            ) {
                return;
            }


            /*
               Crea un nuevo botón.
            */
            const button =
                document.createElement(
                    'button'
                );


            button.className =
                'text-button detail-button';


            /*
               Guarda el ID dentro de data-id.
            */
            button.dataset.id =
                id;


            button.innerHTML =
                `
                Ver detalle
                <i data-lucide="arrow-right"></i>
                `;


            /*
               Reemplaza el contenido
               de la última celda por el botón.
            */
            row.lastElementChild
                ?.replaceChildren(button);


            /*
               Al hacer click abre el modal.
            */
            button.addEventListener(
                'click',
                () =>
                    window.openReview?.(id)
            );
        });


}


/* =========================================================
   27. INICIALIZACIÓN DEL SISTEMA
   ========================================================= */

/*
   Estas funciones se ejecutan una vez
   cuando carga el JavaScript.
*/


/* Crea el tablero visual de estados. */
renderStatusBoard();


/* Renderiza las tarjetas del panel WFM. */
renderWF();


/* Renderiza gráficos del dashboard WFM. */
renderWfmDashboard();


/* Actualiza los contadores. */
updateStatusBoard();


/* Corrige nombres técnicos de tipos. */
fixTableLabels();


/* Aplica permisos y configuración del rol. */
applyDemoRole();


/* =========================================================
   28. ACTUALIZACIÓN PERIÓDICA
   ========================================================= */

/*
   Cada 1 segundo actualiza visualmente:

   - Panel WFM.
   - Dashboard.
   - Contadores.
   - Etiquetas.
   - Botones de detalle.

   NOTA:
   Este intervalo actualmente NO llama a applyDemoRole(),
   lo cual evita consultar API PostgreSQL cada segundo
   mediante applyRequestPermissions().
*/
setInterval(() => {

    renderWF();

    renderWfmDashboard();

    updateStatusBoard();

    fixTableLabels();

    enhanceRequestDetails();

}, 5000);


/* =========================================================
   29. CONFIGURACIÓN DE REGLAS POR WFM
   ========================================================= */

/*
   Esta función controla el panel donde WFM
   configura reglas operativas.
*/
function bindStaticRules() {


    /*
       Panel que contiene las reglas.
    */
    const panel =
        document.querySelector(
            '#rulesEditor'
        );


    /*
       Botón para guardar.
    */
    const button =
        document.querySelector(
            '#saveStaticRules'
        );


    /*
       Validaciones:

       - Si no existe panel.
       - Si no existe botón.
       - Si ya se asignó el evento.

       Entonces termina.
    */
    if (
        !panel
        ||
        !button
        ||
        button.dataset.bound
    ) {
        return;
    }


    /*
       Marca el botón para evitar
       registrar múltiples listeners.
    */
    button.dataset.bound =
        'true';


    /*
       Crea una función global para recargar
       las reglas desde API PostgreSQL.
    */
    window.refreshStaticRules =
        () =>
            apiClient
                .from('business_rules')
                .select('*')
                .then(({ data }) => {


                    /*
                       Recorre cada regla obtenida.
                    */
                    (data || []).forEach(
                        rule => {


                            /*
                               Busca la fila HTML
                               correspondiente a esa regla.
                            */
                            const row =
                                panel.querySelector(
                                    `[data-rule-key="${rule.rule_key}"]`
                                );


                            if (!row) return;


                            /*
                               Obtiene campo de horas mínimas.
                            */
                            const minAdvance =
                                row.querySelector(
                                    '[data-rule-prop="min_advance_hours"]'
                                );


                            /*
                               Obtiene campo de hora límite.
                            */
                            const cutoff =
                                row.querySelector(
                                    '[data-rule-prop="same_day_cutoff"]'
                                );


                            /*
                               Inserta valores actuales.
                            */
                            if (minAdvance) {

                                minAdvance.value =
                                    rule.min_advance_hours
                                    || 0;
                            }


                            if (cutoff) {

                                cutoff.value =
                                    rule.same_day_cutoff
                                    || '';
                            }


                            /*
                               Actualiza checkboxes.
                            */
                            [
                                'requires_evidence',
                                'coordinator_allowed',
                                'supervisor_allowed'
                            ].forEach(prop => {


                                const checkbox =
                                    row.querySelector(
                                        `[data-rule-prop="${prop}"]`
                                    );


                                if (checkbox) {

                                    checkbox.checked =
                                        Boolean(
                                            rule[prop]
                                        );
                                }
                            });
                        }
                    );
                });


    /*
       Carga reglas al iniciar.
    */
    window.refreshStaticRules();


    /*
       Evento del botón Guardar.
    */
    button.addEventListener(
        'click',
        async () => {


            /*
               Obtiene usuario autenticado.
            */
            const {
                data: { user }
            } =
                await apiClient
                    .auth
                    .getUser();


            /*
               Convierte cada fila visual
               en un objeto preparado
               para guardar en API PostgreSQL.
            */
            const rows =
                [
                    ...panel.querySelectorAll(
                        '.static-rule-row'
                    )
                ].map(row => ({

                    /*
                       Identificador único.
                    */
                    rule_key:
                        row.dataset.ruleKey,


                    /*
                       Nombre visible.
                    */
                    title:
                        row.querySelector(
                            'strong'
                        ).textContent,


                    /*
                       Descripción generada.
                    */
                    description:
                        `Regla configurada por WFM para ${row.querySelector(
                            'strong'
                        ).textContent
                        }.`,


                    /*
                       Horas mínimas de anticipación.
                    */
                    min_advance_hours:
                        Number(
                            row.querySelector(
                                '[data-rule-prop="min_advance_hours"]'
                            ).value
                        ),


                    /*
                       Hora límite para solicitudes
                       del mismo día.
                    */
                    same_day_cutoff:
                        row.querySelector(
                            '[data-rule-prop="same_day_cutoff"]'
                        ).value
                        || null,


                    /*
                       Define si requiere evidencia.
                    */
                    requires_evidence:
                        row.querySelector(
                            '[data-rule-prop="requires_evidence"]'
                        ).checked,


                    /*
                       Permiso del coordinador.
                    */
                    coordinator_allowed:
                        row.querySelector(
                            '[data-rule-prop="coordinator_allowed"]'
                        ).checked,


                    /*
                       Permiso del supervisor.
                    */
                    supervisor_allowed:
                        row.querySelector(
                            '[data-rule-prop="supervisor_allowed"]'
                        ).checked,


                    /*
                       Guarda quién realizó
                       la última modificación.
                    */
                    updated_by:
                        user?.id
                }));


            /*
               UPSERT:

               - Si la regla existe → UPDATE.
               - Si no existe → INSERT.

               onConflict: rule_key
               indica cuál es la clave única.
            */
            const result =
                await apiClient
                    .from('business_rules')
                    .upsert(
                        rows,
                        {
                            onConflict:
                                'rule_key'
                        }
                    );


            /*
               Busca el área donde se muestra
               el resultado del guardado.
            */
            const message =
                document.querySelector(
                    '#staticRulesMessage'
                );


            if (message) {

                message.textContent =
                    result.error

                        ? `No se pudo guardar: ${result.error.message}`

                        : 'Configuración guardada correctamente.';
            }
        }
    );
}


/*
   Inicializa el editor de reglas.
*/
bindStaticRules();


/* =========================================================
   30. ABRIR MODAL DE REVISIÓN
   ========================================================= */

/*
   Función global para abrir
   el detalle de una solicitud.
*/
window.openReview =
    async id => {


        /*
           Busca la solicitud utilizando su ID.
        */
        const item =
            JSON.parse(
                localStorage.getItem(
                    'turnoClaroRequests'
                ) || '[]'
            ).find(
                request =>
                    request.id === id
            );


        if (!item) return;


        /*
           Busca el modal.
        */
        const modal =
            document.querySelector(
                '#reviewModal'
            );


        if (!modal) return;


        /*
           Abre el modal agregando
           la clase "open".
        */
        modal.classList.add(
            'open'
        );


        /*
           Obtiene el título.
        */
        const title =
            document.querySelector(
                '#reviewTitle'
            );


        /*
           Muestra:

           TC-001 · Cambio de horario
        */
        if (title) {

            title.textContent =
                `${item.id} · ${wfTypes[item.type]
                || item.type
                }`;
        }


        /*
           Busca el contenedor de metadatos.
        */
        const meta =
            document.querySelector(
                '#reviewMeta'
            );


        /*
           Muestra información completa
           del asesor y solicitud.
        */
        if (meta) {

            meta.innerHTML = `

                <span>
                    Agente:
                    <b>${escapeHtml(item.employee)}</b>
                </span>

                <span>
                    DNI:
                    <b>
                        ${escapeHtml(item.employee_dni)
                || 'No registrado'
                }
                    </b>
                </span>

                <span>
                    Cargo:
                    <b>
                        ${escapeHtml(item.employee_job_title)
                || 'No registrado'
                }
                    </b>
                </span>

                <span>
                    Servicio:
                    <b>
                        ${escapeHtml(item.employee_service)
                || 'No registrado'
                }
                    </b>
                </span>

                <span>
                    Día:
                    <b>${item.date}</b>
                </span>

                <span>
                    Estado:
                    <b>${item.status}</b>
                </span>
            `;
        }


/*
   Evidencias del ticket.

   La evidencia original se encuentra en
   requests.evidence_path.

   Las evidencias adicionales se consultan
   desde evidence_uploads mediante request_id.
*/
let evidenceItems = [];


/*
   Mantiene visible la evidencia original.
*/
if (item.evidence_path) {

    evidenceItems.push({
        path:
            item.evidence_path,

        original_name:
            'Evidencia original',

        created_at:
            item.created_at || null
    });

}


/*
   Consulta todas las evidencias asociadas
   al ticket.
*/
try {

    const evidenceResponse =
        await fetch(
            `/api/evidence?request_id=${encodeURIComponent(item.id)}`,
            {
                method:
                    'GET',

                credentials:
                    'same-origin'
            }
        );


    const evidenceResult =
        await evidenceResponse.json();


    if (
        evidenceResponse.ok
        &&
        Array.isArray(
            evidenceResult.data
        )
    ) {

        evidenceResult.data.forEach(
            uploaded => {

                /*
                   Evita duplicar la evidencia
                   original si ya está asociada.
                */
                if (
                    !evidenceItems.some(
                        evidence =>
                            evidence.path ===
                            uploaded.path
                    )
                ) {

                    evidenceItems.push(
                        uploaded
                    );

                }

            }
        );

    }

} catch (error) {

    console.warn(
        'No se pudieron consultar todas las evidencias:',
        error
    );

}


/*
   Construye visualmente la lista.
*/
let evidence =
    'Sin evidencia adjunta';


if (evidenceItems.length) {

    evidence = `
        <div class="evidence-list">

            ${evidenceItems.map(
                (evidenceItem, index) => {

                    const evidenceUrl =
                        `/api/evidence?path=${encodeURIComponent(
                            evidenceItem.path
                        )}`;


                    const fileName =
                        escapeHtml(
                            evidenceItem.original_name
                            ||
                            `Evidencia ${index + 1}`
                        );


                    let createdAt =
                        '';


                    if (
                        evidenceItem.created_at
                    ) {

                        const parsedDate =
                            new Date(
                                evidenceItem.created_at
                            );


                        if (
                            !Number.isNaN(
                                parsedDate.getTime()
                            )
                        ) {

                            createdAt =
                                new Intl.DateTimeFormat(
                                    'es-PE',
                                    {
                                        day:
                                            '2-digit',

                                        month:
                                            '2-digit',

                                        year:
                                            'numeric',

                                        hour:
                                            '2-digit',

                                        minute:
                                            '2-digit'
                                    }
                                ).format(
                                    parsedDate
                                );

                        }

                    }


                    return `
                        <div class="evidence-item">

                            <div class="evidence-icon">
                                📎
                            </div>

                            <div class="evidence-info">

                                <a
                                    href="${evidenceUrl}"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="evidence-link"
                                >
                                    ${fileName}
                                </a>

                                ${
                                    createdAt
                                    ? `
                                        <small>
                                            ${createdAt}
                                        </small>
                                      `
                                    : ''
                                }

                            </div>

                        </div>
                    `;

                }
            ).join('')}

        </div>
    `;

}


        /*
           Busca el cuerpo principal del modal.
        */
        const reviewBody =
            document.querySelector(
                '#reviewBody'
            );


        /*
           Inserta:
           - Motivo.
           - Horas.
           - Evidencia.
        */
        if (reviewBody) {

            /*
               ui-final.js construye la vista
               compacta de resumen y conversación.
               Aquí no se debe pintar contenido
               duplicado.
            */

            reviewBody.innerHTML = '';
        }


        /*
           Busca el campo donde WFM escribe
           su comentario.
        */
        const comment =
            document.querySelector(
                '#reviewComment'
            );


        /*
           Si ya existía un comentario,
           lo carga.
        */
        if (comment) {

            comment.value =
                item.review_comment
                || '';
        }


        /*
           Guarda el ID de la solicitud
           directamente en el modal.

           Esto permite saber posteriormente
           qué solicitud se está revisando.
        */
        modal.dataset.id =
            id;
    };


/* =========================================================
   31. CERRAR MODAL
   ========================================================= */

/*
   Busca botón de cerrar.
*/
const closeReview =
    document.querySelector(
        '#closeReview'
    );


if (closeReview) {

    closeReview.addEventListener(
        'click',
        () => {

            /*
               Elimina la clase open
               y cierra el modal.
            */
            document
                .querySelector(
                    '#reviewModal'
                )
                ?.classList.remove(
                    'open'
                );
        }
    );
}


/* =========================================================
   32. APROBAR / RECHAZAR SOLICITUD
   ========================================================= */

/*
   Busca todos los botones de acción.

   Ejemplo:

   data-status="approved"
   data-status="rejected"
*/

document
    .querySelectorAll('.review-action')
    .forEach(button => {

        button.addEventListener(
            'click',
            async () => {

                const modal =
                    document.querySelector('#reviewModal');

                const id =
                    modal?.dataset.id;

                const dbId =
                    id?.replace('TC-', '');

                const status =
                    button.dataset.status;

                const comment =
                    document
                        .querySelector('#reviewComment')
                        ?.value
                        .trim()
                    || '';

                const currentRole =
                    demoRole?.key;

                const isRequester =
                    ['coordinator', 'supervisor']
                        .includes(currentRole);

                /*
                 * El comentario es obligatorio cuando:
                 *
                 * - Supervisor/Coordinador responde una observación.
                 * - WFM/Superadmin observa, aprueba o rechaza.
                 *
                 * Al pasar de Pendiente → En revisión,
                 * el comentario es opcional.
                 */
                const commentRequired =
                    isRequester
                        || ['observed', 'approved', 'rejected'].includes(status);

                if (commentRequired && !comment) {

                    alert(
                        isRequester
                            ? 'Escribe tu respuesta antes de enviar.'
                            : 'Escribe una respuesta de WFM antes de guardar.'
                    );

                    return;
                }

                const {
                    data: { user }
                } =
                    await apiClient
                        .auth
                        .getUser();

                if (!user) {

                    alert(
                        'No se pudo identificar al usuario actual.'
                    );

                    return;
                }

                /*
                 * ==========================================
                 * EVIDENCIA ADICIONAL
                 * ==========================================
                 *
                 * Solo se utiliza cuando Supervisor/
                 * Coordinador responde una observación.
                 */
                let evidencePath = '';

                const evidenceInput =
                    document.querySelector('#reviewEvidence');

                const file =
                    evidenceInput?.files?.[0];

                if (
                    isRequester
                    && status === 'in_review'
                    && file
                ) {

                    try {

                        const safeName =
                            file.name
                                .replace(
                                    /[^a-zA-Z0-9._-]/g,
                                    '_'
                                )
                                .slice(
                                    0,
                                    180
                                );

                        const uniqueName =
                            `${Date.now()}-${safeName}`;

                        evidencePath =
                            `${user.id}/${uniqueName}`;

                        const formData =
                            new FormData();

                        formData.append(
                            'file',
                            file
                        );

                        formData.append(
                            'path',
                            evidencePath
                        );

                        const uploadResponse =
                            await fetch(
                                '/api/evidence',
                                {
                                    method: 'POST',
                                    body: formData,
                                    credentials: 'same-origin'
                                }
                            );

                        const uploadResult =
                            await uploadResponse
                                .json();

                        if (
                            !uploadResponse.ok
                            || !uploadResult.data?.path
                        ) {

                            throw new Error(
                                uploadResult.error
                                || 'No se pudo cargar la evidencia.'
                            );
                        }

                        evidencePath =
                            uploadResult.data.path;

                    } catch (error) {

                        alert(
                            `No se pudo cargar la evidencia: ${error.message}`
                        );

                        return;
                    }
                }

                /*
                 * ==========================================
                 * ACTUALIZAR SOLICITUD
                 * ==========================================
                 *
                 * El backend decide si la transición
                 * realmente está permitida.
                 */
                const update =
                    await apiClient
                        .from('requests')
                        .update({

                            status,

                            review_comment:
                                comment,

                            reviewed_by:
                                user.id,

                            reviewed_at:
                                new Date().toISOString(),

                            evidence_path:
                                evidencePath || null

                        })
                        .eq(
                            'id',
                            dbId
                        );

                if (update.error) {

                    alert(
                        `No se pudo actualizar: ${update.error.message}`
                    );

                    return;
                }

                /*
                 * Actualiza la copia local.
                 */
                const list =
                    JSON.parse(
                        localStorage.getItem(
                            'turnoClaroRequests'
                        ) || '[]'
                    );

                const item =
                    list.find(
                        request =>
                            request.id === id
                    );

                if (item) {

                    item.status =
                        status;

                    /*
                     * Para respuestas de Supervisor/
                     * Coordinador mantenemos la observación
                     * original de WF.
                     */
                    if (!isRequester) {

                        item.review_comment =
                            comment;
                    }

                    localStorage.setItem(
                        'turnoClaroRequests',
                        JSON.stringify(list)
                    );
                }

                /*
                 * Limpia el archivo seleccionado.
                 */
                if (evidenceInput) {
                    evidenceInput.value = '';
                }

                /*
                 * Cierra modal.
                 */
                modal?.classList.remove(
                    'open'
                );

                /*
                 * Refresca las vistas existentes.
                 */
                renderWF();

                if (
                    typeof renderVisibleTickets === 'function'
                ) {
                    renderVisibleTickets();
                }

                alert(
                    isRequester
                        ? 'Respuesta enviada correctamente.'
                        : 'Revisión guardada.'
                );
            }
        );
    });

/* =========================================================
   33. CONFIGURAR ACCIONES DEL MODAL SEGÚN ROL
   ========================================================= */

/*
   Esta función NO abre ni construye el modal.

   ui-final.js es responsable de mostrar el detalle.
   Aquí solamente configuramos:

   - botones disponibles;
   - comentario;
   - evidencia;
   - según rol y estado.
*/
window.configureReviewActions =
    id => {

        const item =
            JSON.parse(
                localStorage.getItem(
                    'turnoClaroRequests'
                ) || '[]'
            ).find(
                request =>
                    request.id === id
            );

        if (!item) return;

        const currentRole =
            demoRole?.key;

        const currentUserId =
            localStorage.getItem(
                'turnoClaroUserId'
            );

        const isRequester =
            ['coordinator', 'supervisor']
                .includes(currentRole);

        const isOwner =
            String(item.requester_id || '') ===
            String(currentUserId || '');

        const canRequesterIntervene =
            isRequester && isOwner;

        const canReview =
            ['wfm', 'superadmin']
                .includes(currentRole);

        const status =
            item.status;

        /*
           Ocultar todos los botones primero.
        */
        const actions =
            document.querySelectorAll(
                '.review-action'
            );

        actions.forEach(button => {
            button.style.display = 'none';
        });

        /*
           WFM / SUPERADMIN

           PENDIENTE
           → En revisión

           EN REVISIÓN
           → Observar
           → Aprobar
           → Rechazar
        */
        if (canReview) {

            if (status === 'pending') {

                const startButton =
                    document.querySelector(
                        '.review-action[data-status="in_review"]'
                    );

                if (startButton) {
                    startButton.style.display =
                        'inline-block';

                    startButton.textContent =
                        'En revisión';
                }
            }

            if (status === 'in_review') {

                [
                    'observed',
                    'approved',
                    'rejected'
                ].forEach(targetStatus => {

                    const button =
                        document.querySelector(
                            `.review-action[data-status="${targetStatus}"]`
                        );

                    if (button) {
                        button.style.display =
                            'inline-block';
                    }
                });
            }
        }

        /*
           SUPERVISOR / COORDINADOR

           Solo pueden responder una solicitud
           OBSERVADA que les pertenece.

           observed
           → En revisión

           Un coordinador que consulta un ticket ajeno
           queda en modo solo lectura.
        */
        if (
            canRequesterIntervene
            && status === 'observed'
        ) {

            const responseButton =
                document.querySelector(
                    '.review-action[data-status="in_review"]'
                );

            if (responseButton) {

                responseButton.style.display =
                    'inline-block';

                responseButton.textContent =
                    'Responder · En revisión';
            }
        }

        /*
           Campo de comentario.
        */
        const reviewComment =
            document.querySelector(
                '#reviewComment'
            );

        const reviewCommentField =
            document.querySelector(
                '#reviewCommentField'
            );

        /*
           Campo de evidencia.

           Solo Supervisor/Coordinador propietario
           al responder una observación.
        */
        const reviewEvidenceField =
            document.querySelector(
                '#reviewEvidenceField'
            );

        const showComment =
            (
                canReview
                && (
                    status === 'pending'
                    || status === 'in_review'
                )
            )
            || (
                canRequesterIntervene
                && status === 'observed'
            );

        if (reviewCommentField) {
            reviewCommentField.style.display =
                showComment
                    ? 'block'
                    : 'none';
        }

        const reviewCommentLabel =
            document.querySelector(
                '#reviewCommentLabel'
            );

        if (reviewCommentLabel) {
            reviewCommentLabel.textContent =
                canRequesterIntervene
                    ? 'Respuesta a la observación'
                    : 'Respuesta de WFM';
        }

        if (
            reviewComment
            && !showComment
        ) {
            reviewComment.value = '';
        }

        const showEvidence =
            canRequesterIntervene
            && status === 'observed';

        if (reviewEvidenceField) {
            reviewEvidenceField.style.display =
                showEvidence
                    ? 'block'
                    : 'none';
        }
    };
