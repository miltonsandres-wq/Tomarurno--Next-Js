-- ============================================================================
-- Fase: timeouts automáticos de turno + cierre diario con métricas.
--
-- 1. turnos.llamado_at_original / rellamado_automatico: ancla fija del
--    primer llamado, para que un re-llamado (manual o automático) no
--    pueda posponer indefinidamente el timeout de AUSENTE.
-- 2. fn_procesar_timeouts_turnos(): corre cada 20s vía pg_cron. Antes del
--    timeout_ausente_segundos configurado, re-llama una vez automáticamente
--    (rellamado_automatico_segundos); al llegar al timeout, marca AUSENTE.
-- 3. cierres_diarios + fn_cerrar_dia(): "congela" el día — lo que quedó
--    ESPERANDO pasa a NO_ATENDIDO (nunca se borra nada) — y guarda un
--    resumen con las métricas del día. Se dispara solo a medianoche
--    (hora Honduras) vía pg_cron para cada sucursal activa.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Columnas nuevas en turnos
-- ----------------------------------------------------------------------------

alter table turnos
  add column if not exists llamado_at_original timestamptz,
  add column if not exists rellamado_automatico boolean not null default false;

update turnos set llamado_at_original = llamado_at where llamado_at_original is null and llamado_at is not null;

comment on column turnos.llamado_at_original is
  'Timestamp del primer llamado (nunca se toca en re-llamados). Ancla del timeout de AUSENTE.';
comment on column turnos.rellamado_automatico is
  'true una vez que el cron ya hizo el re-llamado automático de este turno, para que no se repita.';

-- ----------------------------------------------------------------------------
-- 2. Trigger de transición de estado: sembrar llamado_at_original al
--    llamar por primera vez, y permitir ESPERANDO -> NO_ATENDIDO (cierre).
-- ----------------------------------------------------------------------------

create or replace function fn_validar_transicion_estado()
returns trigger
language plpgsql
as $$
begin
  if new.estado = old.estado then
    return new;
  end if;

  if not (
    (old.estado = 'ESPERANDO' and new.estado = 'LLAMANDO') or
    (old.estado = 'LLAMANDO' and new.estado = 'EN_ATENCION') or
    (old.estado = 'LLAMANDO' and new.estado = 'AUSENTE') or
    (old.estado = 'EN_ATENCION' and new.estado = 'FINALIZADO') or
    (old.estado = 'AUSENTE' and new.estado = 'ESPERANDO') or
    (old.estado = 'ESPERANDO' and new.estado = 'NO_ATENDIDO')
  ) then
    raise exception 'Transición de estado inválida: % -> %', old.estado, new.estado;
  end if;

  case new.estado
    when 'LLAMANDO' then
      new.llamado_at := now();
      new.llamado_at_original := now();
      new.rellamado_automatico := false;
    when 'EN_ATENCION' then
      new.atencion_inicio_at := now();
    when 'FINALIZADO' then
      new.finalizado_at := now();
    when 'ESPERANDO' then
      -- reactivated from AUSENTE: clear the previous call assignment
      new.ventanilla_id := null;
      new.agente_id := null;
      new.llamado_at := null;
      new.llamado_at_original := null;
      new.rellamado_automatico := false;
    else
      null;
  end case;

  return new;
end;
$$;

-- rellamar_turno: un re-llamado manual también le da al turno una ventana
-- fresca completa (resetea el ancla del timeout, no solo llamado_at).
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
  set llamado_at = now(), llamado_at_original = now(), rellamado_automatico = false
  where id = p_turno_id and agente_id = auth.uid() and estado = 'LLAMANDO'
  returning * into v_turno;

  if v_turno.id is null then
    raise exception 'Turno no encontrado, no pertenece a este agente, o no está en estado LLAMANDO';
  end if;

  return v_turno;
end;
$$;

-- ----------------------------------------------------------------------------
-- 3. Config nueva (por sucursal): re-llamado automático, cuántos "últimos
--    llamados" mostrar, y cuánto dura el destello de un llamado en pantalla.
--    timeout_ausente_segundos ya existía desde el inicio del proyecto.
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
    (new.id, 'minutos_escalacion_urgente', '15'),
    (new.id, 'rellamado_automatico_segundos', '40'),
    (new.id, 'turnos_recientes_cantidad', '5'),
    (new.id, 'destello_llamado_segundos', '10')
  on conflict (sucursal_id, clave) do nothing;
  return new;
end;
$$;

-- Sembrar los valores nuevos para sucursales que ya existían antes de esta
-- migración (el trigger de arriba solo corre en el INSERT de una sucursal).
insert into configuracion (sucursal_id, clave, valor)
select s.id, v.clave, v.valor
from sucursales s
cross join (values
  ('rellamado_automatico_segundos', '40'),
  ('turnos_recientes_cantidad', '5'),
  ('destello_llamado_segundos', '10')
) as v(clave, valor)
on conflict (sucursal_id, clave) do nothing;

-- ----------------------------------------------------------------------------
-- 4. fn_procesar_timeouts_turnos(): el job que faltaba. Corre sin sesión de
--    usuario (lo dispara pg_cron), por eso no depende de auth.uid().
-- ----------------------------------------------------------------------------

create or replace function fn_procesar_timeouts_turnos()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Re-llamado automático, una sola vez, antes del timeout de AUSENTE.
  update turnos t
  set llamado_at = now(), rellamado_automatico = true
  from configuracion c
  where c.sucursal_id = t.sucursal_id
    and c.clave = 'rellamado_automatico_segundos'
    and t.estado = 'LLAMANDO'
    and t.rellamado_automatico = false
    and t.llamado_at_original is not null
    and now() - t.llamado_at_original >= (c.valor::int) * interval '1 second';

  -- AUSENTE al llegar al timeout total (el ancla es siempre el primer
  -- llamado, no el re-llamado automático de arriba).
  update turnos t
  set estado = 'AUSENTE'
  from configuracion c
  where c.sucursal_id = t.sucursal_id
    and c.clave = 'timeout_ausente_segundos'
    and t.estado = 'LLAMANDO'
    and t.llamado_at_original is not null
    and now() - t.llamado_at_original >= (c.valor::int) * interval '1 second';
