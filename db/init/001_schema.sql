begin;

create extension if not exists citext;
create extension if not exists pgcrypto;

create type user_role as enum ('coordinator', 'supervisor', 'wfm', 'management', 'superadmin');
create type request_type as enum ('schedule_change', 'swap', 'comp_time', 'overtime', 'siop_validation', 'exception');
create type request_status as enum ('pending', 'in_review', 'resolved', 'approved', 'rejected', 'cancelled');

create table profiles (
    id uuid primary key default gen_random_uuid(),
    email citext unique,
    password_hash text,
    password_change_required boolean not null default false,
    full_name text not null,
    role user_role not null default 'coordinator',
    department text,
    coordinator_id uuid references profiles(id) on delete set null deferrable initially deferred,
    active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint password_requires_email check (password_hash is null or email is not null),
    constraint valid_email check (email is null or email::text ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
);

create table dotacion (
    dni text primary key,
    full_name text not null,
    job_title text not null,
    service text not null,
    active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table business_rules (
    id bigint generated always as identity primary key,
    rule_key text unique not null,
    title text not null,
    description text not null,
    min_advance_hours integer not null default 0,
    same_day_cutoff time,
    requires_evidence boolean not null default false,
    coordinator_allowed boolean not null default true,
    supervisor_allowed boolean not null default true,
    updated_by uuid references profiles(id) on delete set null,
    updated_at timestamptz not null default now(),
    constraint known_rule_key check (rule_key in (
        'schedule_change', 'swap', 'comp_time', 'overtime', 'siop_validation', 'exception'
    )),
    constraint valid_min_advance check (min_advance_hours between 0 and 720)
);

create table requests (
    id bigint generated always as identity primary key,
    requester_id uuid not null references profiles(id),
    requester_name text,
    type request_type not null,
    status request_status not null default 'pending',
    event_date date not null,
    start_time time,
    end_time time,
    employee_name text not null,
    employee_dni text references dotacion(dni),
    employee_dni_2 text references dotacion(dni),
    employee_job_title text,
    employee_service text,
    current_start_time time,
    current_end_time time,
    current_start_time_2 time,
    current_end_time_2 time,
    event_dates jsonb default '[]'::jsonb,
    period_type text default 'specific',
    exception_type text,
    exception_origin text,
    exception_supervisor_id uuid references profiles(id) on delete set null,
    exception_supervisor_name text,
    reason text not null,
    evidence_path text,
    connection_evidence_path text,
    exception_detail text,
    hours numeric(5, 2),
    review_comment text,
    reviewed_by uuid references profiles(id) on delete set null,
    reviewed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint valid_time_range check (start_time is null or end_time is null or start_time < end_time),
    constraint valid_current_time_range check (
        current_start_time is null or current_end_time is null or current_start_time < current_end_time
    ),
    constraint valid_current_time_range_2 check (
        current_start_time_2 is null or current_end_time_2 is null or current_start_time_2 < current_end_time_2
    ),
    constraint valid_hours check (hours is null or (hours > 0 and hours <= 24)),
    constraint valid_event_dates check (event_dates is null or jsonb_typeof(event_dates) = 'array'),
    constraint valid_period_type check (period_type is null or period_type in ('specific', 'current_week', 'month', 'weekend')),
    constraint valid_exception_type check (
        (type <> 'exception') or exception_type is null or
        exception_type in ('schedule_change', 'swap', 'comp_time', 'overtime', 'siop_validation')
    ),
    constraint valid_exception_origin check (
        exception_origin is null or exception_origin in ('coordinator', 'supervisor', 'agent')
    ),
    constraint valid_swap_agents check (
        type <> 'swap' or employee_dni_2 is null or employee_dni_2 <> employee_dni
    )
);

create table request_events (
    id bigint generated always as identity primary key,
    request_id bigint not null references requests(id) on delete cascade,
    user_id uuid not null references profiles(id),
    from_status request_status,
    to_status request_status not null,
    comment text,
    created_at timestamptz not null default now()
);

create table sessions (
    token_hash char(64) primary key,
    user_id uuid not null references profiles(id) on delete cascade,
    expires_at timestamptz not null,
    ip_address inet,
    user_agent text,
    created_at timestamptz not null default now()
);

create table evidence_uploads (
    path text primary key,
    uploaded_by uuid not null references profiles(id),
    request_id bigint unique references requests(id) on delete cascade,
    original_name text not null,
    mime_type text not null,
    size_bytes integer not null check (size_bytes > 0),
    created_at timestamptz not null default now()
);

create index profiles_coordinator_active_idx on profiles (coordinator_id, full_name) where active;
create index dotacion_active_name_idx on dotacion (full_name) where active;
create index requests_created_at_idx on requests (created_at desc);
create index requests_requester_created_idx on requests (requester_id, created_at desc);
create index requests_status_created_idx on requests (status, created_at desc);
create index requests_type_created_idx on requests (type, created_at desc);
create index requests_event_date_idx on requests (event_date);
create index request_events_request_created_idx on request_events (request_id, created_at);
create index sessions_user_idx on sessions (user_id);
create index sessions_expiry_idx on sessions (expires_at);
create index evidence_uploads_owner_idx on evidence_uploads (uploaded_by, created_at desc);

create function set_updated_at() returns trigger
language plpgsql as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger profiles_set_updated_at before update on profiles
for each row execute function set_updated_at();

create trigger dotacion_set_updated_at before update on dotacion
for each row execute function set_updated_at();

create trigger requests_set_updated_at before update on requests
for each row execute function set_updated_at();

commit;
