"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Megaphone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { textoAnuncioTurno, ColaAnuncios } from "@/lib/tts";
import { estiloTurno } from "@/lib/estilos-turno";
import type { Database } from "@/lib/types/database";

type TurnoPublico = Database["public"]["Views"]["v_turnos_publicos"]["Row"];
type TurnoRow = Database["public"]["Tables"]["turnos"]["Row"];
type EstadoTurno = Database["public"]["Enums"]["estado_turno"];
type Anuncio = { id: string; titulo: string | null; imagen_url: string };

const EXTENSIONES_VIDEO = [".mp4", ".webm", ".mov", ".ogg"];
const esVideo = (url: string) => EXTENSIONES_VIDEO.some((ext) => url.toLowerCase().includes(ext));

const MAX_AUSENTES = 4;
const RECONEXION_MS = 3000;
const ROTACION_ANUNCIO_MS = 8000;
const ESTADOS_ACTIVOS: EstadoTurno[] = ["LLAMANDO", "EN_ATENCION"];

const AZUL = "#0b3d91";
const DORADO = "#c8a13a";

function filaDesdeRealtime(
  row: TurnoRow,
  nombresVentanilla: Map<string, string>,
): TurnoPublico {
  return {
    id: row.id,
    codigo_ticket: row.codigo_ticket,
    estado: row.estado,
    prioridad: row.prioridad,
    servicio_id: row.servicio_id,
    sucursal_id: row.sucursal_id,
    ventanilla_id: row.ventanilla_id,
    ventanilla_nombre: row.ventanilla_id ? (nombresVentanilla.get(row.ventanilla_id) ?? null) : null,
    llamado_at: row.llamado_at,
    created_at: row.created_at,
  };
}

