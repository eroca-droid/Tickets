const authScreen = document.querySelector('#authScreen');
const appShell = document.querySelector('.app-shell');
const bootScreen = document.querySelector('#bootScreen');
const requiredPasswordScreen = document.querySelector('#requiredPasswordScreen');
const requiredPasswordForm = document.querySelector('#requiredPasswordForm');
const requiredPasswordMessage = document.querySelector('#requiredPasswordMessage');
const loginForm = document.querySelector('#loginForm');
const loginMessage = document.querySelector('#loginMessage');
const sidebar = document.querySelector('.sidebar');
const mobileMenuButton = document.querySelector('#mobileMenuButton');

function setMobileMenu(open) {
    sidebar.classList.toggle('mobile-open', open);
    mobileMenuButton.setAttribute('aria-expanded', String(open));
    mobileMenuButton.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    mobileMenuButton.innerHTML = `<i data-lucide="${open ? 'x' : 'menu'}"></i>`;
    if (window.lucide) lucide.createIcons();
}

mobileMenuButton.addEventListener('click', () => {
    setMobileMenu(!sidebar.classList.contains('mobile-open'));
});

sidebar.querySelector('nav').addEventListener('click', event => {
    if (event.target.closest('.nav-item') && window.matchMedia('(max-width: 768px)').matches) {
        setMobileMenu(false);
    }
});

const baseShowView = showView;

showView = function showStableView(view) {
    baseShowView(view);
    const pageTitle = document.querySelector('#pageTitle');
    if (view === 'wf' && pageTitle) pageTitle.textContent = 'Vista WFM';
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
};

document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && sidebar.classList.contains('mobile-open')) setMobileMenu(false);
});

window.matchMedia('(min-width: 769px)').addEventListener('change', event => {
    if (event.matches) setMobileMenu(false);
});

function showLogin(message = '') {
    bootScreen.style.display = 'none';
    requiredPasswordScreen.style.display = 'none';
    authScreen.style.display = 'grid';
    appShell.classList.remove('is-visible');
    loginMessage.textContent = message;
    if (window.lucide) lucide.createIcons();
}

function showApp() {
    bootScreen.style.display = 'none';
    requiredPasswordScreen.style.display = 'none';
    authScreen.style.display = 'none';
    appShell.classList.add('is-visible');
}

function showRequiredPasswordChange() {
    bootScreen.style.display = 'none';
    authScreen.style.display = 'none';
    appShell.classList.remove('is-visible');
    requiredPasswordScreen.style.display = 'grid';
    requiredPasswordMessage.textContent = '';
    if (window.lucide) lucide.createIcons();
    document.querySelector('#requiredPassword').focus();
}

document.querySelectorAll('[data-password-target]').forEach(button => {
    button.addEventListener('click', () => {
        const input = document.getElementById(button.dataset.passwordTarget);
        const willShow = input.type === 'password';
        input.type = willShow ? 'text' : 'password';
        button.setAttribute('aria-label', `${willShow ? 'Ocultar' : 'Mostrar'} contraseña`);
        button.title = `${willShow ? 'Ocultar' : 'Mostrar'} contraseña`;
        button.innerHTML = `<i data-lucide="${willShow ? 'eye-off' : 'eye'}"></i>`;
        if (window.lucide) lucide.createIcons();
        input.focus();
    });
});

