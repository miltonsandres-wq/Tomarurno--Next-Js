import { Clock, PhoneOff, TimerReset, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { obtenerPerfilActual } from "@/lib/auth/perfil-actual";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatTile } from "@/components/dashboard/stat-tile";
import { RangoFechas } from "./rango-fechas";
import { GraficaPausasPorAgente, GraficaTurnosPorAgente } from "./graficas";

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatearMinutos(ms: number | null) {
  if (ms === null || Number.isNaN(ms)) return "—";
  const minutos = ms / 60000;
  return minutos < 1 ? `${Math.round(ms / 1000)} s` : `${minutos.toFixed(1)} min`;
}

function promedio(valores: number[]) {
  if (valores.length === 0) return null;
  return valores.reduce((a, b) => a + b, 0) / valores.length;
}

export default async function MetricasPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string }>;
}) {
  const perfil = await obtenerPerfilActual();
  const { desde = hoyISO(), hasta = hoyISO() } = await searchParams;

  if (!perfil.sucursal_id) {
    return <div className="p-6 text-muted-foreground">Tu usuario no tiene una sucursal asignada.</div>;
  }

  const supabase = await createClient();
  const desdeISO = `${desde}T00:00:00`;
  const hastaISO = `${hasta}T23:59:59.999`;

  const [{ data: turnos }, { data: agentes }, { data: pausas }, { data: config }] = await Promise.all([
    supabase
      .from("turnos")
      .select("id, estado, agente_id, created_at, llamado_at, atencion_inicio_at, finalizado_at")
      .eq("sucursal_id", perfil.sucursal_id)
      .gte("created_at", desdeISO)
      .lte("created_at", hastaISO),
    supabase.from("perfiles").select("id, nombre").eq("sucursal_id", perfil.sucursal_id).eq("rol", "agente"),
    supabase
      .from("pausas_agente")
      .select("agente_id, inicio, fin")
      .gte("inicio", desdeISO)
      .lte("inicio", hastaISO),
    supabase
      .from("configuracion")
      .select("valor")
      .eq("sucursal_id", perfil.sucursal_id)
      .eq("clave", "limite_pausa_minutos")
      .single(),
  ]);

  const nombrePorAgente = new Map((agentes ?? []).map((a) => [a.id, a.nombre]));
  const filas = turnos ?? [];

  const finalizadosPorAgente = new Map<string, number>();
  const esperasMs: number[] = [];
  const atencionesMs: number[] = [];
  let ausentes = 0;

  for (const t of filas) {
    if (t.estado === "FINALIZADO" && t.agente_id) {
      finalizadosPorAgente.set(t.agente_id, (finalizadosPorAgente.get(t.agente_id) ?? 0) + 1);
    }
    if (t.estado === "AUSENTE") ausentes += 1;
    if (t.llamado_at) {
      esperasMs.push(new Date(t.llamado_at).getTime() - new Date(t.created_at).getTime());
    }
    if (t.finalizado_at && t.atencion_inicio_at) {
      atencionesMs.push(new Date(t.finalizado_at).getTime() - new Date(t.atencion_inicio_at).getTime());
    }
  }

  const datosTurnosPorAgente = Array.from(finalizadosPorAgente.entries()).map(([id, valor]) => ({
    nombre: nombrePorAgente.get(id) ?? "—",
    valor,
  }));

  const minutosPausaPorAgente = new Map<string, number>();
  for (const p of pausas ?? []) {
    if (!p.fin) continue;
    const minutos = (new Date(p.fin).getTime() - new Date(p.inicio).getTime()) / 60000;
    minutosPausaPorAgente.set(p.agente_id, (minutosPausaPorAgente.get(p.agente_id) ?? 0) + minutos);
  }
  const datosPausasPorAgente = Array.from(minutosPausaPorAgente.entries()).map(([id, minutos]) => ({
    nombre: nombrePorAgente.get(id) ?? "—",
    valor: Math.round(minutos),
  }));

  const limitePausaMinutos = Number(config?.valor ?? 15);
  const ausentismoPct = filas.length > 0 ? (ausentes / filas.length) * 100 : 0;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Métricas"
        description="Desempeño de la sucursal en el rango de fechas seleccionado."
        actions={<RangoFechas desde={desde} hasta={hasta} />}
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile etiqueta="Tiempo promedio de espera" valor={formatearMinutos(promedio(esperasMs))} icono={Clock} />
        <StatTile etiqueta="Tiempo promedio de atención" valor={formatearMinutos(promedio(atencionesMs))} icono={TimerReset} />
        <StatTile
          etiqueta="Ausentismo"
          valor={`${ausentismoPct.toFixed(1)}%`}
          icono={PhoneOff}
          tono={ausentismoPct > 0 ? "destructive" : undefined}
        />
        <StatTile etiqueta="Turnos en el rango" valor={String(filas.length)} icono={Users} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">Turnos finalizados por agente</h2>
          <GraficaTurnosPorAgente datos={datosTurnosPorAgente} />
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">
            Minutos de pausa por agente (límite: {limitePausaMinutos} min)
          </h2>
          <GraficaPausasPorAgente datos={datosPausasPorAgente} limiteMinutos={limitePausaMinutos} />
        </div>
      </div>
    </div>
  );
}