function PanelPublicidad({ anuncios }: { anuncios: Anuncio[] }) {
  const [indice, setIndice] = useState(0);

  useEffect(() => {
    if (anuncios.length < 2) return;
    const id = setInterval(() => setIndice((i) => (i + 1) % anuncios.length), ROTACION_ANUNCIO_MS);
    return () => clearInterval(id);
  }, [anuncios.length]);

  if (anuncios.length === 0) {
    return (
      <div
        className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center text-white"
        style={{ backgroundColor: AZUL }}
      >
        <Megaphone className="h-16 w-16" style={{ color: DORADO }} />
        <span className="text-4xl font-extrabold tracking-tight" style={{ color: DORADO }}>
          Publicite Aquí
        </span>
        <span className="text-xl font-medium text-white/90">Contáctenos</span>
      </div>
    );
  }

  const actual = anuncios[indice % anuncios.length];

  return (
    <div className="relative h-full w-full overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={actual.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0"
        >
          {esVideo(actual.imagen_url) ? (
            <video
              src={actual.imagen_url}
              className="h-full w-full object-cover"
              autoPlay
              muted
              loop
              playsInline
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={actual.imagen_url} alt={actual.titulo ?? ""} className="h-full w-full object-cover" />
          )}
          {actual.titulo && (
            <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-6 py-3 text-center text-base text-white">
              {actual.titulo}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export function DisplayClient({
  sucursalId,
  sucursalNombre,
  activosIniciales,
  colaInicial,
  historialInicial,
  ausentesInicial,
  ventanillasIniciales,
  ventanillasPorServicio,
  anuncios,
  mensajePantalla,
  historialTotal,
  destelloSegundos,
}: {
  sucursalId: string;
  sucursalNombre: string;
  activosIniciales: TurnoPublico[];
  colaInicial: TurnoPublico[];
  historialInicial: TurnoPublico[];
  ausentesInicial: TurnoPublico[];
  ventanillasIniciales: { id: string; nombre: string }[];
  ventanillasPorServicio: Record<string, string[]>;
  anuncios: Anuncio[];
  mensajePantalla: string;
  historialTotal: number;
  destelloSegundos: number;
}) {
  const [activos, setActivos] = useState<Map<string, TurnoPublico>>(
    new Map(activosIniciales.filter((t) => t.ventanilla_id).map((t) => [t.ventanilla_id as string, t])),
  );
  const [cola, setCola] = useState<Map<string, TurnoPublico>>(
    new Map(colaInicial.map((t) => [t.id as string, t])),
  );
  const [historial, setHistorial] = useState<TurnoPublico[]>(historialInicial);
  const [ausentes, setAusentes] = useState<TurnoPublico[]>(ausentesInicial);
  const [hora, setHora] = useState<Date | null>(null);
  const [conectado, setConectado] = useState(true);

  const nombresVentanillaRef = useRef(new Map(ventanillasIniciales.map((v) => [v.id, v.nombre])));
  const anunciadosRef = useRef(new Map<string, string>());
  const colaRef = useRef<ColaAnuncios | null>(null);

  useEffect(() => {
    colaRef.current = new ColaAnuncios();
    for (const t of activosIniciales) {
      if (t.id && t.llamado_at) anunciadosRef.current.set(t.id, t.llamado_at);
    }
    // Solo se siembra una vez, con los datos de la carga inicial del servidor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setHora(new Date());
    const id = setInterval(() => setHora(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;

    async function resync() {
      const [{ data: activosData }, { data: colaData }, { data: historialData }, { data: ausentesData }] =
        await Promise.all([
          supabase.from("v_turnos_publicos").select("*").eq("sucursal_id", sucursalId).in("estado", ESTADOS_ACTIVOS),
          supabase
            .from("v_turnos_publicos")
            .select("*")
            .eq("sucursal_id", sucursalId)
            .eq("estado", "ESPERANDO")
            .order("created_at", { ascending: true }),
          supabase
            .from("v_turnos_publicos")
            .select("*")
            .eq("sucursal_id", sucursalId)
            .eq("estado", "FINALIZADO")
            .not("llamado_at", "is", null)
            .order("llamado_at", { ascending: false })
            .limit(historialTotal),
          supabase
            .from("v_turnos_publicos")
            .select("*")
            .eq("sucursal_id", sucursalId)
            .eq("estado", "AUSENTE")
            .not("llamado_at", "is", null)
            .order("llamado_at", { ascending: false })
            .limit(MAX_AUSENTES),
        ]);
      if (disposed) return;
      if (activosData) {
        setActivos(new Map(activosData.filter((t) => t.ventanilla_id).map((t) => [t.ventanilla_id as string, t])));
      }
      if (colaData) setCola(new Map(colaData.map((t) => [t.id as string, t])));
      if (historialData) setHistorial(historialData);
      if (ausentesData) setAusentes(ausentesData);
    }

    function procesarFila(row: TurnoRow) {
      if (!row.id) return;

      // La cola pública (ESPERANDO) se mantiene aparte de los llamados.
      if (row.estado === "ESPERANDO") {
        setCola((prev) => new Map(prev).set(row.id, filaDesdeRealtime(row, nombresVentanillaRef.current)));
        return;
      }
      setCola((prev) => {
        if (!prev.has(row.id)) return prev;
        const siguiente = new Map(prev);
        siguiente.delete(row.id);
        return siguiente;
      });

      const fila = filaDesdeRealtime(row, nombresVentanillaRef.current);

      if (row.estado === "AUSENTE") {
        setAusentes((prev) => [fila, ...prev.filter((t) => t.id !== fila.id)].slice(0, MAX_AUSENTES));
      }

      if (!row.ventanilla_id) return;

      if (ESTADOS_ACTIVOS.includes(row.estado)) {
        setActivos((prev) => new Map(prev).set(row.ventanilla_id as string, fila));
      } else {
        setActivos((prev) => {
          if (prev.get(row.ventanilla_id as string)?.id !== row.id) return prev;
          const siguiente = new Map(prev);
          siguiente.delete(row.ventanilla_id as string);
          return siguiente;
        });
        if (row.estado === "FINALIZADO") {
          setHistorial((prev) => [fila, ...prev.filter((t) => t.id !== fila.id)].slice(0, historialTotal));
        }
      }

      if (row.estado === "LLAMANDO" && row.llamado_at && row.id) {
        const previo = anunciadosRef.current.get(row.id);
        if (previo !== row.llamado_at) {
          anunciadosRef.current.set(row.id, row.llamado_at);
          const nombreVentanilla = nombresVentanillaRef.current.get(row.ventanilla_id) ?? "";
          colaRef.current?.encolar(textoAnuncioTurno(row.codigo_ticket ?? "", nombreVentanilla));
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
        .channel(`turnos-${sucursalId}`)
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

    function alVolverOnline() {
      resync();
    }
    window.addEventListener("online", alVolverOnline);

    return () => {
      disposed = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      window.removeEventListener("online", alVolverOnline);
      if (channel) supabase.removeChannel(channel);
    };
  }, [sucursalId, historialTotal]);

  const activosLista = Array.from(activos.values()).sort((a, b) => {
    // Los que están siendo llamados ahora van primero; dentro de cada grupo,
    // el llamado más reciente arriba (efecto "pantalla de banco": lo nuevo
    // entra arriba y empuja al resto hacia abajo).
    if (a.estado !== b.estado) return a.estado === "LLAMANDO" ? -1 : 1;
    const fechaA = a.llamado_at ?? a.created_at ?? "";
    const fechaB = b.llamado_at ?? b.created_at ?? "";
    return fechaB.localeCompare(fechaA);
  });

  const colaLista = Array.from(cola.values()).sort((a, b) => {
    // Urgentes primero; dentro de cada grupo, el más antiguo (próximo a
    // llamar) primero.
    if (a.prioridad !== b.prioridad) {
      if (a.prioridad === "URGENTE") return -1;
      if (b.prioridad === "URGENTE") return 1;
    }
    return (a.created_at ?? "").localeCompare(b.created_at ?? "");
  });

  return (
    <div className="flex min-h-screen flex-col bg-[#f4f5f7]">
      <header
        className="flex items-center justify-between border-b-4 bg-white px-8 py-5"
        style={{ borderColor: DORADO }}
      >
        <h1 className="text-2xl font-semibold" style={{ color: AZUL }}>
          {sucursalNombre}
        </h1>
        <div className="flex items-center gap-4">
          {!conectado && (
            <span className="rounded-full bg-red-600 px-3 py-1 text-sm text-white">Reconectando…</span>
          )}
          <span className="text-2xl font-medium tabular-nums" style={{ color: AZUL }}>
            {hora?.toLocaleTimeString("es-HN", { hour: "2-digit", minute: "2-digit" }) ?? "--:--"}
          </span>
        </div>
      </header>

      <div className="flex flex-1 flex-col lg:flex-row">
        <main className="flex flex-1 flex-col items-center justify-center gap-6 px-10 py-6">
          {activosLista.length === 0 ? (
            <p className="text-3xl text-slate-400">Esperando el próximo llamado</p>
          ) : (
            <div className="w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-sm divide-y divide-slate-100">
              <AnimatePresence>
                {activosLista.map((t) => {
                  const llamando = t.estado === "LLAMANDO";
                  const segundosDesdeLlamado =
                    llamando && t.llamado_at && hora
                      ? (hora.getTime() - new Date(t.llamado_at).getTime()) / 1000
                      : Infinity;
                  const destello = segundosDesdeLlamado < destelloSegundos;
                  return (
                    <motion.div
                      key={t.ventanilla_id}
                      layout
                      initial={{ opacity: 0, y: -16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 16 }}
                      transition={{ duration: 0.35 }}
                      className={`flex h-14 items-center justify-between px-5 ${
                        destello ? "animate-pulse ring-4 ring-inset ring-white" : ""
                      }`}
                      style={llamando ? { backgroundColor: DORADO, color: "#ffffff" } : { color: AZUL }}
                    >
                      <span className="text-2xl font-bold tabular-nums">{t.codigo_ticket}</span>
                      <span className={`font-medium ${llamando ? "text-base" : "text-sm opacity-70"}`}>
                        Ventanilla {t.ventanilla_nombre ?? "—"}
                      </span>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}

          {colaLista.length > 0 && (
            <div className="w-full max-w-md">
              <p className="mb-1 text-xs font-medium text-slate-400">
                En cola ({colaLista.length})
              </p>
              <div className="overflow-hidden rounded-lg bg-white shadow-sm divide-y divide-slate-100">
                <AnimatePresence initial={false}>
                  {colaLista.map((t) => {
                    const estilo = estiloTurno(t);
                    const ventanillasDestino = ventanillasPorServicio[t.servicio_id ?? ""] ?? [];
                    return (
                      <motion.div
                        key={t.id}
                        layout
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.25 }}
                        className={`flex h-16 flex-col items-start justify-center px-4 ${estilo.fila}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`text-2xl tabular-nums ${estilo.codigo}`}>{t.codigo_ticket}</span>
                          {estilo.etiqueta && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${estilo.etiquetaClase}`}
                            >
                              {estilo.etiqueta}
                            </span>
                          )}
                        </div>
                        <span className={`text-xs font-medium ${estilo.texto}`}>
                          {ventanillasDestino.length > 0
                            ? `→ ${ventanillasDestino.map((v: string) => `Ventanilla ${v}`).join(" · ")}`
                            : "Sin ventanilla asignada"}
                        </span>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          )}

          {historial.length > 0 && (
            <div className="w-full max-w-md">
              <p className="mb-1 text-xs font-medium text-slate-400">Últimos llamados</p>
              <div className="overflow-hidden rounded-lg bg-white shadow-sm divide-y divide-slate-100">
                <AnimatePresence initial={false}>
                  {historial.map((t) => {
                    const estilo = estiloTurno(t);
                    return (
                      <motion.div
                        key={t.id}
                        layout
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.25 }}
                        className={`flex h-16 flex-col items-start justify-center px-4 ${estilo.fila}`}
                      >
                        <span className={`text-2xl tabular-nums ${estilo.codigo}`}>{t.codigo_ticket}</span>
                        <span className={`text-xs font-medium ${estilo.texto}`}>
                          Ventanilla {t.ventanilla_nombre ?? "—"}
                        </span>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          )}

          {ausentes.length > 0 && (
            <div className="w-full max-w-md">
              <p className="mb-1 text-xs font-medium text-slate-400">Ausentes</p>
              <div className="overflow-hidden rounded-lg bg-white shadow-sm divide-y divide-slate-100">
                <AnimatePresence initial={false}>
                  {ausentes.map((t) => {
                    const estilo = estiloTurno(t);
                    return (
                      <motion.div
                        key={t.id}
                        layout
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.25 }}
                        className={`flex h-10 flex-col items-start justify-center px-4 ${estilo.fila}`}
                      >
                        <span className={`text-base tabular-nums ${estilo.codigo}`}>{t.codigo_ticket}</span>
                        <span className={`text-[11px] font-medium ${estilo.texto}`}>
                          Ventanilla {t.ventanilla_nombre ?? "—"}
                        </span>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          )}
        </main>

        <aside className="flex h-80 w-full shrink-0 border-t bg-white lg:h-auto lg:w-[28rem] lg:border-t-0 lg:border-l xl:w-[36rem] 2xl:w-[44rem]">
          <PanelPublicidad anuncios={anuncios} />
        </aside>
      </div>

      {mensajePantalla && (
        <footer className="overflow-hidden border-t-4 py-3" style={{ backgroundColor: AZUL, borderColor: DORADO }}>
          <div
            className="animate-marquee whitespace-nowrap text-xl font-medium text-white"
            style={{ animationDuration: `${Math.max(15, mensajePantalla.length / 4)}s` }}
          >
            {mensajePantalla}
          </div>
        </footer>
      )}
    </div>
  );
}
