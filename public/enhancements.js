
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
        <span>DNI del asesor 1</span>

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
   9. MENSAJES DE POLÍTICAS SEGÚN TIPO DE SOLICITUD
   ========================================================= */

/*
   Busca el <span> interno donde se mostrará
   el mensaje de política.
*/
const policyText =
    document.querySelector('#policyAlert span');


/*
   Esta función actualiza el mensaje de política.

   Se ejecuta cada vez que el usuario cambia
   el tipo de solicitud.
*/
const updatePolicy = () => {

    /*
       Obtiene el tipo de solicitud seleccionado.

       Ejemplos:
       - comp_time
       - siop_validation
       - schedule_change
    */
    const type =
        document.querySelector(
            'input[name="type"]:checked'
        )?.value;


    /*
       Objeto que relaciona cada tipo de solicitud
       con su mensaje de política.
    */
    const messages = {

        comp_time:
            'Compensados: solo fechas futuras y recepción hasta las 15:00 del día en curso.',

        siop_validation:
            'SIOP: mínimo 48 horas y evidencia obligatoria de la conexión del asesor. Si no cumple, explica el motivo de la no marcación.',

        schedule_change:
            'Cambios de horario: mínimo 48 horas. Si no se cumple, adjunta soporte de urgencia.'
    };


    /*
       Busca el mensaje correspondiente al tipo actual.

       Si el tipo no existe dentro de messages,
       el resultado será undefined.
    */
    const message =
        messages[type];


    /*
       Busca el contenedor visual de la alerta.
    */
    const policyAlert =
        document.querySelector('#policyAlert');


    /*
       Muestra la alerta solamente si existe
       un mensaje para el tipo seleccionado.
    */
    if (policyAlert) {
        policyAlert.style.display =
            message ? 'flex' : 'none';
    }


    /*
       Inserta el texto de la política.
    */
    if (message && policyText) {
        policyText.textContent =
            message;
    }


    /*
       Busca el input donde se adjunta evidencia.
    */
    const evidence =
        document.querySelector('#evidence');


    /*
       Para SIOP la evidencia es obligatoria.

       Para otros tipos se indica que depende del caso.
    */
    if (evidence) {

        const evidenceField =
            evidence.closest('.field');

        const evidenceLabel =
            evidenceField?.querySelector('em');

        if (evidenceLabel) {

            evidenceLabel.textContent =
                type === 'siop_validation'
                    ? ' (obligatoria)'
                    : ' (opcional según el caso)';
        }
    }
};


/*
   Se agrega un listener a todos los radio buttons
   que pertenecen al selector de tipo.

   Cada vez que cambia el tipo:
   → Se actualiza la política mostrada.
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
   Ejecuta la función una vez al cargar la página
   para mostrar correctamente la política inicial.
*/
updatePolicy();


/*
   Vuelve a renderizar los iconos Lucide agregados
   dinámicamente mediante data-lucide.
*/
if (window.lucide) {
    lucide.createIcons();
}


/* =========================================================
   10. VALIDACIÓN DEL FORMULARIO SIOP
   ========================================================= */

