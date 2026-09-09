-- Ejecuta este archivo despues de crear el bucket privado request-evidence.
-- Los archivos se guardaran usando una ruta como: UUID_DEL_USUARIO/nombre-del-archivo.pdf

create policy "usuarios suben sus evidencias"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'request-evidence'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "usuarios ven sus evidencias"
on storage.objects for select to authenticated
using (
  bucket_id = 'request-evidence'
  and (
    (storage.foldername(name))[1] = (select auth.uid()::text)
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('wfm','management')
    )
  )
);

create policy "wfm y gerencia eliminan evidencias"
on storage.objects for delete to authenticated
using (
  bucket_id = 'request-evidence'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('wfm','management')
  )
);

-- Verifica los rangos despues de crear las filas en profiles:
select id, full_name, role, active from public.profiles order by created_at;
