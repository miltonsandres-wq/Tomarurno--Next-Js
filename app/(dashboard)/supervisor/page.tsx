import { createClient } from "@/lib/supabase/server";
import { obtenerPerfilActual } from "@/lib/auth/perfil-actual";
import { MonitoreoClient } from "./monitoreo-client";
import type { Database } from "@/lib/types/database";

type EstadoTurno = Database["public"]["Enums"]["estado_turno"];
const ESTADOS_VIVOS: EstadoTurno[] = ["ESPERANDO", "LLAMANDO", "EN_ATENCION", "AUSENTE"];

export default async function SupervisorMonitoreoPage() {
  const perfil = await obtenerPerfilActual();

  if (!perfil.sucursal_id) {
    return <div className="p-6 text-muted-foreground">Tu usuario no tiene una sucursal asignada.</div>;
  }

  const supabase = await createClient();
  const [{ data: ventanillas }, { data: servicios }, { data: agentes }, { data: turnos }, { data: configRows }] =
    await Promise.all([
      supabase.from("ventanillas").select("id, nombre, activa").eq("sucursal_id", perfil.sucursal_id).order("nombre"),
      supabase.from("servicios").select("id, nombre").eq("sucursal_id", perfil.sucursal_id).eq("activo", true).order("nombre"),
      supabase.from("perfiles").select("id, nombre").eq("sucursal_id", perfil.sucursal_id).eq("rol", "agente"),
      supabase
        .from("turnos")
        .select("*")
        .eq("sucursal_id", perfil.sucursal_id)
        .in("estado", ESTADOS_VIVOS),
      supabase
        .from("configuracion")
        .select("clave, valor")
        .eq("sucursal_id", perfil.sucursal_id)
        .in("clave", ["umbral_cola_larga", "minutos_escalacion_urgente", "umbral_ausentes_alerta"]),
    ]);

  const configMapa = new Map((configRows ?? []).map((c) => [c.clave, c.valor]));

  return (
    <MonitoreoClient
      sucursalId={perfil.sucursal_id}
      ventanillas={ventanillas ?? []}
      servicios={servicios ?? []}
      agentes={agentes ?? []}
      inicial={turnos ?? []}
      umbralColaLarga={Number(configMapa.get("umbral_cola_larga") ?? 15)}
      umbralEsperaMinutos={Number(configMapa.get("minutos_escalacion_urgente") ?? 15)}
      umbralAusentes={Number(configMapa.get("umbral_ausentes_alerta") ?? 5)}
    />
  );
}
