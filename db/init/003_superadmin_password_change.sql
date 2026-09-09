-- Compatibilidad para bases ya inicializadas antes de incorporar superadministradores.
alter type user_role add value if not exists 'superadmin';

alter table profiles
    add column if not exists password_change_required boolean not null default false;
