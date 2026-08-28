"use client";

import { useEffect, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { estiloTurno } from "@/lib/estilos-turno";
import type { Database } from "@/lib/types/database";
import {
  finalizarTurno,
  iniciarAtencion,
  iniciarPausa,
  llamarSiguiente,
  marcarAusente,
  rellamar,
  terminarPausa,
} from "./actions";

type TurnoRow = Database["public"]["Tables"]["turnos"]["Row"];
type Servicio = { id: string; nombre: string };
type Pausa = { id: string; inicio: string; motivo: string | null };

const RECONEXION_MS = 3000;
const MOTIVOS_PAUSA = ["Descanso", "Almuerzo", "Baño", "Otro"];

function formatearDuracion(ms: number) {
  const totalSeg = Math.max(0, Math.floor(ms / 1000));
  const min = Math.floor(totalSeg / 60);
  const seg = totalSeg % 60;
  return `${String(min).padStart(2, "0")}:${String(seg).padStart(2, "0")}`;
}

export function VentanillaClient({
  ventanillaId,
  ventanillaNombre,
  agenteId,
  sucursalId,
  servicios,
  turnoInicial,
  colaInicial,
  ausentesInicial,
  pausaActivaInicial,
  limitePausaMinutos,
}: {
  ventanillaId: string;
  ventanillaNombre: string;
  agenteId: string;
  sucursalId: string;
  servicios: Servicio[];
  turnoInicial: TurnoRow | null;
  colaInicial: TurnoRow[];
  ausentesInicial: TurnoRow[];
  pausaActivaInicial: Pausa | null;
  limitePausaMinutos: number;
}) {
  const [turnoActual, setTurnoActual] = useState<TurnoRow | null>(turnoInicial);
  const [cola, setCola] = useState<TurnoRow[]>(colaInicial);
  const [ausentes, setAusentes] = useState<TurnoRow[]>(ausentesInicial);
  const [pausaActiva, setPausaActiva] = useState<Pausa | null>(pausaActivaInicial);
  const [motivoPausa, setMotivoPausa] = useState(MOTIVOS_PAUSA[0]);
  const [conectado, setConectado] = useState(true);
  const [ahora, setAhora] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const servicioIds = new Set(servicios.map((s) => s.id));

  useEffect(() => {
    setAhora(Date.now());
    const id = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;

    async function resync() {
      const [{ data: actual }, { data: colaData }, { data: ausentesData }] = await Promise.all([
        supabase
          .from("turnos")
          .select("*")
          .eq("ventanilla_id", ventanillaId)
          .eq("agente_id", agenteId)
          .in("estado", ["LLAMANDO", "EN_ATENCION"])
          .order("llamado_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.from("turnos").select("*").eq("sucursal_id", sucursalId).eq("estado", "ESPERANDO"),
        supabase
          .from("turnos")
          .select("*")
          .eq("sucursal_id", sucursalId)
          .eq("estado", "AUSENTE")
          .not("llamado_at", "is", null)
          .order("llamado_at", { ascending: false })
          .limit(20),
      ]);
      if (disposed) return;
      setTurnoActual(actual ?? null);
      if (colaData) setCola(colaData.filter((t) => servicioIds.has(t.servicio_id)));
      if (ausentesData) setAusentes(ausentesData.filter((t) => servicioIds.has(t.servicio_id)).slice(0, 6));
    }

    function procesarFila(row: TurnoRow) {
      if (row.ventanilla_id === ventanillaId && row.agente_id === agenteId) {
        if (row.estado === "LLAMANDO" || row.estado === "EN_ATENCION") {
          setTurnoActual(row);
        } else {
          setTurnoActual((prev) => (prev?.id === row.id ? null : prev));
        }
      }

      if (servicioIds.has(row.servicio_id)) {
        setCola((prev) => {
          const resto = prev.filter((t) => t.id !== row.id);
          return row.estado === "ESPERANDO" ? [...resto, row] : resto;
        });

        if (row.estado === "AUSENTE") {
          setAusentes((prev) => [row, ...prev.filter((t) => t.id !== row.id)].slice(0, 6));
        }
      }
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
        .channel(`ventanilla-${ventanillaId}`)
        .on<TurnoRow>(
          "postgres_changes",
          { event: "*", schema: "public", table: "turnos", filter: `sucursal_id=eq.${sucursalId}` },
          (payload) => {
            const row = payload.new as TurnoRow | undefined;
            if (row?.id) procesarFila(row);
          },
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ventanillaId, agenteId, sucursalId]);

  function ejecutar(accion: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const resultado = await accion();
      if (!resultado.ok) setError(resultado.error ?? "Ocurrió un error");
    });
  }

  const conteoServicio = new Map<string, { total: number; preferencial: number; urgente: number }>();
  for (const t of cola) {
    const actual = conteoServicio.get(t.servicio_id) ?? { total: 0, preferencial: 0, urgente: 0 };
    actual.total += 1;
    if (t.prioridad === "PREFERENCIAL") actual.preferencial += 1;
    if (t.prioridad === "URGENTE") actual.urgente += 1;
    conteoServicio.set(t.servicio_id, actual);
  }

  const minutosPausa =
    pausaActiva && ahora ? (ahora - new Date(pausaActiva.inicio).getTime()) / 60000 : 0;
  const pausaExcedida = pausaActiva ? minutosPausa >= limitePausaMinutos : false;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Ventanilla {ventanillaNombre}</h1>
        {!conectado && <Badge variant="destructive">Reconectando…</Badge>}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="rounded-lg border p-6">
        {!turnoActual ? (
          <div className="space-y-4 text-center">
            <p className="text-muted-foreground">No hay ningún turno en curso.</p>
            <Button
              size="lg"
              disabled={pending || !!pausaActiva}
              onClick={() => ejecutar(() => llamarSiguiente(ventanillaId))}
            >
              Llamar siguiente
            </Button>
            {pausaActiva && <p className="text-sm text-muted-foreground">Terminá tu pausa para llamar turnos.</p>}
          </div>
        ) : (
          <div className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              {turnoActual.estado === "LLAMANDO" ? "Llamando" : "Atendiendo"}
            </p>
            <p className="text-6xl font-bold">{turnoActual.codigo_ticket}</p>
            <Badge variant="outline">{turnoActual.prioridad}</Badge>
            {turnoActual.estado === "EN_ATENCION" && turnoActual.atencion_inicio_at && ahora && (
              <p className="text-xl tabular-nums text-muted-foreground">
                {formatearDuracion(ahora - new Date(turnoActual.atencion_inicio_at).getTime())}
              </p>
            )}

            <div className="flex flex-wrap justify-center gap-2 pt-2">
              {turnoActual.estado === "LLAMANDO" && (
                <>
                  <Button disabled={pending} onClick={() => ejecutar(() => iniciarAtencion(turnoActual.id))}>
                    Iniciar atención
                  </Button>
                  <Button
                    variant="outline"
                    disabled={pending}
                    onClick={() => ejecutar(() => rellamar(turnoActual.id))}
                  >
                    Re-llamar
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={pending}
                    onClick={() => ejecutar(() => marcarAusente(turnoActual.id))}
                  >
                    Marcar ausente
                  </Button>
                </>
              )}
              {turnoActual.estado === "EN_ATENCION" && (
                <Button disabled={pending} onClick={() => ejecutar(() => finalizarTurno(turnoActual.id))}>
                  Finalizar
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-lg border p-4">
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Pausa / descanso</h2>
        {pausaActiva ? (
          <div className="flex items-center gap-3">
            <span className={`tabular-nums ${pausaExcedida ? "font-semibold text-destructive" : ""}`}>
              {ahora ? formatearDuracion(ahora - new Date(pausaActiva.inicio).getTime()) : "--:--"}
            </span>
            {pausaExcedida && <Badge variant="destructive">Superó el límite ({limitePausaMinutos} min)</Badge>}
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() =>
                ejecutar(async () => {
                  const r = await terminarPausa();
                  if (r.ok) setPausaActiva(null);
                  return r;
                })
              }
            >
              Terminar pausa
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Select value={motivoPausa} onValueChange={(v) => setMotivoPausa(v ?? MOTIVOS_PAUSA[0])}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MOTIVOS_PAUSA.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() =>
                ejecutar(async () => {
                  const r = await iniciarPausa(motivoPausa);
                  if (r.ok) setPausaActiva(r.pausa);
                  return r;
                })
              }
            >
              Iniciar pausa
            </Button>
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Cola en vivo</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {servicios.map((s) => {
            const c = conteoServicio.get(s.id) ?? { total: 0, preferencial: 0, urgente: 0 };
            const turnosServicio = cola
              .filter((t) => t.servicio_id === s.id)
              .sort((a, b) => {
                if (a.prioridad !== b.prioridad) {
                  if (a.prioridad === "URGENTE") return -1;
                  if (b.prioridad === "URGENTE") return 1;
                }
                return a.created_at.localeCompare(b.created_at);
              });
            return (
              <div key={s.id} className="rounded-lg border p-4">
                <div className="flex items-baseline justify-between">
                  <p className="font-medium">{s.nombre}</p>
                  <p className="text-2xl font-semibold">{c.total}</p>
                </div>
                <div className="mt-1 flex gap-2 text-xs text-muted-foreground">
                  <span>{c.preferencial} preferencial</span>
                  {c.urgente > 0 && <Badge variant="destructive">{c.urgente} urgente</Badge>}
                </div>
                {turnosServicio.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {turnosServicio.map((t) => {
                      const estilo = estiloTurno(t);
                      return (
                        <span
                          key={t.id}
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs tabular-nums ${estilo.fila} ${estilo.codigo}`}
                        >
                          {t.codigo_ticket}
                          {estilo.etiqueta && (
                            <span
                              className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${estilo.etiquetaClase}`}
                            >
                              {estilo.etiqueta}
                            </span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-muted-foreground">Sin turnos en espera.</p>
                )}
              </div>
            );
          })}
          {servicios.length === 0 && (
            <p className="text-sm text-muted-foreground">Esta ventanilla no tiene servicios asignados.</p>
          )}
        </div>
      </div>

      {ausentes.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">Ausentes recientes</h2>
          <div className="flex flex-wrap gap-1.5">
            {ausentes.map((t) => {
              const estilo = estiloTurno(t);
              return (
                <span
                  key={t.id}
                  className={`rounded-full px-2.5 py-1 text-xs tabular-nums ${estilo.fila} ${estilo.codigo}`}
                >
                  {t.codigo_ticket}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
