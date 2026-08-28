-- ============================================================================
-- Fase 2: business logic (RPCs), Row Level Security, and pg_cron jobs.
-- Builds on top of 20260705120000_schema_inicial.sql.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Auth helpers (SECURITY DEFINER so they can read perfiles without
-- recursing into the RLS policies defined on perfiles below).
-- ----------------------------------------------------------------------------

create or replace function fn_rol_actual()
returns rol_usuario
language sql
stable
security definer
set search_path = public
as $$
  select rol from perfiles where id = auth.uid();
$$;

create or replace function fn_sucursal_actual()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select sucursal_id from perfiles where id = auth.uid();
$$;

revoke execute on function fn_rol_actual() from public;
revoke execute on function fn_sucursal_actual() from public;

-- ----------------------------------------------------------------------------
-- Seed sane default configuracion for every new branch, so the cron jobs
-- below always have a value to read (no branch is left unconfigured).
-- ----------------------------------------------------------------------------

create or replace function fn_sembrar_configuracion_default()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into configuracion (sucursal_id, clave, valor)
  values
    (new.id, 'timeout_ausente_segundos', '60'),
    (new.id, 'limite_pausa_minutos', '15'),
    (new.id, 'ratio_preferencial', '2'),
    (new.id, 'minutos_escalacion_urgente', '15')
  on conflict (sucursal_id, clave) do nothing;
  return new;
end;
$$;

create trigger trg_sucursales_seed_configuracion
  after insert on sucursales
  for each row
  execute function fn_sembrar_configuracion_default();

revoke execute on function fn_sembrar_configuracion_default() from public;
revoke execute on function fn_siguiente_numero_ticket(uuid, date) from public;

-- ============================================================================
-- RPCs
-- ============================================================================

-- ----------------------------------------------------------------------------
-- tomar_ticket: callable anonymously from the kiosco. Creates a turno with
-- the next sequential daily number for the service.
-- ----------------------------------------------------------------------------

create or replace function tomar_ticket(p_servicio_id uuid, p_prioridad prioridad_turno)
returns turnos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_servicio servicios;
  v_fecha date;
  v_numero int;
  v_turno turnos;
begin
  if p_prioridad = 'URGENTE' then
    raise exception 'La prioridad URGENTE no puede seleccionarse manualmente';
  end if;

  select * into v_servicio from servicios where id = p_servicio_id and activo = true;
  if not found then
    raise exception 'Servicio no encontrado o inactivo';
  end if;

  if not exists (select 1 from sucursales where id = v_servicio.sucursal_id and activa = true) then
    raise exception 'Sucursal inactiva';
  end if;

  v_fecha := (now() at time zone 'America/Tegucigalpa')::date;
  v_numero := fn_siguiente_numero_ticket(p_servicio_id, v_fecha);

  insert into turnos (
    sucursal_id, servicio_id, numero_ticket, prefijo_ticket, fecha_ticket, prioridad
  ) values (
    v_servicio.sucursal_id, p_servicio_id, v_numero, v_servicio.prefijo_ticket, v_fecha, p_prioridad
  )
  returning * into v_turno;

  return v_turno;
end;
$$;

revoke execute on function tomar_ticket(uuid, prioridad_turno) from public;
grant execute on function tomar_ticket(uuid, prioridad_turno) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- llamar_siguiente_turno: the core queue-picking RPC.
-- Order of precedence: URGENTE first, then the 2:1 normal/preferencial ratio,
-- restricted to services assigned to the calling ventanilla, FIFO within
-- each bucket. FOR UPDATE SKIP LOCKED guarantees two concurrent callers
-- never land on the same row.
-- ----------------------------------------------------------------------------

create or replace function llamar_siguiente_turno(p_ventanilla_id uuid)
returns turnos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_agente_id uuid := auth.uid();
  v_sucursal_id uuid;
  v_ratio int;
  v_consecutivos_normal int;
  v_prioridad_objetivo prioridad_turno;
  v_prioridad_alterna prioridad_turno;
  v_turno turnos;
