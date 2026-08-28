-- ============================================================================
-- Cola pública en el display y la ventanilla
-- ----------------------------------------------------------------------------
-- turnos_select_publico y v_turnos_publicos excluían a propósito los turnos
-- ESPERANDO (ver 20260714000000_auditoria_pausa_y_rls_turnos.sql), pensado
-- originalmente para no exponer la cola completa al público. El negocio
-- ahora pide mostrar la cola en la pantalla (patrón estándar de "siguientes
-- en fila" en pantallas de banco); codigo_ticket/estado/prioridad no son
-- datos personales, así que es seguro exponerlos también en ESPERANDO.
-- ============================================================================

drop policy if exists turnos_select_publico on turnos;

create policy turnos_select_publico on turnos
  for select to anon
  using (true);

create or replace view v_turnos_publicos as
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
left join ventanillas v on v.id = t.ventanilla_id;

grant select on v_turnos_publicos to anon, authenticated;
