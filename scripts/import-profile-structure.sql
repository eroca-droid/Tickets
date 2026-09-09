\set ON_ERROR_STOP on

begin;
set constraints all deferred;

create temp table profiles_import (
    id text,
    full_name text,
    role text,
    department text,
    active text,
    created_at text,
    coordinator_id text
);

copy profiles_import from '/tmp/wfm-profiles.csv'
with (format csv, header true, encoding 'UTF8');

do $$
begin
    if (select count(*) from profiles_import) <> 37 then
        raise exception 'Se esperaban 37 perfiles en el archivo.';
    end if;

    if exists (
        select 1 from profiles_import group by id having count(*) > 1
    ) then
        raise exception 'El archivo contiene UUID duplicados.';
    end if;

    if exists (
        select 1
        from profiles_import source
        left join profiles target on target.id = source.id::uuid
        where target.id is null
    ) then
        raise exception 'El archivo contiene un perfil que no existe en PostgreSQL.';
    end if;

    if exists (
        select 1
        from profiles_import source
        left join profiles coordinator on coordinator.id = nullif(source.coordinator_id, '')::uuid
        where nullif(source.coordinator_id, '') is not null and coordinator.id is null
    ) then
        raise exception 'El archivo referencia un coordinador inexistente.';
    end if;
end;
$$;

update profiles target
set
    full_name = regexp_replace(btrim(source.full_name), '[[:space:]]+', ' ', 'g'),
    role = case
        when target.role = 'superadmin' then 'superadmin'::user_role
        else source.role::user_role
    end,
    department = nullif(btrim(source.department), ''),
    active = source.active::boolean,
    created_at = source.created_at::timestamptz,
    coordinator_id = nullif(source.coordinator_id, '')::uuid
from profiles_import source
where target.id = source.id::uuid;

commit;
