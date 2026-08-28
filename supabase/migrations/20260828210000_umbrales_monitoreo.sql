-- ============================================================================
-- Umbrales configurables para las alertas del panel de monitoreo en vivo.
--
-- El umbral de "mayor espera actual" reutiliza minutos_escalacion_urgente
-- (ya existía): es literalmente la misma pregunta -- "¿cuánto es demasiado
-- tiempo esperando?" -- que ya dispara el auto-escalado a URGENTE, así que
-- no hace falta un valor nuevo y redundante para eso.
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
    (new.id, 'rellamado_automatico_segundos', '40'),
    (new.id, 'turnos_recientes_cantidad', '5'),
    (new.id, 'destello_llamado_segundos', '10'),
    (new.id, 'umbral_cola_larga', '15'),
    (new.id, 'umbral_ausentes_alerta', '5')
  on conflict (sucursal_id, clave) do nothing;
  return new;
end;
$$;

insert into configuracion (sucursal_id, clave, valor)
select s.id, v.clave, v.valor
from sucursales s
cross join (values
  ('umbral_cola_larga', '15'),
  ('umbral_ausentes_alerta', '5')
) as v(clave, valor)
on conflict (sucursal_id, clave) do nothing;
