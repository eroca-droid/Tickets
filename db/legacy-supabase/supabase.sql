-- Turno Claro: modelo inicial para Supabase (Postgres)
create extension if not exists "uuid-ossp";
create type public.user_role as enum ('coordinator','supervisor','wfm','management');
create type public.request_type as enum ('schedule_change','swap','comp_time','overtime','siop_validation','exception');
create type public.request_status as enum ('pending','in_review','resolved','approved','rejected','cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.user_role not null default 'coordinator',
  department text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.dotacion (
  dni text primary key,
  full_name text not null,
  job_title text not null,
  service text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.business_rules (
  id bigint generated always as identity primary key,
  rule_key text unique not null,
  title text not null,
  description text not null,
  min_advance_hours integer not null default 0,
  same_day_cutoff time,
  requires_evidence boolean not null default false,
  coordinator_allowed boolean not null default true,
  supervisor_allowed boolean not null default true,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);
create table public.requests (
  id bigint generated always as identity primary key,
  requester_id uuid not null references public.profiles(id),
  requester_name text,
  type public.request_type not null,
  status public.request_status not null default 'pending',
  event_date date not null,
  start_time time,
  end_time time,
  employee_name text not null,
  employee_dni text references public.dotacion(dni),
  employee_job_title text,
  employee_service text,
  current_start_time time,
  current_end_time time,
  current_start_time_2 time,
  current_end_time_2 time,
  employee_dni_2 text references public.dotacion(dni),
  event_dates jsonb,
  period_type text,
  exception_type text,
  reason text not null,
  evidence_path text,
  connection_evidence_path text,
  exception_detail text,
  exception_origin text,
  hours numeric(5,2),
  review_comment text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_time_range check (start_time is null or end_time is null or start_time < end_time),
  constraint valid_hours check (hours is null or hours > 0)
);
create table public.request_events (
  id bigint generated always as identity primary key,
  request_id bigint not null references public.requests(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  from_status public.request_status,
  to_status public.request_status not null,
  comment text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.dotacion enable row level security;
alter table public.business_rules enable row level security;
alter table public.requests enable row level security;
alter table public.request_events enable row level security;
create policy "usuarios ven su perfil" on public.profiles for select using (id = auth.uid());
create policy "usuarios consultan dotacion" on public.dotacion for select to authenticated using (active = true);
create policy "usuarios consultan reglas" on public.business_rules for select to authenticated using (true);
create policy "solo wfm editan reglas" on public.business_rules for insert to authenticated with check (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role = 'wfm'));
create policy "solo wfm actualizan reglas" on public.business_rules for update to authenticated using (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role = 'wfm')) with check (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role = 'wfm'));
create policy "usuarios autenticados ven todos los tickets" on public.requests for select to authenticated using (true);
create policy "captura segun regla y rango" on public.requests for insert with check (requester_id = auth.uid() and exists (select 1 from public.profiles p join public.business_rules b on b.rule_key = type::text where p.id=auth.uid() and ((p.role = 'coordinator' and b.coordinator_allowed) or (p.role = 'supervisor' and b.supervisor_allowed))));
create policy "wfm y gerencia actualizan" on public.requests for update using (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role in ('wfm','management')));
create policy "wfm y gerencia eliminan" on public.requests for delete using (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role in ('wfm','management')));
create policy "solicitantes ven historial propio" on public.request_events for select using (exists (select 1 from public.requests r where r.id=request_id and r.requester_id=auth.uid()));
create policy "wfm y gerencia ven historial" on public.request_events for select using (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role in ('wfm','management')));
create policy "wfm y gerencia registran historial" on public.request_events for insert with check (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role in ('wfm','management')));

-- Validación SIOP: evidencia obligatoria de conexión; si es menor a 48h,
-- exception_detail debe explicar por qué no se realizó la marcación.
-- Compensados: event_date debe ser futura o del día actual antes de las 15:00.