async function loadRealRequests() {

    // El perfil define el rango; la API aplica la misma regla en el servidor.
    const userResult = await apiClient.auth.getUser();
    const user = userResult.data?.user;

    if (userResult.error || !user) {
        return false;
    }

    if (user) {

        localStorage.setItem(
            'turnoClaroUserId',
            user.id
        );

        const profile = await apiClient
            .from('profiles')
            .select('full_name,role')
            .eq('id', user.id)
            .single();

        if (profile.error || !profile.data) {
            console.error(profile.error);
            return false;
        }

        if (profile.data?.role) {

            localStorage.setItem(
                'turnoClaroDemoRole',
                profile.data.role
            );

            if (typeof setDemoRole === 'function') {
                setDemoRole(profile.data.role);
            }
        }

        if (profile.data?.full_name) {

            localStorage.setItem(
                'turnoClaroProfileName',
                profile.data.full_name
            );

            document.querySelector(
                '#roleToggle strong'
            ).textContent = profile.data.full_name;

            document.querySelector(
                '.welcome-row h2'
            ).textContent =
                `Buen día, ${profile.data.full_name.split(' ')[0]}.`;
        }

        if (typeof applyDemoRole === 'function') {
            applyDemoRole();
        }

        if (
            ['wfm', 'superadmin'].includes(profile.data?.role) &&
            typeof refreshStaticRules === 'function'
        ) {
            refreshStaticRules();
        }
    }


    const { data, error } = await apiClient
        .from('requests')
        .select('*')
        .order('created_at', {
            ascending: false
        });


    if (error) {
        console.error(error);
        return false;
    }


    const mapped = (data || []).map(item => ({

        id: `TC-${item.id}`,

        dbId: item.id,

        requester_id:
            item.requester_id,

        requester_name:
            item.requester_name,

        type:
            item.type,

        employee:
            item.employee_name,

        employee_dni:
            item.employee_dni,

        employee_dni_2:
            item.employee_dni_2,

        employee_job_title:
            item.employee_job_title,

        employee_service:
            item.employee_service,

        current_start_time:
            item.current_start_time,

        current_end_time:
            item.current_end_time,

        current_start_time_2:
            item.current_start_time_2,

        current_end_time_2:
            item.current_end_time_2,

        date:
            item.event_date,

        event_dates:
            item.event_dates,

        period_type:
            item.period_type,

        exception_type:
            item.exception_type,

        exception_origin:
            item.exception_origin,

        /* =================================================
           NUEVO: SUPERVISOR DE LA EXCEPCIÓN
           ================================================= */

        exception_supervisor_id:
            item.exception_supervisor_id,

        exception_supervisor_name:
            item.exception_supervisor_name,

        status:
            item.status,

        reason:
            item.reason,

        hours:
            item.hours,

        evidence_path:
            item.evidence_path,

        review_comment:
            item.review_comment,

        created:
            item.created_at
    }));


    requests = mapped;
    save();
    render();
    if (typeof renderWF === 'function') renderWF();
    if (typeof renderVisibleTickets === 'function') renderVisibleTickets();
    return true;
}


async function initializeAuth() {

    const sessionResult = await apiClient.auth.getSession();
    const session = sessionResult.data?.session;

    if (!session) {
        showLogin(sessionResult.error?.message === 'No hay conexión con el servidor.'
            ? sessionResult.error.message
            : '');
        return
    }

    if (session.user?.password_change_required) {
        showRequiredPasswordChange();
        return;
    }

    const loaded = await loadRealRequests();

    if (!loaded) {
        showLogin('No se pudieron cargar los datos. Intenta nuevamente.');
        return;
    }

    showApp();

    document
        .querySelector('#logoutButton')
        .addEventListener(
            'click',
            async () => {

                await apiClient.auth.signOut();

                [
                    'turnoClaroRequests',
                    'turnoClaroUserId',
                    'turnoClaroDemoRole',
                    'turnoClaroProfileName'
                ].forEach(key => localStorage.removeItem(key));

                location.reload()
            }
        );
}


loginForm.addEventListener(
    'submit',
    async event => {

        event.preventDefault();

        loginMessage.textContent =
            'Validando acceso...';

        const { data, error } =
            await apiClient.auth.signInWithPassword({

                email:
                    document.querySelector(
                        '#loginEmail'
                    ).value,

                password:
                    document.querySelector(
                        '#loginPassword'
                    ).value
            });

        if (error) {

            loginMessage.textContent =
                error.message || 'No se pudo iniciar sesión.';

            return
        }

        if (data?.user?.password_change_required) {
            showRequiredPasswordChange();
            return;
        }

        const loaded = await loadRealRequests();

        if (!loaded) {
            loginMessage.textContent =
                'Ingresaste, pero no se pudieron cargar los datos.';
            return;
        }

        location.reload();
    }
);

