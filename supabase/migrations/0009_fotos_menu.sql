-- =====================================================================
-- Fase 6: el administrador edita el menú y sube las fotos de los platos desde el panel.
--
-- Los platos y categorías ya se pueden editar (políticas "admin productos" y "admin categorias").
-- Aquí se crea el espacio de fotos "platos" en Supabase Storage:
--   · Público para ver (la página de pedidos muestra las fotos sin iniciar sesión).
--   · Solo el administrador del restaurante sube, cambia o borra fotos.
--   · Cada foto se guarda en una carpeta con el id del restaurante: <restaurant_id>/<archivo>.webp
-- Se puede correr más de una vez sin problema.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('platos', 'platos', true, 5242880, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- La carpeta debe ser un id de restaurante válido; si no lo es, simplemente no da permiso.
create or replace function public.es_admin_de_carpeta(p_nombre text)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  v_carpeta text := split_part(p_nombre, '/', 1);
begin
  if v_carpeta !~ '^[0-9a-f-]{36}$' then
    return false;
  end if;
  return is_member(v_carpeta::uuid, '{admin}');
end;
$$;

drop policy if exists "admin ve fotos"     on storage.objects;
drop policy if exists "admin sube fotos"   on storage.objects;
drop policy if exists "admin cambia fotos" on storage.objects;
drop policy if exists "admin borra fotos"  on storage.objects;

create policy "admin ve fotos" on storage.objects for select to authenticated
  using (bucket_id = 'platos' and public.es_admin_de_carpeta(name));
create policy "admin sube fotos" on storage.objects for insert to authenticated
  with check (bucket_id = 'platos' and public.es_admin_de_carpeta(name));
create policy "admin cambia fotos" on storage.objects for update to authenticated
  using (bucket_id = 'platos' and public.es_admin_de_carpeta(name));
create policy "admin borra fotos" on storage.objects for delete to authenticated
  using (bucket_id = 'platos' and public.es_admin_de_carpeta(name));
