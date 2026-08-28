"use client";

import { useEffect, useState } from "react";
import { Armchair, Clock, Hourglass, PhoneCall, UserX } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatTile } from "@/components/dashboard/stat-tile";
import { EmptyState } from "@/components/dashboard/empty-state";
import { GraficaColaPorServicio, type DatoCola } from "./cola-grafica";
import { cn } from "@/lib/utils";
import type { Database } from "@/lib/types/database";

type TurnoRow = Database["public"]["Tables"]["turnos"]["Row"];
type EstadoTurno = Database["public"]["Enums"]["estado_turno"];
type Ventanilla = { id: string; nombre: string; activa: boolean };
type Servicio = { id: string; nombre: string };
type Nombres = { id: string; nombre: string };

const RECONEXION_MS = 3000;
const ACTUALIZACION_RELOJ_MS = 30000;
const ESTADOS_VIVOS: EstadoTurno[] = ["ESPERANDO", "LLAMANDO", "EN_ATENCION", "AUSENTE"];

const ETIQUETA_ESTADO: Record<string, string> = {
  LLAMANDO: "Llamando",
  EN_ATENCION: "En atención",
};

function formatearMinutos(ms: number | null) {
  if (ms === null || Number.isNaN(ms)) return "—";
  const minutos = ms / 60000;
  return minutos < 1 ? `${Math.round(ms / 1000)} s` : `${minutos.toFixed(1)} min`;
}