requiredPasswordForm.addEventListener('submit', async event => {
    event.preventDefault();

    const password = document.querySelector('#requiredPassword').value;
    const confirmation = document.querySelector('#requiredPasswordConfirmation').value;
    if (!password) {
        requiredPasswordMessage.textContent = 'Escribe una contraseña nueva.';
        return;
    }
    if (password.length < 10) {
        requiredPasswordMessage.textContent = 'La contraseña debe tener mínimo 10 caracteres.';
        return;
    }
    if (password !== confirmation) {
        requiredPasswordMessage.textContent = 'Las contraseñas no coinciden.';
        return;
    }

    const submitButton = requiredPasswordForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    requiredPasswordMessage.textContent = 'Guardando contraseña...';
    const { error } = await apiClient.auth.updateUser({ password });
    if (error) {
        submitButton.disabled = false;
        requiredPasswordMessage.textContent = error.message;
        return;
    }

    const verification = await apiClient.auth.getUser();
    if (verification.error || verification.data?.user?.password_change_required) {
        submitButton.disabled = false;
        requiredPasswordMessage.textContent = 'No se pudo confirmar el cambio. Intenta nuevamente.';
        return;
    }

    requiredPasswordMessage.textContent = 'Contraseña guardada. Abriendo el panel...';
    location.reload();
});

document.querySelector('#requiredPasswordLogout').addEventListener('click', async () => {
    await apiClient.auth.signOut();
    location.reload();
});


