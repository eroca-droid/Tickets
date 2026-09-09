\set ON_ERROR_STOP on

begin;
set constraints all deferred;

create temp table business_rules_import (
    id text,
    rule_key text,
    title text,
    description text,
    updated_by text,
    updated_at text,
    min_advance_hours text,
    same_day_cutoff text,
    requires_evidence text,
    coordinator_allowed text,
    supervisor_allowed text
);

create temp table requests_import (
    id text,
    requester_id text,
    type text,
    status text,
    event_date text,
    start_time text,
    end_time text,
    employee_name text,
    reason text,
    evidence_path text,
    connection_evidence_path text,
    exception_detail text,
    hours text,
    review_comment text,
    reviewed_by text,
    reviewed_at text,
    created_at text,
    updated_at text,
    employee_dni text,
    employee_job_title text,
    employee_service text,
    employee_dni_2 text,
    event_dates text,
    period_type text,
    exception_type text,
    requester_name text,
    current_start_time text,
    current_end_time text,
    current_start_time_2 text,
    current_end_time_2 text,
    exception_origin text,
    exception_supervisor_id text,
    exception_supervisor_name text
);

create temp table request_events_import (
    id text,
    request_id text,
    user_id text,
    from_status text,
    to_status text,
    comment text,
    created_at text
);

copy business_rules_import from '/tmp/wfm-business-rules.csv'
with (format csv, header true, encoding 'UTF8');

copy requests_import from '/tmp/wfm-requests.csv'
with (format csv, header true, encoding 'UTF8');

copy request_events_import from '/tmp/wfm-request-events.csv'
with (format csv, header true, encoding 'UTF8');

do $$
begin
    if exists (
        select 1 from business_rules_import
        group by id having count(*) > 1
    ) or exists (
        select 1 from business_rules_import
        group by rule_key having count(*) > 1
    ) then
        raise exception 'El archivo de reglas contiene identificadores duplicados.';
    end if;

    if exists (
        select 1 from requests_import
        group by id having count(*) > 1
    ) then
        raise exception 'El archivo de solicitudes contiene identificadores duplicados.';
    end if;

    if exists (
        select 1 from request_events_import
        group by id having count(*) > 1
    ) then
        raise exception 'El archivo de eventos contiene identificadores duplicados.';
    end if;

    if exists (
        select 1
        from requests_import source
        left join profiles requester on requester.id = source.requester_id::uuid
        left join dotacion employee on employee.dni = source.employee_dni
        left join dotacion second_employee on second_employee.dni = nullif(source.employee_dni_2, '')
        left join profiles reviewer on reviewer.id = nullif(source.reviewed_by, '')::uuid
        left join profiles supervisor on supervisor.id = nullif(source.exception_supervisor_id, '')::uuid
        where requester.id is null
           or employee.dni is null
           or (nullif(source.employee_dni_2, '') is not null and second_employee.dni is null)
           or (nullif(source.reviewed_by, '') is not null and reviewer.id is null)
           or (nullif(source.exception_supervisor_id, '') is not null and supervisor.id is null)
    ) then
        raise exception 'Una solicitud referencia un usuario o DNI inexistente.';
    end if;

    if exists (
        select 1
        from business_rules_import source
        left join profiles updater on updater.id = nullif(source.updated_by, '')::uuid
        where nullif(source.updated_by, '') is not null and updater.id is null
    ) then
        raise exception 'Una regla referencia un usuario inexistente.';
    end if;

    if exists (
        select 1
        from request_events_import source
        left join requests_import imported_request on imported_request.id::bigint = source.request_id::bigint
        left join requests current_request on current_request.id = source.request_id::bigint
        left join profiles event_user on event_user.id = source.user_id::uuid
        where (imported_request.id is null and current_request.id is null)
           or event_user.id is null
    ) then
        raise exception 'Un evento referencia una solicitud o usuario inexistente.';
    end if;
end;
$$;

insert into business_rules (
    id, rule_key, title, description, updated_by, updated_at,
    min_advance_hours, same_day_cutoff, requires_evidence,
    coordinator_allowed, supervisor_allowed
) overriding system value
select
    id::bigint,
    btrim(rule_key),
    regexp_replace(btrim(title), '[[:space:]]+', ' ', 'g'),
    regexp_replace(btrim(description), '[[:space:]]+', ' ', 'g'),
    nullif(updated_by, '')::uuid,
    updated_at::timestamptz,
    min_advance_hours::integer,
    nullif(same_day_cutoff, '')::time,
    requires_evidence::boolean,
    coordinator_allowed::boolean,
    supervisor_allowed::boolean