export function MonitoreoClient({
  sucursalId,
  ventanillas,
  servicios,
  agentes,
  inicial,
}: {
  sucursalId: string;
  ventanillas: Ventanilla[];
  servicios: Servicio[];
  agentes: Nombres[];
  inicial: TurnoRow[];
}) {
  const [turnos, setTurnos] = useState<TurnoRow[]>(inicial);
  const [conectado, setConectado] = useState(true);
  const [ahora, setAhora] = useState<number | null>(null);
  const nombreAgente = new Map(agentes.map((a) => [a.id, a.nombre]));

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;

    async function resync() {
      const { data } = await supabase
        .from("turnos")
        .select("*")
        .eq("sucursal_id", sucursalId)
        .in("estado", ESTADOS_VIVOS);
      if (data && !disposed) setTurnos(data);
    }

    function programarReconexion() {
      if (reconnectTimeout || disposed) return;
      reconnectTimeout = setTimeout(() => {
        reconnectTimeout = null;
        if (channel) supabase.removeChannel(channel);
        suscribir();
      }, RECONEXION_MS);
    }

    function suscribir() {
      channel = supabase
        .channel(`monitoreo-${sucursalId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "turnos", filter: `sucursal_id=eq.${sucursalId}` },
          () => resync(),
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            setConectado(true);
            resync();
          }
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            setConectado(false);
            programarReconexion();
          }
        });
    }

    suscribir();
    window.addEventListener("online", resync);

    return () => {
      disposed = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      window.removeEventListener("online", resync);
      if (channel) supabase.removeChannel(channel);
    };
  }, [sucursalId]);

  useEffect(() => {
    setAhora(Date.now());
    const id = setInterval(() => setAhora(Date.now()), ACTUALIZACION_RELOJ_MS);
    return () => clearInterval(id);
  }, []);

  const actualPorVentanilla = new Map<string, TurnoRow>();
  for (const t of turnos) {
    if (!t.ventanilla_id) continue;
    if (t.estado !== "LLAMANDO" && t.estado !== "EN_ATENCION") continue;
    const existente = actualPorVentanilla.get(t.ventanilla_id);
    if (!existente || (t.llamado_at ?? "") > (existente.llamado_at ?? "")) {
      actualPorVentanilla.set(t.ventanilla_id, t);
    }
  }

  const esperandoPorServicio = new Map<string, { total: number; urgentes: number }>();
  const esperando: TurnoRow[] = [];
  for (const t of turnos) {
    if (t.estado !== "ESPERANDO") continue;
    esperando.push(t);
    const actual = esperandoPorServicio.get(t.servicio_id) ?? { total: 0, urgentes: 0 };
    actual.total += 1;
    if (t.prioridad === "URGENTE") actual.urgentes += 1;
    esperandoPorServicio.set(t.servicio_id, actual);
  }

  const datosCola: DatoCola[] = servicios.map((s) => {
    const datos = esperandoPorServicio.get(s.id) ?? { total: 0, urgentes: 0 };
    return { nombre: s.nombre, normal: datos.total - datos.urgentes, urgente: datos.urgentes };
  });

  const totalEnAtencion = turnos.filter((t) => t.estado === "LLAMANDO" || t.estado === "EN_ATENCION").length;
  const totalUrgentes = esperando.filter((t) => t.prioridad === "URGENTE").length;
  const totalAusentes = turnos.filter((t) => t.estado === "AUSENTE").length;
  const ventanillasActivas = ventanillas.filter((v) => v.activa).length;
  const esperaPromedioMs =
    ahora !== null && esperando.length > 0
      ? esperando.reduce((acc, t) => acc + (ahora - new Date(t.created_at).getTime()), 0) / esperando.length
      : null;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Monitoreo en vivo"
        description="Estado en tiempo real de ventanillas y colas de esta sucursal."
        actions={
          <>
            {!conectado && <Badge variant="destructive">Reconectando…</Badge>}
            {conectado && (
              <Badge variant="outline" className="gap-1.5 text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-[#1baf7a]" />
                En vivo
              </Badge>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile etiqueta="En espera" valor={String(esperando.length)} icono={Hourglass} />
        <StatTile
          etiqueta="Urgentes"
          valor={String(totalUrgentes)}
          icono={Clock}
          tono={totalUrgentes > 0 ? "destructive" : undefined}
        />
        <StatTile etiqueta="En atención" valor={String(totalEnAtencion)} icono={PhoneCall} />
        <StatTile
          etiqueta="Ausentes"
          valor={String(totalAusentes)}
          icono={UserX}
          tono={totalAusentes > 0 ? "destructive" : undefined}
        />
        <StatTile
          etiqueta="Ventanillas activas"
          valor={`${ventanillasActivas}/${ventanillas.length}`}
          icono={Armchair}
          meter={ventanillas.length > 0 ? ventanillasActivas / ventanillas.length : 0}
        />
        <StatTile etiqueta="Espera promedio" valor={formatearMinutos(esperaPromedioMs)} icono={Clock} />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Ventanillas</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {ventanillas.map((v) => {
            const actual = actualPorVentanilla.get(v.id);
            const enUso = v.activa && !!actual;
            return (
              <div
                key={v.id}
                className={cn(
                  "rounded-xl border bg-card p-4 shadow-sm transition-colors",
                  !v.activa && "opacity-60",
                  enUso && "border-l-4 border-l-primary",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{v.nombre}</p>
                  <Badge variant={!v.activa ? "secondary" : enUso ? "default" : "outline"}>
                    {!v.activa ? "Inactiva" : actual ? (ETIQUETA_ESTADO[actual.estado] ?? actual.estado) : "Disponible"}
                  </Badge>
                </div>
                <p className="mt-3 font-mono text-2xl font-semibold tabular-nums">{actual?.codigo_ticket ?? "—"}</p>
                <p className="text-sm text-muted-foreground">
                  {actual?.agente_id ? (nombreAgente.get(actual.agente_id) ?? "—") : "Sin agente"}
                </p>
              </div>
            );
          })}
        </div>
        {ventanillas.length === 0 && (
          <EmptyState icono={Armchair} titulo="No hay ventanillas registradas" descripcion="Creá una ventanilla para empezar a atender turnos." />
        )}
      </div>

      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Cola por servicio</h2>
        <GraficaColaPorServicio datos={datosCola} />
      </div>
    </div>
  );
}
