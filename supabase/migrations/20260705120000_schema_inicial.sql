-- ============================================================================
-- Fase 1: initial schema for the turn-management system (sistema de turnos)
-- Target: Supabase Postgres 15+
-- Scope: tables, constraints, state-machine trigger, atomic ticket numbering.
-- RLS policies, RPCs and pg_cron jobs are added in the Fase 2 migration.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Enum types
-- ----------------------------------------------------------------------------

create type rol_usuario as enum ('agente', 'supervisor', 'admin');

create type estado_turno as enum (
  'ESPERANDO',
  'LLAMANDO',
  'EN_ATENCION',
  'FINALIZADO',
  'AUSENTE'
);

create type prioridad_turno as enum ('NORMAL', 'PREFERENCIAL', 'URGENTE');

-- ----------------------------------------------------------------------------
-- sucursales
-- ----------------------------------------------------------------------------

create table sucursales (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  activa boolean not null default true,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- perfiles (1:1 extension of auth.users, holds role + branch assignment)
-- ----------------------------------------------------------------------------

create table perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null,
  rol rol_usuario not null default 'agente',
  sucursal_id uuid references sucursales (id),
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  -- only 'admin' is allowed a global (branchless) scope
  constraint perfiles_sucursal_requerida check (rol = 'admin' or sucursal_id is not null)
);

create index idx_perfiles_sucursal on perfiles (sucursal_id);

-- ----------------------------------------------------------------------------
-- servicios
-- ----------------------------------------------------------------------------

create table servicios (
  id uuid primary key default gen_random_uuid(),
  sucursal_id uuid not null references sucursales (id) on delete cascade,
  nombre text not null,
  prefijo_ticket text not null,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  constraint prefijo_ticket_formato check (prefijo_ticket ~ '^[A-Z]{1,3}$')
);

create index idx_servicios_sucursal on servicios (sucursal_id);

-- ----------------------------------------------------------------------------
-- ventanillas
-- ----------------------------------------------------------------------------