end;
$$;

revoke execute on function fn_procesar_timeouts_turnos() from public, anon, authenticated;

select cron.schedule('procesar_timeouts_turnos', '20 seconds', $$select fn_procesar_timeouts_turnos();$$);

-- ----------------------------------------------------------------------------
-- 5. cierres_diarios: registro inmutable del resumen de cada día cerrado.
-- ----------------------------------------------------------------------------

create table cierres_diarios (
  id uuid primary key default gen_random_uuid(),
  sucursal_id uuid not null references sucursales (id),
  fecha date not null,
  total_emitidos int not null default 0,
  total_atendidos int not null default 0,
  total_ausentes int not null default 0,
  total_no_atendidos int not null default 0,
  total_preferenciales int not null default 0,
  total_normales int not null default 0,
  total_urgentes int not null default 0,
  tiempo_espera_prom_seg numeric,
  tiempo_atencion_prom_seg numeric,
  hora_pico int,
  desglose_ventanillas jsonb not null default '[]'::jsonb,
  cerrado_at timestamptz not null default now(),
  constraint cierres_diarios_unico unique (sucursal_id, fecha)
);

alter table cierres_diarios enable row level security;

create policy cierres_diarios_select_staff on cierres_diarios
  for select to authenticated
  using (fn_rol_actual() = 'admin' or sucursal_id = fn_sucursal_actual());

-- ----------------------------------------------------------------------------
-- 6. fn_cerrar_dia(): congela un día para una sucursal — nada se borra,
--    ESPERANDO pasa a NO_ATENDIDO — y calcula/guarda el resumen. Es
--    re-ejecutable (upsert por sucursal+fecha) por si hay que forzar un
--    recálculo manual.
-- ----------------------------------------------------------------------------

create or replace function fn_cerrar_dia(p_sucursal_id uuid, p_fecha date)
returns cierres_diarios
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cierre cierres_diarios;
begin
  update turnos
  set estado = 'NO_ATENDIDO'
  where sucursal_id = p_sucursal_id
    and fecha_ticket = p_fecha
    and estado = 'ESPERANDO';

  insert into cierres_diarios (
    sucursal_id, fecha, total_emitidos, total_atendidos, total_ausentes, total_no_atendidos,
    total_preferenciales, total_normales, total_urgentes,
    tiempo_espera_prom_seg, tiempo_atencion_prom_seg, hora_pico, desglose_ventanillas
  )
  select
    p_sucursal_id,
    p_fecha,
    count(*),
    count(*) filter (where estado = 'FINALIZADO'),
    count(*) filter (where estado = 'AUSENTE'),
    count(*) filter (where estado = 'NO_ATENDIDO'),
    count(*) filter (where prioridad = 'PREFERENCIAL'),
    count(*) filter (where prioridad = 'NORMAL'),
    count(*) filter (where prioridad = 'URGENTE'),
    avg(extract(epoch from (llamado_at - created_at))) filter (where llamado_at is not null),
    avg(extract(epoch from (finalizado_at - atencion_inicio_at)))
      filter (where finalizado_at is not null and atencion_inicio_at is not null),
    (
      select extract(hour from (t2.created_at at time zone 'America/Tegucigalpa'))::int
      from turnos t2
      where t2.sucursal_id = p_sucursal_id and t2.fecha_ticket = p_fecha
      group by 1
      order by count(*) desc
      limit 1
    ),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'ventanilla_id', v.id,
        'ventanilla_nombre', v.nombre,
        'atendidos', sub.atendidos
      ))
      from (
        select ventanilla_id, count(*) as atendidos
        from turnos
        where sucursal_id = p_sucursal_id
          and fecha_ticket = p_fecha
          and estado = 'FINALIZADO'
          and ventanilla_id is not null
        group by ventanilla_id
      ) sub
      join ventanillas v on v.id = sub.ventanilla_id
    ), '[]'::jsonb)
  from turnos
  where sucursal_id = p_sucursal_id and fecha_ticket = p_fecha
  on conflict (sucursal_id, fecha) do update set
    total_emitidos = excluded.total_emitidos,
    total_atendidos = excluded.total_atendidos,
    total_ausentes = excluded.total_ausentes,
    total_no_atendidos = excluded.total_no_atendidos,
    total_preferenciales = excluded.total_preferenciales,
    total_normales = excluded.total_normales,
    total_urgentes = excluded.total_urgentes,
    tiempo_espera_prom_seg = excluded.tiempo_espera_prom_seg,
    tiempo_atencion_prom_seg = excluded.tiempo_atencion_prom_seg,
    hora_pico = excluded.hora_pico,
    desglose_ventanillas = excluded.desglose_ventanillas,
    cerrado_at = now()
  returning * into v_cierre;

  return v_cierre;
end;
$$;

revoke execute on function fn_cerrar_dia(uuid, date) from public, anon;
grant execute on function fn_cerrar_dia(uuid, date) to authenticated;

-- Cierre automático a medianoche hora Honduras (06:00 UTC), para todas las
-- sucursales activas, del día que recién terminó.
select cron.schedule(
  'cierre_diario_medianoche',
  '0 6 * * *',
  $$
  select fn_cerrar_dia(s.id, ((now() at time zone 'America/Tegucigalpa')::date - 1))
  from sucursales s
  where s.activa = true;
  $$
);
