-- Ejecuta una vez si quieres que todos los usuarios autenticados
-- vean la base completa y luego puedan usar el filtro Mis tickets.
drop policy if exists "solicitantes ven sus solicitudes" on public.requests;
drop policy if exists "wfm y gerencia ven todas" on public.requests;
create policy "usuarios autenticados ven todos los tickets"
on public.requests for select to authenticated using (true);