from business_rules_import
on conflict (rule_key) do update set
    title = excluded.title,
    description = excluded.description,
    updated_by = excluded.updated_by,
    updated_at = excluded.updated_at,
    min_advance_hours = excluded.min_advance_hours,
    same_day_cutoff = excluded.same_day_cutoff,
    requires_evidence = excluded.requires_evidence,
    coordinator_allowed = excluded.coordinator_allowed,
    supervisor_allowed = excluded.supervisor_allowed;

insert into requests (
    id, requester_id, type, status, event_date, start_time, end_time,
    employee_name, reason, evidence_path, connection_evidence_path,
    exception_detail, hours, review_comment, reviewed_by, reviewed_at,
    created_at, updated_at, employee_dni, employee_job_title, employee_service,
    employee_dni_2, event_dates, period_type, exception_type, requester_name,
    current_start_time, current_end_time, current_start_time_2, current_end_time_2,
    exception_origin, exception_supervisor_id, exception_supervisor_name
) overriding system value
select
    id::bigint,
    requester_id::uuid,
    type::request_type,
    status::request_status,
    event_date::date,
    nullif(start_time, '')::time,
    nullif(end_time, '')::time,
    btrim(employee_name),
    btrim(reason),
    nullif(evidence_path, ''),
    nullif(connection_evidence_path, ''),
    nullif(exception_detail, ''),
    nullif(hours, '')::numeric,
    nullif(review_comment, ''),
    nullif(reviewed_by, '')::uuid,
    nullif(reviewed_at, '')::timestamptz,
    created_at::timestamptz,
    updated_at::timestamptz,
    btrim(employee_dni),
    nullif(employee_job_title, ''),
    nullif(employee_service, ''),
    nullif(employee_dni_2, ''),
    coalesce(nullif(event_dates, ''), '[]')::jsonb,
    coalesce(nullif(period_type, ''), 'specific'),
    nullif(exception_type, ''),
    nullif(requester_name, ''),
    nullif(current_start_time, '')::time,
    nullif(current_end_time, '')::time,
    nullif(current_start_time_2, '')::time,
    nullif(current_end_time_2, '')::time,
    nullif(exception_origin, ''),
    nullif(exception_supervisor_id, '')::uuid,
    nullif(exception_supervisor_name, '')
from requests_import
on conflict (id) do update set
    requester_id = excluded.requester_id,
    type = excluded.type,
    status = excluded.status,
    event_date = excluded.event_date,
    start_time = excluded.start_time,
    end_time = excluded.end_time,
    employee_name = excluded.employee_name,
    reason = excluded.reason,
    evidence_path = excluded.evidence_path,
    connection_evidence_path = excluded.connection_evidence_path,
    exception_detail = excluded.exception_detail,
    hours = excluded.hours,
    review_comment = excluded.review_comment,
    reviewed_by = excluded.reviewed_by,
    reviewed_at = excluded.reviewed_at,
    created_at = excluded.created_at,
    updated_at = excluded.updated_at,
    employee_dni = excluded.employee_dni,
    employee_job_title = excluded.employee_job_title,
    employee_service = excluded.employee_service,
    employee_dni_2 = excluded.employee_dni_2,
    event_dates = excluded.event_dates,
    period_type = excluded.period_type,
    exception_type = excluded.exception_type,
    requester_name = excluded.requester_name,
    current_start_time = excluded.current_start_time,
    current_end_time = excluded.current_end_time,
    current_start_time_2 = excluded.current_start_time_2,
    current_end_time_2 = excluded.current_end_time_2,
    exception_origin = excluded.exception_origin,
    exception_supervisor_id = excluded.exception_supervisor_id,
    exception_supervisor_name = excluded.exception_supervisor_name;

insert into request_events (
    id, request_id, user_id, from_status, to_status, comment, created_at
) overriding system value
select
    id::bigint,
    request_id::bigint,
    user_id::uuid,
    nullif(from_status, '')::request_status,
    to_status::request_status,
    nullif(comment, ''),
    created_at::timestamptz
from request_events_import
on conflict (id) do update set
    request_id = excluded.request_id,
    user_id = excluded.user_id,
    from_status = excluded.from_status,
    to_status = excluded.to_status,
    comment = excluded.comment,
    created_at = excluded.created_at;

select setval(
    pg_get_serial_sequence('business_rules', 'id'),
    coalesce(max(id), 1),
    max(id) is not null
) from business_rules;

select setval(
    pg_get_serial_sequence('requests', 'id'),
    coalesce(max(id), 1),
    max(id) is not null
) from requests;

select setval(
    pg_get_serial_sequence('request_events', 'id'),
    coalesce(max(id), 1),
    max(id) is not null
) from request_events;

commit;
