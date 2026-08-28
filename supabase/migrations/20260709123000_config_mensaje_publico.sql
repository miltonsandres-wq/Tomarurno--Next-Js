-- ============================================================================
-- Exposes only the 'mensaje_pantalla' key of configuracion to anon/authenticated
-- (the display screen has no session). Every other key stays staff-only via
-- the existing configuracion_select_staff policy.
-- ============================================================================

create policy configuracion_select_publico on configuracion
  for select to anon, authenticated
  using (clave = 'mensaje_pantalla');