/*
   Escucha el evento submit del formulario.

   El tercer parámetro "true" indica que se ejecutará
   durante la fase de captura del evento.

   Esto ayuda a validar antes de que otros listeners
   procesen el formulario.
*/
document.querySelector('#requestForm')?.addEventListener(
    'submit',
    event => {

        /*
           Obtiene el tipo seleccionado.
        */
        const type =
            document.querySelector(
                'input[name="type"]:checked'
            )?.value;


        /*
           Si NO es una solicitud SIOP,
           no aplica las validaciones especiales.
        */
        if (type !== 'siop_validation') {
            return;
        }


        /*
           Obtiene la fecha seleccionada.
        */
        const date =
            document.querySelector('#eventDate')?.value;


        /*
           Cuenta la cantidad de archivos adjuntos.

           Si es 0 significa que no hay evidencia.
        */
        const evidence =
            document.querySelector('#evidence')
                ?.files.length;


        /*
           Obtiene el motivo escrito por el usuario.
        */
        const reason =
            document.querySelector('#reason')
                ?.value.trim() || '';


        /*
           Valida que exista una fecha.
        */
        if (!date) {

            event.preventDefault();
            event.stopImmediatePropagation();

            alert(
                'Validación SIOP: selecciona la fecha.'
            );

            return;
        }


        /*
           Calcula cuántas horas faltan entre:
           - Fecha actual.
           - Fecha de la solicitud.

           3600000 representa una hora en milisegundos.
        */
        const hoursAhead =
            (
                new Date(`${date}T00:00`)
                - new Date()
            ) / 3600000;


        /*
           Para SIOP la evidencia es obligatoria.
        */
        if (!evidence) {

            /*
               Evita que el formulario continúe.
            */
            event.preventDefault();

            event.stopImmediatePropagation();

            alert(
                'Validación SIOP: adjunta la evidencia de la conexión del asesor.'
            );

            return;
        }


        /*
           Si la solicitud tiene menos de 48 horas
           y no existe un motivo, bloquea el envío.
        */
        if (hoursAhead < 48 && !reason) {

            event.preventDefault();

            event.stopImmediatePropagation();

            alert(
                'Validación SIOP con menos de 48 horas: explica por qué no se realizó la marcación.'
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

    /*
       Obtiene el tipo seleccionado.
    */
    const type =
        document.querySelector(
            'input[name="type"]:checked'
        )?.value;


    /*
       Referencias a campos dinámicos.
    */
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

    const currentHours =
        document.querySelector(
            '.current-hours'
        );


    /*
       Si todavía no existe el bloque
       "Horario actual del asesor 1",
       lo crea dinámicamente.
    */
    if (!currentHours) {

        document
            .querySelector('#endTime')
            ?.closest('.field')
            ?.insertAdjacentHTML(
                'afterend',
                `

                <div
                    class="current-hours full-field"
                >

                    <span>
                        Horario actual del asesor 1
                    </span>

                    <div>

                        <input
                            id="currentStart1"
                            type="time"
                        >

                        <input
                            id="currentEnd1"
                            type="time"
                        >

                    </div>

                </div>


                <!--
                    Contenedor reservado para
                    el segundo asesor.
                -->
                <div
                    id="secondAgentField"
                    class="full-field"
                ></div>
                `
            );
    }


    /*
       Busca el contenedor del segundo asesor.
    */
    const second =
        document.querySelector(
            '#secondAgentField'
        );


    /*
       Busca todos los campos de horario.
    */
    const timeFields =
        document.querySelectorAll(
            '.time-field'
        );


    /*
       Si el tipo es "swap" (enroque),
       se crea el bloque del segundo asesor.
    */
    if (second) {

        second.innerHTML =
            type === 'swap'

                ? `

                <div class="second-agent-block">

                    <label
                        class="field second-agent"
                    >

                        <span>
                            DNI del segundo asesor
                        </span>

                        <input
                            id="agentDni2"
                            inputmode="numeric"
                            placeholder="Ej. 1234567890"
                        >

                        <div
                            id="agentData2"
                            class="agent-data"
                        >
                            Escribe el DNI del segundo asesor.
                        </div>

                    </label>


                    <div
                        class="current-hours second-current-hours"
                    >

                        <span>
                            Horario actual del asesor 2
                        </span>

                        <div>

                            <input
                                id="currentStart2"
                                type="time"
                            >

                            <input
                                id="currentEnd2"
                                type="time"
                            >

                        </div>

                    </div>

                </div>

                `

                : '';
    }


    /*
       Determina en qué tipos se debe mostrar
       el horario actual.
    */
    const visibleCurrentHours =
        [
            'schedule_change',
            'swap',
            'exception'
        ].includes(type);


    /*
       Muestra u oculta todos los bloques
       de horarios actuales.
    */
    document
        .querySelectorAll('.current-hours')
        .forEach(field => {

            field.style.display =
                visibleCurrentHours
                    ? 'block'
                    : 'none';
        });


    /*
       El selector de período solo se muestra para:
       - Cambio de horario.
       - Enroque.
    */
    if (period) {

        period.style.display =
            type === 'schedule_change'
            || type === 'swap'

                ? 'block'
                : 'none';
    }


    /*
       Para compensados se muestran
       campos adicionales de fechas.
    */
    if (extra) {

        extra.innerHTML =
            type === 'comp_time'

                ? `

                <span class="field-title">
                    Fechas de compensado
                    (máximo 5 en total)
                </span>

                <div class="date-inputs">

                    <input
                        type="date"
                        class="comp-date"
                    >

                    <input
                        type="date"
                        class="comp-date"
                    >

                    <input
                        type="date"
                        class="comp-date"
                    >

                    <input
                        type="date"
                        class="comp-date"
                    >

                </div>

                `

                : '';
    }


    /*
       El bloque de excepción solamente
       aparece cuando type === 'exception'.
    */
    if (exception) {

        exception.style.display =
            type === 'exception'
                ? 'block'
                : 'none';
    }


    /*
       Los campos de horario nuevo se muestran para:
       - Horas extra.
       - Cambio de horario.
    */
    timeFields.forEach(field => {

        const visible =
            type === 'overtime'
            || type === 'schedule_change';


        /*
           Muestra u oculta visualmente.
        */
        field.style.display =
            visible
                ? 'block'
                : 'none';


        /*
           Si el campo está visible,
           se vuelve obligatorio.
        */
        const input =
            field.querySelector('input');

        if (input) {
            input.required =
                visible;
        }
    });


    /*
       Mensaje de ayuda para horas extra.
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


    /*
       Actualiza iconos generados dinámicamente.
    */
    if (window.lucide) {
        lucide.createIcons();
    }
}


/*
   Cada vez que cambia el tipo,
   actualiza los campos visibles.
*/
document
    .querySelectorAll('input[name="type"]')
    .forEach(input => {

        input.addEventListener(
            'change',
            updateTypeFields
        );
    });


/*
   Ejecuta una vez para establecer
   correctamente el estado inicial.
*/
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
       Obtiene las solicitudes locales.
    */
    const stored =
        JSON.parse(
            localStorage.getItem(
                'turnoClaroRequests'
            ) || '[]'
        );


    /*
       Recorre los estados del tablero.
    */
    [
        'pending',
        'approved',
        'rejected'
    ].forEach(status => {


        /*
           Busca el contador HTML correspondiente.

           Ejemplo:

           pending
           ↓
           #pendingBoard
        */
        const target =
            document.querySelector(
                `#${status}Board`
            );


        /*
           Cuenta cuántas solicitudes
           tienen ese estado.
        */
        if (target) {

            target.textContent =
                stored.filter(
                    item =>
                        item.status === status
                ).length;
        }
    });
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
        canReview: true
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


    /*
       Renderiza iconos nuevos.
    */
    if (window.lucide) {
        lucide.createIcons();
    }
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

}, 1000);


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
                        `Regla configurada por WFM para ${
                            row.querySelector(
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
                `${item.id} · ${
                    wfTypes[item.type]
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
                        ${
                            escapeHtml(item.employee_dni)
                            || 'No registrado'
                        }
                    </b>
                </span>

                <span>
                    Cargo:
                    <b>
                        ${
                            escapeHtml(item.employee_job_title)
                            || 'No registrado'
                        }
                    </b>
                </span>

                <span>
                    Servicio:
                    <b>
                        ${
                            escapeHtml(item.employee_service)
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
           Por defecto indica que no existe evidencia.
        */
        let evidence =
            'Sin evidencia adjunta';


        /*
           Si existe una ruta de evidencia,
           genera una URL firmada temporal.
        */
        if (item.evidence_path) {


            /*
               API PostgreSQL Storage:

               request-evidence
               → nombre del bucket.

               createSignedUrl()
               → genera URL temporal.

               3600 segundos
               = 1 hora.
            */
            const result =
                await apiClient
                    .storage
                    .from(
                        'request-evidence'
                    )
                    .createSignedUrl(
                        item.evidence_path,
                        3600
                    );


            /*
               Si la URL se generó correctamente,
               crea enlace.
            */
            if (
                result.data?.signedUrl
            ) {

                evidence = `
                    <a
                        href="${result.data.signedUrl}"
                        target="_blank"
                        rel="noopener"
                    >
                        Abrir evidencia
                    </a>
                `;
            }
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

            reviewBody.innerHTML = `

                <p>
                    <b>Motivo</b>
                    <br>
                    ${
                        escapeHtml(item.reason)
                        || 'Sin motivo registrado'
                    }
                </p>

                <p>
                    <b>Horas</b>
                    <br>
                    ${
                        item.hours
                        || 'No especificadas'
                    }
                </p>

                <p>
                    <b>Evidencia</b>
                    <br>
                    ${evidence}
                </p>
            `;
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
    .querySelectorAll(
        '.review-action'
    )
    .forEach(button => {

        button.addEventListener(
            'click',
            async () => {


                /*
                   Obtiene el modal.
                */
                const modal =
                    document.querySelector(
                        '#reviewModal'
                    );


                /*
                   Obtiene el ID TC-XXX.
                */
                const id =
                    modal?.dataset.id;


                /*
                   Convierte:

                   TC-123
                   ↓
                   123

                   porque API PostgreSQL probablemente
                   almacena el ID numérico.
                */
                const dbId =
                    id?.replace(
                        'TC-',
                        ''
                    );


                /*
                   Obtiene el nuevo estado
                   desde el botón presionado.
                */
                const status =
                    button.dataset.status;


                /*
                   Obtiene comentario de WFM.
                */
                const comment =
                    document
                        .querySelector(
                            '#reviewComment'
                        )
                        ?.value
                        .trim()
                    || '';


                /*
                   El comentario es obligatorio
                   antes de aprobar/rechazar.
                */
                if (!comment) {

                    alert(
                        'Escribe una respuesta de WFM antes de guardar.'
                    );

                    return;
                }


                /*
                   Obtiene el usuario autenticado.
                */
                const {
                    data: { user }
                } =
                    await apiClient
                        .auth
                        .getUser();


                /*
                   Protección:
                   verifica que exista usuario.
                */
                if (!user) {

                    alert(
                        'No se pudo identificar al usuario actual.'
                    );

                    return;
                }


                /*
                   ACTUALIZAR SOLICITUD

                   Actualiza:
                   - Estado.
                   - Comentario.
                   - Usuario revisor.
                   - Fecha de revisión.
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
                                new Date().toISOString()

                        })
                        .eq(
                            'id',
                            dbId
                        );


                /*
                   Si ocurre un error,
                   muestra mensaje.
                */
                if (update.error) {

                    alert(
                        `No se pudo actualizar: ${update.error.message}`
                    );

                    return;
                }


                /* La API registra el cambio y su historial en una sola transacción. */


                /*
                   También actualiza localStorage
                   para que la interfaz refleje
                   inmediatamente el cambio.
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

                    item.review_comment =
                        comment;


                    localStorage.setItem(
                        'turnoClaroRequests',
                        JSON.stringify(list)
                    );
                }


                /*
                   Cierra modal.
                */
                modal?.classList.remove(
                    'open'
                );


                /*
                   Actualiza panel WFM.
                */
                renderWF();
                if (typeof renderVisibleTickets === 'function') {
                    renderVisibleTickets();
                }


                /*
                   Mensaje final.
                */
                alert(
                    'Revisión guardada.'
                );
            }
        );
    });


/* =========================================================
   33. CONTROL FINAL DEL MODAL SEGÚN ROL
   ========================================================= */

/*
   Guarda la función original openReview.

   Esto permite extenderla sin eliminar
   su funcionamiento original.
*/
const originalOpenReview =
    window.openReview;


/*
   Sobrescribe openReview agregando
   una capa adicional de permisos.
*/
window.openReview =
    async id => {


        /*
           Primero ejecuta la función original.

           Esto carga todos los datos
           y abre el modal.
        */
        await originalOpenReview(id);


        /*
           Busca nuevamente la solicitud.
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
           Obtiene permiso de revisión
           del rol actual.
        */
        const canReview =
            demoRole.canReview;


        /*
           Muestra u oculta botones:

           Aprobar.
           Rechazar.
           Etc.
        */
        document
            .querySelectorAll(
                '.review-action'
            )
            .forEach(button => {

                button.style.display =
                    canReview
                        ? 'inline-block'
                        : 'none';
            });


        /*
           Busca campo de comentario.
        */
        const reviewComment =
            document.querySelector(
                '#reviewComment'
            );


        if (reviewComment) {


            /*
               Busca el contenedor completo
               del campo.
            */
            const field =
                reviewComment.closest(
                    '.field'
                );


            /*
               Solo WFM/Gerencia puede escribir
               comentarios de revisión.
            */
            if (field) {

                field.style.display =
                    canReview
                        ? 'block'
                        : 'none';
            }
        }
    };

