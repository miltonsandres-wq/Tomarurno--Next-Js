-- ============================================================================
-- Fase 4: enable Supabase Realtime (postgres_changes) on turnos.
-- Row visibility for anon/authenticated subscribers is still governed by the
-- turnos_select_publico / turnos_select_staff policies from Fase 2 — this
-- migration only adds the table to the replication publication so change
-- events are emitted at all.
-- ============================================================================

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'turnos'
  ) then
    alter publication supabase_realtime add table public.turnos;
  end if;
end $$;
