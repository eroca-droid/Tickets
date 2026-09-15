-- Ejecuta solo este archivo si ya ejecutaste las migraciones anteriores.
-- Es seguro repetirlo: agrega únicamente columnas nuevas.
alter table public.requests add column if not exists employee_dni_2 text references public.dotacion(dni);
alter table public.requests add column if not exists requester_name text;
alter table public.requests add column if not exists event_dates jsonb;
alter table public.requests add column if not exists period_type text;
alter table public.requests add column if not exists exception_type text;
alter table public.requests add column if not exists current_start_time time;
alter table public.requests add column if not exists current_end_time time;
alter table public.requests add column if not exists current_start_time_2 time;
alter table public.requests add column if not exists current_end_time_2 time;
alter table public.requests add column if not exists exception_origin text;
alter table public.business_rules add column if not exists coordinator_allowed boolean not null default true;
alter table public.business_rules add column if not exists supervisor_allowed boolean not null default true;

-- Permisos de captura: Compensados solo Coordinacion, SIOP solo Supervisores.
drop policy if exists "supervisores y coordinadores crean" on public.requests;
drop policy if exists "captura segun rango" on public.requests;
drop policy if exists "captura segun regla y rango" on public.requests;
create policy "captura segun regla y rango" on public.requests for insert to authenticated with check (
  requester_id = auth.uid()
  and exists (
    select 1 from public.profiles p join public.business_rules b on b.rule_key = type::text
    where p.id = auth.uid()
      and ((p.role = 'coordinator' and b.coordinator_allowed) or (p.role = 'supervisor' and b.supervisor_allowed))
  )
);
