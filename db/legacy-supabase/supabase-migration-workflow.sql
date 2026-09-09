-- Ejecuta este archivo porque tu proyecto ya tiene tablas creadas.
-- Agrega estados, reglas parametrizadas y deja lista la revisión persistente.
alter type public.request_status add value if not exists 'in_review';
alter type public.request_status add value if not exists 'resolved';
alter type public.request_status add value if not exists 'approved';
alter table public.business_rules add column if not exists min_advance_hours integer not null default 0;
alter table public.business_rules add column if not exists same_day_cutoff time;
alter table public.business_rules add column if not exists requires_evidence boolean not null default false;
alter table public.business_rules add column if not exists coordinator_allowed boolean not null default true;
alter table public.business_rules add column if not exists supervisor_allowed boolean not null default true;
alter table public.requests add column if not exists employee_dni_2 text references public.dotacion(dni);
alter table public.requests add column if not exists event_dates jsonb;
alter table public.requests add column if not exists period_type text;
alter table public.requests add column if not exists exception_type text;

-- Reemplaza la política anterior de edición amplia por edición exclusiva de WFM.
drop policy if exists "wfm y gerencia editan reglas" on public.business_rules;
drop policy if exists "solo wfm editan reglas" on public.business_rules;
drop policy if exists "solo wfm actualizan reglas" on public.business_rules;
create policy "solo wfm editan reglas" on public.business_rules for insert to authenticated with check (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role = 'wfm'));
create policy "solo wfm actualizan reglas" on public.business_rules for update to authenticated using (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role = 'wfm')) with check (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role = 'wfm'));

insert into public.business_rules (rule_key,title,description,min_advance_hours,same_day_cutoff,requires_evidence,coordinator_allowed,supervisor_allowed)
values
 ('schedule_change','Cambios de horario','Anticipación mínima configurada por WFM.',48,null,true,true,true),
 ('swap','Enroques','Anticipación mínima configurada por WFM.',48,null,false,true,true),
 ('comp_time','Compensados','Solo fechas futuras. El día en curso se recibe hasta la hora configurada.',0,'15:00',false,true,false),
 ('overtime','Horas extra','Registrar el intervalo trabajado y adjuntar soporte si WFM lo solicita.',0,null,false,true,true),
 ('siop_validation','Validación SIOP','Anticipación mínima y evidencia de conexión del asesor.',48,null,true,false,true),
 ('exception','Excepciones','Revisión especial por WFM y Gerencia.',0,null,true,true,true)
on conflict (rule_key) do nothing;
