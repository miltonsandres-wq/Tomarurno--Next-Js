-- ============================================================================
-- Adds a configurable scrolling message shown in the display screen's footer,
-- editable per-branch from Supervisor -> Configuracion.
-- ============================================================================

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
    (new.id, 'mensaje_pantalla', 'Bienvenido. Gracias por su visita.')
  on conflict (sucursal_id, clave) do nothing;
  return new;
end;
$$;

-- Backfill the new key for branches created before this migration.
insert into configuracion (sucursal_id, clave, valor)
select id, 'mensaje_pantalla', 'Bienvenido a la Municipalidad de Comayagua. Primera Capital de Honduras — gracias por su visita.'
from sucursales
on conflict (sucursal_id, clave) do nothing;
