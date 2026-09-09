-- Ejecuta este archivo si ya habias ejecutado supabase.sql antes de esta version.
create table if not exists public.dotacion (
  dni text primary key,
  full_name text not null,
  job_title text not null,
  service text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.requests add column if not exists employee_dni text references public.dotacion(dni);
alter table public.requests add column if not exists employee_job_title text;
alter table public.requests add column if not exists employee_service text;
alter table public.requests add column if not exists employee_dni_2 text references public.dotacion(dni);
alter table public.requests add column if not exists event_dates jsonb;
alter table public.requests add column if not exists period_type text;
alter table public.requests add column if not exists exception_type text;
create table if not exists public.business_rules (
  id bigint generated always as identity primary key,
  rule_key text unique not null,
  title text not null,
  description text not null,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);
alter table public.dotacion enable row level security;
alter table public.business_rules enable row level security;
create policy "usuarios consultan dotacion" on public.dotacion for select to authenticated using (active = true);
create policy "usuarios consultan reglas" on public.business_rules for select to authenticated using (true);
create policy "wfm y gerencia editan reglas" on public.business_rules for all using (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role in ('wfm','management'))) with check (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role in ('wfm','management')));