create table ventanillas (
  id uuid primary key default gen_random_uuid(),
  sucursal_id uuid not null references sucursales (id) on delete cascade,
  nombre text not null,
  activa boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_ventanillas_sucursal on ventanillas (sucursal_id);

-- ----------------------------------------------------------------------------
-- ventanilla_servicios: which services a counter can attend
-- ----------------------------------------------------------------------------

create table ventanilla_servicios (
  ventanilla_id uuid not null references ventanillas (id) on delete cascade,
  servicio_id uuid not null references servicios (id) on delete cascade,
  primary key (ventanilla_id, servicio_id)
);

-- ----------------------------------------------------------------------------
-- ventanilla_agentes: which agents may operate a given counter.
-- Needed by llamar_siguiente_turno (Fase 2) to authorize the caller, and by
-- the supervisor assignment screen (Fase 6).
-- ----------------------------------------------------------------------------

create table ventanilla_agentes (
  ventanilla_id uuid not null references ventanillas (id) on delete cascade,
  agente_id uuid not null references perfiles (id) on delete cascade,
  primary key (ventanilla_id, agente_id)
);

-- ----------------------------------------------------------------------------
-- contadores_ticket: per-service, per-day atomic counter backing numero_ticket
-- ----------------------------------------------------------------------------

create table contadores_ticket (
  servicio_id uuid not null references servicios (id) on delete cascade,
  fecha date not null,
  siguiente_numero int not null default 1,
  primary key (servicio_id, fecha)
);

-- Atomically returns the next daily ticket number for a service.
-- Uses INSERT ... ON CONFLICT DO UPDATE so concurrent callers serialize on the
-- row's unique index instead of racing on a read-then-write SELECT.
create or replace function fn_siguiente_numero_ticket(p_servicio_id uuid, p_fecha date)
returns int
language plpgsql
as $$
declare
  v_numero int;
begin
  insert into contadores_ticket (servicio_id, fecha, siguiente_numero)
  values (p_servicio_id, p_fecha, 2)
  on conflict (servicio_id, fecha)
  do update set siguiente_numero = contadores_ticket.siguiente_numero + 1
  returning siguiente_numero - 1 into v_numero;

  return v_numero;
end;
$$;

-- ----------------------------------------------------------------------------
-- turnos
-- ----------------------------------------------------------------------------

create table turnos (
  id uuid primary key default gen_random_uuid(),
  sucursal_id uuid not null references sucursales (id),
  servicio_id uuid not null references servicios (id),
  numero_ticket int not null,
  -- snapshot of servicios.prefijo_ticket at creation time, so a later prefix
  -- change never rewrites tickets already printed/displayed
  prefijo_ticket text not null,
  codigo_ticket text generated always as (
    prefijo_ticket || '-' || lpad(numero_ticket::text, 3, '0')
  ) stored,
  fecha_ticket date not null default ((now() at time zone 'America/Tegucigalpa')::date),
  estado estado_turno not null default 'ESPERANDO',
  prioridad prioridad_turno not null default 'NORMAL',
  ventanilla_id uuid references ventanillas (id),
  agente_id uuid references perfiles (id),
  created_at timestamptz not null default now(),
  llamado_at timestamptz,
  atencion_inicio_at timestamptz,
  finalizado_at timestamptz,
  constraint numero_ticket_positivo check (numero_ticket > 0),
  constraint turnos_numero_ticket_unico unique (servicio_id, fecha_ticket, numero_ticket)
);

-- Queue lookup: pending turns for a branch/service ordered by priority/age
create index idx_turnos_cola on turnos (sucursal_id, servicio_id, estado, prioridad, created_at);
-- History lookup for the 2:1 ratio decision (Fase 2)
create index idx_turnos_ventanilla on turnos (ventanilla_id, llamado_at desc) where ventanilla_id is not null;
-- Used by the AUSENTE sweep cron job (Fase 2)
create index idx_turnos_llamando on turnos (llamado_at) where estado = 'LLAMANDO';
-- Used by the URGENTE escalation cron job (Fase 2)
create index idx_turnos_esperando on turnos (created_at) where estado = 'ESPERANDO';

-- ----------------------------------------------------------------------------
-- pausas_agente
-- ----------------------------------------------------------------------------

create table pausas_agente (
  id uuid primary key default gen_random_uuid(),
  agente_id uuid not null references perfiles (id) on delete cascade,
  inicio timestamptz not null default now(),
  fin timestamptz,
  motivo text,
  created_at timestamptz not null default now(),
  constraint pausas_fin_posterior check (fin is null or fin > inicio)
);

create index idx_pausas_agente on pausas_agente (agente_id, inicio desc);

-- ----------------------------------------------------------------------------
-- configuracion: per-branch key/value settings
-- (timeout_ausente_segundos, limite_pausa_minutos, ratio_preferencial,
--  minutos_escalacion_urgente, etc.)
-- ----------------------------------------------------------------------------

create table configuracion (
  id uuid primary key default gen_random_uuid(),
  sucursal_id uuid not null references sucursales (id) on delete cascade,
  clave text not null,
  valor text not null,
  updated_at timestamptz not null default now(),
  constraint configuracion_clave_unica unique (sucursal_id, clave)
);

create or replace function fn_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_configuracion_updated_at
  before update on configuracion
  for each row
  execute function fn_set_updated_at();

-- ----------------------------------------------------------------------------
-- State machine enforcement for turnos.estado
--
-- Valid transitions:
--   ESPERANDO    -> LLAMANDO
--   LLAMANDO     -> EN_ATENCION
--   LLAMANDO     -> AUSENTE
--   EN_ATENCION  -> FINALIZADO
--   AUSENTE      -> ESPERANDO   (supervisor-only; enforced in the Fase 2 RPC)
--
-- Any other jump (e.g. ESPERANDO -> FINALIZADO) is rejected. Re-announcing a
-- turn (rellamar_turno) only touches llamado_at and does not change estado,
-- so it never enters the transition branch below.
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
    (old.estado = 'AUSENTE' and new.estado = 'ESPERANDO')
  ) then
    raise exception 'Transición de estado inválida: % -> %', old.estado, new.estado;
  end if;

  case new.estado
    when 'LLAMANDO' then
      new.llamado_at := now();
    when 'EN_ATENCION' then
      new.atencion_inicio_at := now();
    when 'FINALIZADO' then
      new.finalizado_at := now();
    when 'ESPERANDO' then
      -- reactivated from AUSENTE: clear the previous call assignment
      new.ventanilla_id := null;
      new.agente_id := null;
      new.llamado_at := null;
    else
      null;
  end case;

  return new;
end;
$$;

create trigger validar_transicion_estado
  before update on turnos
  for each row
  execute function fn_validar_transicion_estado();
