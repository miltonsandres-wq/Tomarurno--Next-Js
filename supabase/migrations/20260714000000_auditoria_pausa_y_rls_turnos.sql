-- ============================================================================
-- Fase 7: fixes found during a full functional audit of the turno flow.
--
-- 1. llamar_siguiente_turno never checked whether the calling agent had an
--    open pausa. The "Llamar siguiente" button is disabled client-side while
--    on pausa, but that is not real authorization: a direct RPC call (or a
--    race where the pausa starts in another tab) could still call a turno.
--
-- 2. turnos_select_publico granted `to anon, authenticated` with no
--    sucursal_id restriction. It was written for the anon kiosco/display
--    screens, but by including `authenticated` it also let any logged-in
--    staff member (any role, any branch) read every other branch's
--    non-ESPERANDO turnos. Staff already get proper branch-scoped access
--    via turnos_select_staff, so authenticated never needed this policy.
-- ============================================================================

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

  if exists (select 1 from pausas_agente where agente_id = v_agente_id and fin is null) then
    raise exception 'No podés llamar turnos mientras estás en pausa';
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

drop policy if exists turnos_select_publico on turnos;

create policy turnos_select_publico on turnos
  for select to anon
  using (estado <> 'ESPERANDO');
