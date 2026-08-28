-- ============================================================================
-- Publicidad: ads a supervisor configures per-branch, shown in a rotating
-- panel on the public display screen. Images live in Supabase Storage.
-- ============================================================================

create table anuncios (
  id uuid primary key default gen_random_uuid(),
  sucursal_id uuid not null references sucursales (id) on delete cascade,
  titulo text,
  imagen_url text not null,
  activo boolean not null default true,
  orden int not null default 0,
  created_at timestamptz not null default now()
);

create index idx_anuncios_sucursal on anuncios (sucursal_id, activo, orden);

alter table anuncios enable row level security;

create policy anuncios_select_publico on anuncios
  for select to anon, authenticated
  using (activo = true);

create policy anuncios_gestion_staff on anuncios
  for all to authenticated
  using (fn_rol_actual() = 'admin' or (fn_rol_actual() = 'supervisor' and sucursal_id = fn_sucursal_actual()))
  with check (fn_rol_actual() = 'admin' or (fn_rol_actual() = 'supervisor' and sucursal_id = fn_sucursal_actual()));

-- ----------------------------------------------------------------------------
-- Storage bucket for ad images: public read (kiosco/display are anon),
-- write/delete restricted to supervisor/admin.
-- ----------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('publicidad', 'publicidad', true)
on conflict (id) do nothing;

create policy "publicidad_lectura_publica"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'publicidad');

create policy "publicidad_subida_staff"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'publicidad'
    and (public.fn_rol_actual() = 'admin' or public.fn_rol_actual() = 'supervisor')
  );

create policy "publicidad_borrado_staff"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'publicidad'
    and (public.fn_rol_actual() = 'admin' or public.fn_rol_actual() = 'supervisor')
  );