begin
  if v_agente_id is null then
    raise exception 'Debe iniciar sesión';
  end if;

  if not exists (
    select 1 from ventanilla_agentes
    where ventanilla_id = p_ventanilla_id and agente_id = v_agente_id
  ) then
    raise exception 'No autorizado para operar esta ventanilla';
  end if;

  select sucursal_id into v_sucursal_id from ventanillas
  where id = p_ventanilla_id and activa = true;

  if v_sucursal_id is null then
    raise exception 'Ventanilla no encontrada o inactiva';
  end if;

  -- 1. URGENTE always jumps the queue, regardless of the ratio.
  select * into v_turno from turnos
  where estado = 'ESPERANDO'
    and prioridad = 'URGENTE'
    and sucursal_id = v_sucursal_id
    and servicio_id in (select servicio_id from ventanilla_servicios where ventanilla_id = p_ventanilla_id)
  order by created_at asc
  limit 1
  for update skip locked;

  -- 2. No URGENTE waiting: decide NORMAL vs PREFERENCIAL via the 2:1 ratio,
  --    based on this ventanilla's own recent call history.
  if v_turno.id is null then
    select coalesce((select valor::int from configuracion where sucursal_id = v_sucursal_id and clave = 'ratio_preferencial'), 2)
      into v_ratio;

    select count(*) into v_consecutivos_normal
    from (
      select prioridad from turnos
      where ventanilla_id = p_ventanilla_id
        and prioridad in ('NORMAL', 'PREFERENCIAL')
        and llamado_at is not null
      order by llamado_at desc
      limit v_ratio
    ) ultimos
    where prioridad = 'NORMAL';

    if v_consecutivos_normal >= v_ratio then
      v_prioridad_objetivo := 'PREFERENCIAL';
      v_prioridad_alterna := 'NORMAL';
    else
      v_prioridad_objetivo := 'NORMAL';
      v_prioridad_alterna := 'PREFERENCIAL';
    end if;

    select * into v_turno from turnos
    where estado = 'ESPERANDO'
      and prioridad = v_prioridad_objetivo
      and sucursal_id = v_sucursal_id
      and servicio_id in (select servicio_id from ventanilla_servicios where ventanilla_id = p_ventanilla_id)
    order by created_at asc
    limit 1
    for update skip locked;

    -- Fall back to the other bucket so the counter never idles when the
    -- queues are lopsided (e.g. no preferencial waiting).
    if v_turno.id is null then
      select * into v_turno from turnos
      where estado = 'ESPERANDO'
        and prioridad = v_prioridad_alterna
        and sucursal_id = v_sucursal_id
        and servicio_id in (select servicio_id from ventanilla_servicios where ventanilla_id = p_ventanilla_id)
      order by created_at asc
      limit 1
      for update skip locked;
    end if;
  end if;

  if v_turno.id is null then
    return null;
  end if;

  update turnos
  set estado = 'LLAMANDO', ventanilla_id = p_ventanilla_id, agente_id = v_agente_id
  where id = v_turno.id
  returning * into v_turno;

  return v_turno;
end;
$$;

