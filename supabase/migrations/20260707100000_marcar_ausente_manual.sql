-- ============================================================================
-- Fase 5: lets the owning agent manually mark their currently-called turno as
-- AUSENTE, instead of waiting for the timeout cron job from Fase 2.
-- ============================================================================

create or replace function marcar_ausente_manual(p_turno_id uuid)
returns turnos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_turno turnos;
begin
  update turnos
  set estado = 'AUSENTE'
  where id = p_turno_id and agente_id = auth.uid() and estado = 'LLAMANDO'
  returning * into v_turno;

  if v_turno.id is null then
    raise exception 'Turno no encontrado, no pertenece a este agente, o no está en estado LLAMANDO';
  end if;

  return v_turno;
end;
$$;

revoke execute on function marcar_ausente_manual(uuid) from public;
grant execute on function marcar_ausente_manual(uuid) to authenticated;
