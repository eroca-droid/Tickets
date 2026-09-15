/* Cliente HTTP compatible con las operaciones que usa la interfaz. */
(function createApiClient(global) {
    'use strict';

    global.escapeHtml = value => String(value ?? '').replace(
        /[&<>"']/g,
        character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character]
    );

    async function request(url, options = {}) {
        try {
            const response = await fetch(url, {
                credentials: 'same-origin',
                ...options,
                headers: {
                    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
                    ...options.headers
                }
            });
            const payload = response.status === 204 ? {} : await response.json();
            if (!response.ok) {
                return { data: null, error: { message: payload.error || 'No se pudo completar la solicitud.' } };
            }
            return { data: payload.data ?? null, error: null };
        } catch (error) {
            return { data: null, error: { message: error.message || 'No hay conexión con el servidor.' } };
        }
    }

    class QueryBuilder {
        constructor(table) {
            this.table = table;
            this.operation = 'select';
            this.columns = '*';
            this.filters = {};
            this.ordering = null;
            this.values = null;
            this.mode = 'many';
        }

        select(columns = '*') {
            this.operation = 'select';
            this.columns = columns;
            return this;
        }

        insert(values) {
            this.operation = 'insert';
            this.values = values;
            return this;
        }

        update(values) {
            this.operation = 'update';
            this.values = values;
            return this;
        }

        upsert(values, options = {}) {
            this.operation = 'upsert';
            this.values = values;
            this.upsertOptions = options;
            return this;
        }

        eq(column, value) {
            this.filters[column] = value;
            return this;
        }

        order(column, options = {}) {
            this.ordering = { column, ascending: options.ascending !== false };
            return this;
        }

        single() {
            this.mode = 'single';
            return this.execute();
        }

        maybeSingle() {
            this.mode = 'maybeSingle';
            return this.execute();
        }

        then(resolve, reject) {
            return this.execute().then(resolve, reject);
        }

        async execute() {
            let result;

            if (this.operation === 'select') {
                const params = new URLSearchParams({
                    select: this.columns,
                    filters: JSON.stringify(this.filters)
                });
                if (this.ordering) {
                    params.set('order', this.ordering.column);
                    params.set('ascending', String(this.ordering.ascending));
                }
                result = await request(`/api/data/${encodeURIComponent(this.table)}?${params}`);
                if (result.error) return result;

                if (this.mode === 'single') {
                    if (result.data.length !== 1) {
                        return { data: null, error: { message: 'No se encontró un único registro.' } };
                    }
                    return { data: result.data[0], error: null };
                }
                if (this.mode === 'maybeSingle') {
                    if (result.data.length > 1) {
                        return { data: null, error: { message: 'Se encontró más de un registro.' } };
                    }
                    return { data: result.data[0] || null, error: null };
                }
                return result;
            }

            const method = this.operation === 'update' ? 'PATCH' : 'POST';
            return request(`/api/data/${encodeURIComponent(this.table)}`, {
                method,
                body: JSON.stringify({
                    operation: this.operation,
                    values: this.values,
                    filters: this.filters,
                    options: this.upsertOptions
                })
            });
        }
    }

    global.apiClient = {
        auth: {
            async getSession() {
                const result = await request('/api/auth/me');
                if (result.error) return { data: { session: null }, error: result.error };
                return {
                    data: { session: { ...result.data.session, user: result.data.user } },
                    error: null
                };
            },

            async getUser() {
                const result = await request('/api/auth/me');
                if (result.error) return { data: { user: null }, error: result.error };
                return { data: { user: result.data.user }, error: null };
            },

            signInWithPassword(credentials) {
                return request('/api/auth/login', {
                    method: 'POST',
                    body: JSON.stringify(credentials)
                });
            },

            signOut() {
                return request('/api/auth/logout', { method: 'POST' });
            },

            updateUser({ password }) {
                return request('/api/auth/password', {
                    method: 'PATCH',
                    body: JSON.stringify({ password })
                });
            }
        },

        from(table) {
            return new QueryBuilder(table);
        },

        storage: {
            from() {
                return {
                    async upload(path, file) {
                        const form = new FormData();
                        form.append('path', path);
                        form.append('file', file);
                        return request('/api/evidence', { method: 'POST', body: form });
                    },

                    async createSignedUrl(path) {
                        if (!path) return { data: null, error: { message: 'Ruta de evidencia no válida.' } };
                        return {
                            data: { signedUrl: `/api/evidence?path=${encodeURIComponent(path)}` },
                            error: null
                        };
                    }
                };
            }
        }
    };
})(window);