revoke execute on function llamar_siguiente_turno(uuid) from public;
grant execute on function llamar_siguiente_turno(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- iniciar_atencion / finalizar_turno / rellamar_turno: simple state
-- transitions, restricted to the agent who currently owns the turno.
-- ----------------------------------------------------------------------------

create or replace function iniciar_atencion(p_turno_id uuid)
returns turnos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_turno turnos;
begin
  update turnos
  set estado = 'EN_ATENCION'
  where id = p_turno_id and agente_id = auth.uid() and estado = 'LLAMANDO'
  returning * into v_turno;

  if v_turno.id is null then
    raise exception 'Turno no encontrado, no pertenece a este agente, o no está en estado LLAMANDO';
  end if;

  return v_turno;
end;
$$;

create or replace function finalizar_turno(p_turno_id uuid)
returns turnos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_turno turnos;
begin
  update turnos
  set estado = 'FINALIZADO'
  where id = p_turno_id and agente_id = auth.uid() and estado = 'EN_ATENCION'
  returning * into v_turno;

  if v_turno.id is null then
    raise exception 'Turno no encontrado, no pertenece a este agente, o no está en estado EN_ATENCION';
  end if;

  return v_turno;
end;
$$;

create or replace function rellamar_turno(p_turno_id uuid)
returns turnos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_turno turnos;
begin
  update turnos
  set llamado_at = now()
  where id = p_turno_id and agente_id = auth.uid() and estado = 'LLAMANDO'
  returning * into v_turno;

  if v_turno.id is null then
    raise exception 'Turno no encontrado, no pertenece a este agente, o no está en estado LLAMANDO';
  end if;

  return v_turno;
end;
$$;

revoke execute on function iniciar_atencion(uuid) from public;
revoke execute on function finalizar_turno(uuid) from public;
revoke execute on function rellamar_turno(uuid) from public;
grant execute on function iniciar_atencion(uuid) to authenticated;
grant execute on function finalizar_turno(uuid) to authenticated;
grant execute on function rellamar_turno(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- reactivar_ausente: supervisor-only (admin included as a superset role).
-- ----------------------------------------------------------------------------

create or replace function reactivar_ausente(p_turno_id uuid)
returns turnos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rol rol_usuario := fn_rol_actual();
  v_sucursal_actual uuid := fn_sucursal_actual();
  v_turno turnos;
begin
  if v_rol not in ('supervisor', 'admin') then
    raise exception 'Solo un supervisor puede reactivar un turno ausente';
  end if;

  select * into v_turno from turnos where id = p_turno_id and estado = 'AUSENTE' for update;

  if v_turno.id is null then
    raise exception 'Turno no encontrado o no está en estado AUSENTE';
  end if;

  if v_rol <> 'admin' and v_turno.sucursal_id <> v_sucursal_actual then
    raise exception 'No autorizado para reactivar turnos de otra sucursal';
  end if;

  update turnos
  set estado = 'ESPERANDO'
  where id = p_turno_id
  returning * into v_turno;

  return v_turno;
end;
$$;

revoke execute on function reactivar_ausente(uuid) from public;
grant execute on function reactivar_ausente(uuid) to authenticated;

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table sucursales enable row level security;
alter table perfiles enable row level security;
alter table servicios enable row level security;
alter table ventanillas enable row level security;
alter table ventanilla_servicios enable row level security;
alter table ventanilla_agentes enable row level security;
alter table turnos enable row level security;
alter table pausas_agente enable row level security;
alter table configuracion enable row level security;

-- --- sucursales ---------------------------------------------------------

create policy sucursales_select_publico on sucursales
  for select to anon, authenticated
  using (activa = true);

create policy sucursales_select_staff on sucursales
  for select to authenticated
  using (fn_rol_actual() in ('supervisor', 'admin'));

create policy sucursales_gestion_admin on sucursales
  for all to authenticated
  using (fn_rol_actual() = 'admin')
  with check (fn_rol_actual() = 'admin');

-- --- servicios -----------------------------------------------------------

create policy servicios_select_publico on servicios
  for select to anon, authenticated
  using (activo = true);

create policy servicios_select_staff on servicios
  for select to authenticated
  using (fn_rol_actual() = 'admin' or sucursal_id = fn_sucursal_actual());

create policy servicios_gestion_staff on servicios
  for all to authenticated
  using (fn_rol_actual() = 'admin' or (fn_rol_actual() = 'supervisor' and sucursal_id = fn_sucursal_actual()))
  with check (fn_rol_actual() = 'admin' or (fn_rol_actual() = 'supervisor' and sucursal_id = fn_sucursal_actual()));

-- --- ventanillas -----------------------------------------------------------

create policy ventanillas_select_publico on ventanillas
  for select to anon, authenticated
  using (activa = true);

create policy ventanillas_select_staff on ventanillas
  for select to authenticated
  using (fn_rol_actual() = 'admin' or sucursal_id = fn_sucursal_actual());

create policy ventanillas_gestion_staff on ventanillas
  for all to authenticated
  using (fn_rol_actual() = 'admin' or (fn_rol_actual() = 'supervisor' and sucursal_id = fn_sucursal_actual()))
  with check (fn_rol_actual() = 'admin' or (fn_rol_actual() = 'supervisor' and sucursal_id = fn_sucursal_actual()));

-- --- ventanilla_servicios / ventanilla_agentes (junction tables) ----------

create policy ventanilla_servicios_select_staff on ventanilla_servicios
  for select to authenticated
  using (
    fn_rol_actual() = 'admin'
    or exists (select 1 from ventanillas v where v.id = ventanilla_id and v.sucursal_id = fn_sucursal_actual())
  );

create policy ventanilla_servicios_gestion_staff on ventanilla_servicios
  for all to authenticated
  using (
    fn_rol_actual() = 'admin'
    or (fn_rol_actual() = 'supervisor' and exists (select 1 from ventanillas v where v.id = ventanilla_id and v.sucursal_id = fn_sucursal_actual()))
  )
  with check (
    fn_rol_actual() = 'admin'
    or (fn_rol_actual() = 'supervisor' and exists (select 1 from ventanillas v where v.id = ventanilla_id and v.sucursal_id = fn_sucursal_actual()))
  );

create policy ventanilla_agentes_select_staff on ventanilla_agentes
  for select to authenticated
  using (
    fn_rol_actual() = 'admin'
    or agente_id = auth.uid()
    or exists (select 1 from ventanillas v where v.id = ventanilla_id and v.sucursal_id = fn_sucursal_actual())
  );

create policy ventanilla_agentes_gestion_staff on ventanilla_agentes
  for all to authenticated
  using (
    fn_rol_actual() = 'admin'
    or (fn_rol_actual() = 'supervisor' and exists (select 1 from ventanillas v where v.id = ventanilla_id and v.sucursal_id = fn_sucursal_actual()))
  )
  with check (
    fn_rol_actual() = 'admin'
    or (fn_rol_actual() = 'supervisor' and exists (select 1 from ventanillas v where v.id = ventanilla_id and v.sucursal_id = fn_sucursal_actual()))
  );

-- --- perfiles --------------------------------------------------------------

create policy perfiles_select on perfiles
  for select to authenticated
  using (
    id = auth.uid()
    or fn_rol_actual() = 'admin'
    or (fn_rol_actual() = 'supervisor' and sucursal_id = fn_sucursal_actual())
  );

create policy perfiles_gestion_staff on perfiles
  for all to authenticated
  using (fn_rol_actual() = 'admin' or (fn_rol_actual() = 'supervisor' and sucursal_id = fn_sucursal_actual()))
  with check (fn_rol_actual() = 'admin' or (fn_rol_actual() = 'supervisor' and sucursal_id = fn_sucursal_actual()));

-- --- turnos ------------------------------------------------------------
-- No INSERT/UPDATE/DELETE policies for anon/authenticated: every mutation
-- goes through the SECURITY DEFINER RPCs above, which run as the function
-- owner and bypass RLS entirely.

create policy turnos_select_publico on turnos
  for select to anon, authenticated
  using (estado <> 'ESPERANDO');

create policy turnos_select_staff on turnos
  for select to authenticated
  using (fn_rol_actual() = 'admin' or sucursal_id = fn_sucursal_actual());

-- --- pausas_agente -----------------------------------------------------

create policy pausas_select on pausas_agente
  for select to authenticated
  using (
    agente_id = auth.uid()
    or fn_rol_actual() = 'admin'
    or (fn_rol_actual() = 'supervisor' and exists (select 1 from perfiles p where p.id = agente_id and p.sucursal_id = fn_sucursal_actual()))
  );

create policy pausas_insert_self on pausas_agente
  for insert to authenticated
  with check (agente_id = auth.uid());

create policy pausas_update_self on pausas_agente
  for update to authenticated
  using (agente_id = auth.uid())
  with check (agente_id = auth.uid());

-- --- configuracion -------------------------------------------------------

create policy configuracion_select_staff on configuracion
  for select to authenticated
  using (fn_rol_actual() = 'admin' or sucursal_id = fn_sucursal_actual());

create policy configuracion_gestion_staff on configuracion
  for all to authenticated
  using (fn_rol_actual() = 'admin' or (fn_rol_actual() = 'supervisor' and sucursal_id = fn_sucursal_actual()))
  with check (fn_rol_actual() = 'admin' or (fn_rol_actual() = 'supervisor' and sucursal_id = fn_sucursal_actual()));

-- ----------------------------------------------------------------------------
-- v_turnos_publicos: minimal read shape for the kiosco/display initial load.
-- Realtime subscriptions (Fase 4) subscribe to the turnos table directly
-- (Supabase Realtime's postgres_changes only supports tables, not views);
-- the turnos_select_publico policy above is what governs that stream.
-- ----------------------------------------------------------------------------

create view v_turnos_publicos as
select
  t.id,
  t.sucursal_id,
  t.servicio_id,
  t.codigo_ticket,
  t.estado,
  t.prioridad,
  t.ventanilla_id,
  v.nombre as ventanilla_nombre,
  t.llamado_at,
  t.created_at
from turnos t
left join ventanillas v on v.id = t.ventanilla_id
where t.estado <> 'ESPERANDO';

grant select on v_turnos_publicos to anon, authenticated;

-- Supports both the queue index already in Fase 1 and the "last N called"
-- list on the pantalla.
create index idx_turnos_recientes on turnos (sucursal_id, llamado_at desc) where llamado_at is not null;

-- ============================================================================
-- pg_cron jobs (run every minute)
-- ============================================================================

create extension if not exists pg_cron with schema extensions;

select cron.schedule(
  'escalar_turnos_urgentes',
  '* * * * *',
  $$
  update turnos t
  set prioridad = 'URGENTE'
  from configuracion c
  where t.sucursal_id = c.sucursal_id
    and c.clave = 'minutos_escalacion_urgente'
    and t.estado = 'ESPERANDO'
    and t.prioridad <> 'URGENTE'
    and t.created_at < now() - (c.valor::int * interval '1 minute');
  $$
);

select cron.schedule(
  'marcar_turnos_ausentes',
  '* * * * *',
  $$
  update turnos t
  set estado = 'AUSENTE'
  from configuracion c
  where t.sucursal_id = c.sucursal_id
    and c.clave = 'timeout_ausente_segundos'
    and t.estado = 'LLAMANDO'
    and t.llamado_at < now() - (c.valor::int * interval '1 second');
  $$
);
