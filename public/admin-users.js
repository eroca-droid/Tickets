'use strict';

(() => {
    const nav = document.getElementById('adminUsersNav');
    const view = document.getElementById('adminView');
    const table = document.getElementById('adminUsersTable');
    const message = document.getElementById('adminUsersMessage');
    const search = document.getElementById('adminUserSearch');
    const roleFilter = document.getElementById('adminRoleFilter');
    const statusFilter = document.getElementById('adminStatusFilter');
    const createButton = document.getElementById('adminCreateUser');

    if (!nav || !view || !table || !message) return;

    let users = [];
    let authorized = false;
    let editingUserId = null;

    const roleNames = {
        coordinator: 'Coordinador',
        supervisor: 'Supervisor',
        wfm: 'WFM',
        management: 'Jefatura',
        superadmin: 'Superadmin'
    };

    function cell(value) {
        const td = document.createElement('td');
        td.textContent = String(value ?? '');
        td.style.padding = '12px 8px';
        return td;
    }

    function renderUsers() {
        const term = search.value.trim().toLowerCase();
        const selectedRole = roleFilter.value;
        const selectedStatus = statusFilter.value;

        const filtered = users.filter(user => {
            const matchesText =
                `${user.full_name} ${user.email}`.toLowerCase().includes(term);

            const matchesRole =
                !selectedRole || user.role === selectedRole;

            const matchesStatus =
                !selectedStatus ||
                (selectedStatus === 'active' ? user.active : !user.active);

            return matchesText && matchesRole && matchesStatus;
        });

        table.replaceChildren();

        for (const user of filtered) {
            const tr = document.createElement('tr');

            tr.append(
                cell(user.full_name),
                cell(user.email),
                cell(roleNames[user.role] || user.role),
                cell(user.active ? 'Activo' : 'Inactivo')
            );

            const actions = document.createElement('td');
            actions.style.padding = '12px 8px';

            const editButton = document.createElement('button');
            editButton.type = 'button';
            editButton.textContent = 'Editar';
            editButton.className = 'admin-edit-user';
            editButton.dataset.userId = user.id;

            actions.appendChild(editButton);

            const statusButton = document.createElement('button');
            statusButton.type = 'button';
            statusButton.textContent = user.active ? 'Desactivar' : 'Activar';
            statusButton.className = 'admin-toggle-user';
            statusButton.dataset.userId = user.id;
            statusButton.dataset.active = String(!user.active);
            statusButton.style.marginLeft = '8px';

            // El clic se gestiona mediante el evento delegado de la tabla.
            statusButton.disabled = false;

            actions.appendChild(statusButton);

            const resetButton = document.createElement('button');
            resetButton.type = 'button';
            resetButton.textContent = 'Restablecer contraseña';
            resetButton.className = 'admin-reset-password';
            resetButton.dataset.userId = user.id;
            resetButton.style.marginLeft = '8px';

            // Solo se permite solicitar el restablecimiento de cuentas activas.
            resetButton.disabled = !user.active;

            actions.appendChild(resetButton);
            tr.appendChild(actions);

            table.appendChild(tr);
        }

        message.textContent =
            `${filtered.length} usuario(s) de ${users.length} registrados.`;
    }

    async function loadUsers() {
        message.textContent = 'Cargando usuarios...';

        try {
            const response = await fetch('/api/admin/users', {
                credentials: 'same-origin',
                cache: 'no-store'
            });

            if (!response.ok) {
                throw new Error(`No se pudo cargar usuarios (HTTP ${response.status}).`);
            }

            const result = await response.json();
            users = Array.isArray(result.data) ? result.data : [];
            renderUsers();
        } catch (error) {
            message.textContent = error.message;
        }
    }


    function initializePasswordDialog() {
        const dialog = document.getElementById('adminPasswordDialog');
        const passwordInput = document.getElementById('adminTemporaryPassword');
        const userLabel = document.getElementById('adminPasswordUser');
        const copyButton = document.getElementById('adminCopyPassword');
        const closeButton = document.getElementById('adminClosePassword');

        if (!dialog || !passwordInput || !userLabel ||
            !copyButton || !closeButton) return;

        // Limpiar los datos al cerrar, incluso mediante la tecla Escape.
        dialog.addEventListener('close', () => {
            passwordInput.value = '';
            userLabel.textContent = '';
            copyButton.textContent = 'Copiar contraseña';
        });

        closeButton.addEventListener('click', () => {
            dialog.close();
        });

        copyButton.addEventListener('click', async () => {
            if (!dialog.open || !passwordInput.value) return;

            try {
                await navigator.clipboard.writeText(passwordInput.value);
                copyButton.textContent = 'Copiada';
            } catch {
                passwordInput.focus();
                passwordInput.select();
                copyButton.textContent = 'Seleccionada: copia con Ctrl+C';
            }
        });
    }

    function initializeCreateForm() {
        const panel = document.getElementById('adminUserFormPanel');
        const form = document.getElementById('adminUserForm');
        const cancel = document.getElementById('adminCancelUser');
        const role = document.getElementById('adminNewRole');
        const coordinatorField = document.getElementById('adminCoordinatorField');
        const coordinatorSelect = document.getElementById('adminNewCoordinator');
        const formMessage = document.getElementById('adminUserFormMessage');

        function updateCoordinatorField() {
            const isSupervisor = role.value === 'supervisor';

            coordinatorField.hidden = !isSupervisor;
            coordinatorField.style.display = isSupervisor ? '' : 'none';
            coordinatorSelect.required = isSupervisor;

            if (!isSupervisor) coordinatorSelect.value = '';
        }

        function populateCoordinators() {
            coordinatorSelect.replaceChildren();

            const placeholder = document.createElement('option');
            placeholder.value = '';
            placeholder.textContent = 'Seleccionar coordinador';
            coordinatorSelect.appendChild(placeholder);

            users
                .filter(user => user.role === 'coordinator' && user.active)
                .sort((a, b) => a.full_name.localeCompare(b.full_name))
                .forEach(user => {
                    const option = document.createElement('option');
                    option.value = user.id;
                    option.textContent = user.full_name;
                    coordinatorSelect.appendChild(option);
                });
        }

        createButton.hidden = false;

        createButton.addEventListener('click', () => {
            editingUserId = null;
            form.reset();
            formMessage.textContent = '';

            const passwordField = document.getElementById('adminNewPassword');
            const saveButton = document.getElementById('adminSaveUser');

            passwordField.required = true;
            saveButton.disabled = false;
            saveButton.textContent = 'Guardar usuario';
            panel.querySelector('h3').textContent = 'Nuevo usuario';

            populateCoordinators();
            updateCoordinatorField();

            panel.hidden = false;
            panel.style.display = '';
        });

        table.addEventListener('click', async event => {
            const button = event.target.closest('.admin-reset-password');
            if (!button || !authorized || button.disabled) return;

            const user = users.find(item => item.id === button.dataset.userId);
            if (!user || !user.active) return;

            const confirmed = window.confirm(
                `¿Restablecer la contraseña de ${user.full_name} (${user.email})? ` +
                'Se cerrarán sus sesiones actuales y deberá cambiar la contraseña al ingresar.'
            );

            if (!confirmed) return;

            const dialog = document.getElementById('adminPasswordDialog');
            const passwordInput = document.getElementById('adminTemporaryPassword');
            const userLabel = document.getElementById('adminPasswordUser');

            if (!dialog || !passwordInput || !userLabel ||
                typeof dialog.showModal !== 'function') {
                message.textContent = 'No está disponible la ventana de contraseña temporal.';
                return;
            }

            button.disabled = true;
            message.textContent = `Restableciendo contraseña de ${user.email}...`;

            try {
                const response = await fetch(
                    `/api/admin/users/${encodeURIComponent(user.id)}/reset-password`,
                    {
                        method: 'POST',
                        credentials: 'same-origin',
                        cache: 'no-store'
                    }
                );

                const result = await response.json();

                if (!response.ok) {
                    const detail = typeof result.error === 'string'
                        ? result.error
                        : result.error?.message;

                    throw new Error(detail || `Error HTTP ${response.status}`);
                }

                if (typeof result.temporary_password !== 'string' ||
                    !result.temporary_password) {
                    throw new Error('El servidor no devolvió una contraseña temporal.');
                }

                passwordInput.value = result.temporary_password;
                userLabel.textContent = user.email;
                dialog.showModal();

                message.textContent =
                    'Contraseña restablecida. Guarda la contraseña temporal antes de cerrar la ventana.';
            } catch (error) {
                message.textContent =
                    `No se pudo restablecer la contraseña: ${error.message}`;
            } finally {
                button.disabled = false;
            }
        });

        table.addEventListener('click', async event => {
            const button = event.target.closest('.admin-toggle-user');
            if (!button || !authorized || button.disabled) return;

            const user = users.find(item => item.id === button.dataset.userId);
            if (!user) return;

            const newActive = !user.active;
            const action = newActive ? 'activar' : 'desactivar';

            if (!window.confirm(
                `¿Confirmas ${action} la cuenta de ${user.full_name} (${user.email})?`
            )) return;

            button.disabled = true;
            message.textContent = `Procesando solicitud para ${user.email}...`;

            try {
                const response = await fetch(
                    `/api/admin/users/${encodeURIComponent(user.id)}/status`,
                    {
                        method: 'PATCH',
                        credentials: 'same-origin',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ active: newActive })
                    }
                );

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(
                        (typeof result.error === 'string'
                            ? result.error
                            : result.error?.message) ||
                        result.message ||
                        `Error HTTP ${response.status}`
                    );
                }

                await loadUsers();
            } catch (error) {
                message.textContent = `No se pudo ${action} la cuenta: ${error.message}`;
            } finally {
                button.disabled = false;
            }
        });

        table.addEventListener('click', event => {
            const button = event.target.closest('.admin-edit-user');
            if (!button || !authorized) return;

            const user = users.find(item => item.id === button.dataset.userId);
            if (!user) return;

            editingUserId = user.id;
            form.reset();
            formMessage.textContent = '';

            document.getElementById('adminNewName').value = user.full_name || '';
            document.getElementById('adminNewEmail').value = user.email || '';
            document.getElementById('adminNewDepartment').value =
                user.department || '';

            role.value = user.role;

            populateCoordinators();
            updateCoordinatorField();

            if (user.role === 'supervisor') {
                coordinatorSelect.value = user.coordinator_id || '';
            }

            // La contraseña no se modifica desde la edición.
            const passwordField = document.getElementById('adminNewPassword');
            passwordField.value = '';
            passwordField.required = false;

            panel.querySelector('h3').textContent = 'Editar usuario';
            document.getElementById('adminSaveUser').textContent =
                'Guardar cambios';

            // El formulario utiliza PATCH cuando hay un usuario en edición.
            document.getElementById('adminSaveUser').disabled = false;

            panel.hidden = false;
            panel.style.display = '';
            panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });

        cancel.addEventListener('click', () => {
            editingUserId = null;
            form.reset();
            panel.hidden = true;
            panel.style.display = 'none';
            formMessage.textContent = '';
        });

        role.addEventListener('change', updateCoordinatorField);

        form.addEventListener('submit', async event => {
            event.preventDefault();

            if (!authorized || !form.reportValidity()) return;

            const saveButton = document.getElementById('adminSaveUser');
            const selectedRole = role.value;

            const payload = {
                full_name: document.getElementById('adminNewName').value.trim(),
                email: document.getElementById('adminNewEmail').value.trim(),
                role: selectedRole,
                department: document.getElementById('adminNewDepartment').value.trim(),
                coordinator_id: selectedRole === 'supervisor'
                    ? coordinatorSelect.value
                    : null,
                ...(editingUserId === null
                    ? {
                        temporary_password:
                            document.getElementById('adminNewPassword').value
                    }
                    : {})
            };

            saveButton.disabled = true;
            formMessage.textContent = 'Guardando usuario...';

            try {
                const isEditing = editingUserId !== null;
                const endpoint = isEditing
                    ? `/api/admin/users/${encodeURIComponent(editingUserId)}`
                    : '/api/admin/users';

                const response = await fetch(endpoint, {
                    method: isEditing ? 'PATCH' : 'POST',
                    credentials: 'same-origin',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                const result = await response.json();

                if (!response.ok) {
                    const errorMessage = typeof result.error === 'string'
                        ? result.error
                        : result.error?.message;

                    throw new Error(
                        errorMessage || `Error HTTP ${response.status}`
                    );
                }

                form.reset();
                editingUserId = null;
                panel.hidden = true;
                panel.style.display = 'none';
                formMessage.textContent = '';

                await loadUsers();

            } catch (error) {
                formMessage.textContent = error.message;
            } finally {
                saveButton.disabled = false;
            }
        });
    }

    async function initialize() {
        try {
            const response = await fetch('/api/auth/me', {
                credentials: 'same-origin',
                cache: 'no-store'
            });

            if (!response.ok) return;

            const result = await response.json();

            // Se validará la estructura real de esta respuesta.
            const user = result.data?.user;

            if (user?.role !== 'superadmin' ||
                user.password_change_required) return;

            authorized = true;
            nav.hidden = false;
            nav.style.display = '';
            initializeCreateForm();
            initializePasswordDialog();

            nav.addEventListener('click', () => {
                if (!authorized) return;

                document.getElementById('pageTitle').textContent =
                    'Administración de usuarios';

                loadUsers();
            });

            const previousShowView = showView;

            showView = function showAdminAwareView(selectedView) {
                if (selectedView === 'admin' && !authorized) return;

                previousShowView(selectedView);

                if (selectedView === 'admin') {
                    document.getElementById('pageTitle').textContent =
                        'Administración de usuarios';
                }
            };

            search.addEventListener('input', renderUsers);
            roleFilter.addEventListener('change', renderUsers);
            statusFilter.addEventListener('change', renderUsers);
        } catch (error) {
            console.error('No se pudo verificar el acceso administrativo.', error);
        }
    }

    initialize();
})();
