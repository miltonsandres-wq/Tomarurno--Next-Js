-- ============================================================================
-- Adds a configurable icon to servicios, chosen by the supervisor when
-- creating/editing a service. Stores a lucide-react icon name; the app owns
-- validating it against its curated icon list.
-- ============================================================================

alter table servicios add column icono text not null default 'Landmark';