document
    .querySelector('#requestForm')
    .addEventListener(
        'submit',
        async event => {

            // Todas las validaciones se repiten antes del insert para evitar datos incompletos.
            event.preventDefault();

            event.stopImmediatePropagation();

            const submitButton =
                document.querySelector(
                    '#requestForm button[type="submit"]'
                );

            if (
                submitButton?.dataset.sending === 'true'
            ) {
                return
            }

            if (submitButton) {

                submitButton.dataset.sending =
                    'true';

                submitButton.disabled =
                    true;

                submitButton.innerHTML =
                    '<i data-lucide="loader-circle"></i> Enviando...';

                if (window.lucide) {
                    lucide.createIcons();
                }
            }


            const releaseSubmit = () => {

                if (submitButton) {

                    submitButton.dataset.sending =
                        'false';

                    submitButton.disabled =
                        false;

                    submitButton.innerHTML =
                        '<i data-lucide="send"></i> Enviar solicitud';

                    if (window.lucide) {
                        lucide.createIcons();
                    }
                }
            };


            const {
                data: { user }
            } =
                await apiClient.auth.getUser();


            if (!user) {

                releaseSubmit();

                showLogin(
                    'Tu sesión expiró.'
                );

                return
            }


            const type =
                document.querySelector(
                    'input[name="type"]:checked'
                ).value;


            const agent =
                document.querySelector(
                    '#agentData'
                );


            if (!agent?.dataset.dni) {

                releaseSubmit();

                alert(
                    'Verifica el DNI del agente antes de enviar.'
                );

                return
            }


            const agentLookup =
                await apiClient
                    .from('dotacion')
                    .select(
                        'dni,full_name,job_title,service'
                    )
                    .eq(
                        'dni',
                        agent.dataset.dni
                    )
                    .eq(
                        'active',
                        true
                    )
                    .maybeSingle();


            if (
                agentLookup.error ||
                !agentLookup.data
            ) {

                releaseSubmit();

                alert(
                    'El DNI no existe en la dotación activa.'
                );

                return
            }


            const date =
                document.querySelector(
                    '#eventDate'
                ).value;


            const start =
                document.querySelector(
                    '#startTime'
                ).value;


            const end =
                document.querySelector(
                    '#endTime'
                ).value;


            const reason =
                document.querySelector(
                    '#reason'
                ).value.trim();


            let agent2 = null;


            if (type === 'swap') {

                const dni2 =
                    document.querySelector(
                        '#agentDni2'
                    )?.value.trim();


                if (
                    !dni2 ||
                    dni2 === agent.dataset.dni
                ) {

                    releaseSubmit();

                    alert(
                        'Ingresa dos DNI diferentes para el enroque.'
                    );

                    return
                }


                const result =
                    await apiClient
                        .from('dotacion')
                        .select(
                            'dni,full_name'
                        )
                        .eq(
                            'dni',
                            dni2
                        )
                        .eq(
                            'active',
                            true
                        )
                        .maybeSingle();


                if (
                    result.error ||
                    !result.data
                ) {

                    releaseSubmit();

                    alert(
                        'El segundo DNI no existe en la dotación activa.'
                    );

                    return
                }


                agent2 =
                    result.data;
            }


            const evidenceFile =
                document.querySelector(
                    '#evidence'
                ).files[0];


            const eventAt =
                new Date(
                    `${date}T${start || '00:00'}`
                );


            const today =
                new Date()
                    .toISOString()
                    .slice(0, 10);


            const ruleResult =
                await apiClient
                    .from('business_rules')
                    .select(
                        'min_advance_hours,same_day_cutoff,requires_evidence,coordinator_allowed,supervisor_allowed'
                    )
                    .eq(
                        'rule_key',
                        type
                    )
                    .maybeSingle();


            const profileResult =
                await apiClient
                    .from('profiles')
                    .select('role')
                    .eq(
                        'id',
                        user.id
                    )
                    .single();


            const profileRole =
                profileResult.data?.role;


            const defaults = {

                schedule_change: {
                    min_advance_hours: 48,
                    requires_evidence: true
                },

                swap: {
                    min_advance_hours: 48,
                    requires_evidence: false
                },

                comp_time: {
                    min_advance_hours: 0,
                    same_day_cutoff: '15:00',
                    requires_evidence: false
                },

                overtime: {
                    min_advance_hours: 0,
                    requires_evidence: false
                },

                siop_validation: {
                    min_advance_hours: 48,
                    requires_evidence: true
                },

                exception: {
                    min_advance_hours: 0,
                    requires_evidence: true
                }
            };


            const rule =
                ruleResult.data ||
                defaults[type];


            if (
                rule &&
                profileRole &&
                (
                    (
                        profileRole === 'coordinator' &&
                        rule.coordinator_allowed === false
                    )
                    ||
                    (
                        profileRole === 'supervisor' &&
                        rule.supervisor_allowed === false
                    )
                )
            ) {

                releaseSubmit();

                alert(
                    'Este tipo de solicitud no está habilitado para tu rango.'
                );

                return
            }


            if (!date) {

                releaseSubmit();

                alert(
                    'Selecciona la fecha del evento.'
                );

                return
            }


            if (
                start &&
                end &&
                end <= start
            ) {

                releaseSubmit();

                alert(
                    'La hora final debe ser posterior a la hora inicial.'
                );

                return
            }


            if (
                rule &&
                type !== 'exception' &&
                Number(rule.min_advance_hours || 0) > 0 &&
                eventAt - new Date() <
                Number(
                    rule.min_advance_hours || 0
                ) *
                60 *
                60 *
                1000
            ) {

                releaseSubmit();

                alert(
                    `No puedes generar este caso: requiere ${rule.min_advance_hours} horas de anticipación. Usa Excepción.`
                );

                return
            }


            if (
                rule?.requires_evidence &&
                !evidenceFile
            ) {

                releaseSubmit();

                alert(
                    'Esta solicitud requiere evidencia según la regla vigente de WFM.'
                );

                return
            }


            if (
                type === 'comp_time' &&
                date < today
            ) {

                releaseSubmit();

                alert(
                    'Los compensados retroactivos no se aceptan.'
                );

                return
            }


            if (
                type === 'comp_time' &&
                date === today &&
                rule?.same_day_cutoff
            ) {

                const [
                    cutoffHour,
                    cutoffMinute
                ] =
                    rule.same_day_cutoff
                        .slice(0, 5)
                        .split(':')
                        .map(Number);


                const currentMinutes =
                    new Date().getHours() *
                    60 +
                    new Date().getMinutes();


                if (
                    currentMinutes >=
                    cutoffHour * 60 +
                    cutoffMinute
                ) {

                    releaseSubmit();

                    alert(
                        `El corte para compensados de hoy fue a las ${rule.same_day_cutoff.slice(0, 5)}. Usa Excepción.`
                    );

                    return
                }
            }


            if (
                type === 'siop_validation' &&
                eventAt - new Date() <
                Number(
                    rule?.min_advance_hours || 48
                ) *
                60 *
                60 *
                1000 &&
                !reason
            ) {

                releaseSubmit();

                alert(
                    'SIOP fuera de plazo: explica por qué no se realizó la marcación.'
                );

                return
            }


            let evidencePath = null;


            if (evidenceFile) {

                evidencePath =
                    `${user.id}/${Date.now()}-${evidenceFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;


                const upload =
                    await apiClient
                        .storage
                        .from('request-evidence')
                        .upload(
                            evidencePath,
                            evidenceFile
                        );


                if (upload.error) {

                    releaseSubmit();

                    alert(
                        `No se pudo subir la evidencia: ${upload.error.message}`
                    );

                    return
                }
            }


            const selectedDates = [
                date,
                ...[
                    ...document.querySelectorAll(
                        '.comp-date'
                    )
                ]
                    .map(
                        input => input.value
                    )
                    .filter(Boolean)
            ];


            if (
                type === 'comp_time' &&
                selectedDates.length > 5
            ) {

                releaseSubmit();

                alert(
                    'Puedes programar máximo 5 fechas por solicitud.'
                );

                return
            }


            let hours =
                start &&
                end
                    ? Math.max(
                        0,
                        (
                            new Date(
                                `2000-01-01T${end}`
                            ) -
                            new Date(
                                `2000-01-01T${start}`
                            )
                        ) /
                        3600000
                    )
                    : null;


            if (
                type === 'overtime' &&
                hours > 5
            ) {

                releaseSubmit();

                alert(
                    'Las horas extra no pueden superar 5 horas. Para excedentes, envía un correo a (workforce.entelchile.in@impulsa365.com.pe).'
                );

                return
            }


            /* =================================================
               EXCEPCIÓN
               ================================================= */

            const supervisorSelect =
                document.querySelector(
                    '#exceptionSupervisor'
                );


            const exceptionSupervisorId =
                type === 'exception'
                    ? supervisorSelect?.value || null
                    : null;


            const exceptionSupervisorName =
                type === 'exception'
                    ? supervisorSelect
                        ?.selectedOptions?.[0]
                        ?.textContent
                        ?.trim() || null
                    : null;


            /* =================================================
               PAYLOAD
               ================================================= */

            const payload = {

                requester_id:
                    user.id,

                requester_name:
                    localStorage.getItem(
                        'turnoClaroProfileName'
                    ) || user.email,

                type,

                status:
                    'pending',

                event_date:
                    date,

                start_time:
                    start || null,

                end_time:
                    end || null,

                employee_name:
                    agentLookup.data.full_name,

                employee_dni:
                    agentLookup.data.dni,

                employee_dni_2:
                    agent2?.dni || null,

                employee_job_title:
                    agentLookup.data.job_title,

                employee_service:
                    agentLookup.data.service,

                event_dates:
                    selectedDates,

                period_type:
                    document.querySelector(
                        '#periodType'
                    )?.value || 'specific',

                exception_type:
                    type === 'exception'
                        ? document.querySelector(
                            '#exceptionType'
                        )?.value
                        : null,

                exception_origin:
                    type === 'exception'
                        ? document.querySelector(
                            '#errorOrigin'
                        )?.value
                        : null,

                /* =================================================
                   NUEVO
                   ================================================= */

                exception_supervisor_id:
                    exceptionSupervisorId,

                exception_supervisor_name:
                    exceptionSupervisorName,

                reason:
                    reason ||
                    'Sin detalle adicional',

                evidence_path:
                    evidencePath,

                connection_evidence_path:
                    type === 'siop_validation'
                        ? evidencePath
                        : null,

                hours
            };


            if (
                [
                    'schedule_change',
                    'swap',
                    'exception'
                ].includes(type)
            ) {

                Object.assign(
                    payload,
                    {

                        current_start_time:
                            document.querySelector(
                                '#currentStart1'
                            )?.value ||
                            null,

                        current_end_time:
                            document.querySelector(
                                '#currentEnd1'
                            )?.value ||
                            null,

                        current_start_time_2:
                            document.querySelector(
                                '#currentStart2'
                            )?.value ||
                            null,

                        current_end_time_2:
                            document.querySelector(
                                '#currentEnd2'
                            )?.value ||
                            null
                    }
                );
            }


            const { error } =
                await apiClient
                    .from('requests')
                    .insert(payload);


            if (error) {

                releaseSubmit();

                alert(
                    `No se pudo crear la solicitud: ${error.message}`
                );

                return
            }


            await loadRealRequests();

            alert(
                'Solicitud enviada correctamente.'
            );

            location.reload();
        },
        {
            capture: true
        }
    );


/* =========================================================
   CAMBIAR CONTRASEÑA
   ========================================================= */

document
    .querySelector('#passwordButton')
    .addEventListener(
        'click',
        async () => {

            const password =
                window.prompt(
                    'Escribe tu nueva contraseña (mínimo 10 caracteres):'
                );


            if (!password) {
                return
            }


            if (password.length < 10) {

                alert(
                    'La contraseña debe tener mínimo 10 caracteres.'
                );

                return
            }


            const { error } =
                await apiClient.auth.updateUser({
                    password
                });


            alert(
                error
                    ? `No se pudo cambiar la contraseña: ${error.message}`
                    : 'Contraseña actualizada correctamente.'
            );
        }
    );


/* =========================================================
   EXPORTAR TICKETS
   ========================================================= */

document
    .querySelector('#exportTickets')
    .addEventListener(
        'click',
        async () => {

            const {
                data: { user }
            } =
                await apiClient.auth.getUser();


            const profile =
                await apiClient
                    .from('profiles')
                    .select('role')
                    .eq(
                        'id',
                        user.id
                    )
                    .single();


            if (
                ![
                    'wfm',
                    'management',
                    'superadmin'
                ].includes(
                    profile.data?.role
                )
            ) {

                alert(
                    'Solo WFM o Gerencia pueden descargar los tickets.'
                );

                return
            }


            const {
                data,
                error
            } =
                await apiClient
                    .from('requests')
                    .select('*')
                    .order(
                        'created_at',
                        {
                            ascending: false
                        }
                    );


            if (error) {

                alert(
                    `No se pudo descargar la base: ${error.message}`
                );

                return
            }


            const columns = [
                'id',
                'type',
                'status',
                'event_date',
                'employee_dni',
                'employee_dni_2',
                'employee_name',
                'employee_job_title',
                'employee_service',
                'event_dates',
                'period_type',
                'exception_type',
                'exception_origin',
                'exception_supervisor_id',
                'exception_supervisor_name',
                'hours',
                'reason',
                'review_comment',
                'created_at'
            ];

            const csvCell = value => {
                const text = String(value ?? '');
                const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
                return `"${safeText.replaceAll('"', '""')}"`;
            };


            const csv = [

                columns.join(','),

                ...(data || []).map(
                    row =>
                        columns
                            .map(
                                column =>
                                    csvCell(row[column])
                            )
                            .join(',')
                )

            ].join('\n');


            const link =
                document.createElement(
                    'a'
                );


            link.href =
                URL.createObjectURL(
                    new Blob(
                        [
                            `\ufeff${csv}`
                        ],
                        {
                            type:
                                'text/csv;charset=utf-8;'
                        }
                    )
                );


            link.download =
                `tickets-wfm-entel-${new Date().toISOString().slice(0, 10)}.csv`;


            link.click();

            URL.revokeObjectURL(
                link.href
            );
        }
    );


initializeAuth().catch(error => {
    console.error(error);
    showLogin('No se pudo verificar la sesión. Intenta nuevamente.');
});
