-- ============================================================================
-- Agrega el estado terminal NO_ATENDIDO: turnos que quedaron ESPERANDO al
-- cierre del día (nunca se llegaron a llamar). Se agrega en su propia
-- migración porque Postgres no permite usar un valor de enum recién creado
-- en la misma transacción que lo crea.
-- ============================================================================

alter type estado_turno add value if not exists 'NO_ATENDIDO';
