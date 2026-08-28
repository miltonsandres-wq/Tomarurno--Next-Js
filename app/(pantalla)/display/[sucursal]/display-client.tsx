"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Megaphone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { textoAnuncioTurno, ColaAnuncios } from "@/lib/tts";
import type { Database } from "@/lib/types/database";

type TurnoPublico = Database["public"]["Views"]["v_turnos_publicos"]["Row"];
type TurnoRow = Database["public"]["Tables"]["turnos"]["Row"];
type EstadoTurno = Database["public"]["Enums"]["estado_turno"];
type Anuncio = { id: string; titulo: string | null; imagen_url: string };

const EXTENSIONES_VIDEO = [".mp4", ".webm", ".mov", ".ogg"];
const esVideo = (url: string) => EXTENSIONES_VIDEO.some((ext) => url.toLowerCase().includes(ext));

const MAX_HISTORIAL = 6;
const RECONEXION_MS = 3000;
const ROTACION_ANUNCIO_MS = 8000;
const ESTADOS_ACTIVOS: EstadoTurno[] = ["LLAMANDO", "EN_ATENCION"];
const ESTADOS_HISTORIAL: EstadoTurno[] = ["FINALIZADO", "AUSENTE"];

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
  historialInicial,
  ventanillasIniciales,
  anuncios,
  mensajePantalla,
}: {
  sucursalId: string;
  sucursalNombre: string;
  activosIniciales: TurnoPublico[];
  historialInicial: TurnoPublico[];
  ventanillasIniciales: { id: string; nombre: string }[];
  anuncios: Anuncio[];
  mensajePantalla: string;
}) {
  const [activos, setActivos] = useState<Map<string, TurnoPublico>>(
    new Map(activosIniciales.filter((t) => t.ventanilla_id).map((t) => [t.ventanilla_id as string, t])),
  );
  const [historial, setHistorial] = useState<TurnoPublico[]>(historialInicial);
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
      const [{ data: activosData }, { data: historialData }] = await Promise.all([
        supabase.from("v_turnos_publicos").select("*").eq("sucursal_id", sucursalId).in("estado", ESTADOS_ACTIVOS),
        supabase
          .from("v_turnos_publicos")
          .select("*")
          .eq("sucursal_id", sucursalId)
          .in("estado", ESTADOS_HISTORIAL)
          .not("llamado_at", "is", null)
          .order("llamado_at", { ascending: false })
          .limit(MAX_HISTORIAL),
      ]);
      if (disposed) return;
      if (activosData) {
        setActivos(new Map(activosData.filter((t) => t.ventanilla_id).map((t) => [t.ventanilla_id as string, t])));
      }
      if (historialData) setHistorial(historialData);
    }

    function procesarFila(row: TurnoRow) {
      if (row.estado === "ESPERANDO" || !row.ventanilla_id) return;

      const fila = filaDesdeRealtime(row, nombresVentanillaRef.current);

      if (ESTADOS_ACTIVOS.includes(row.estado)) {
        setActivos((prev) => new Map(prev).set(row.ventanilla_id as string, fila));
      } else {
        setActivos((prev) => {
          if (prev.get(row.ventanilla_id as string)?.id !== row.id) return prev;
          const siguiente = new Map(prev);
          siguiente.delete(row.ventanilla_id as string);
          return siguiente;
        });
        if (ESTADOS_HISTORIAL.includes(row.estado)) {
          setHistorial((prev) => [fila, ...prev.filter((t) => t.id !== fila.id)].slice(0, MAX_HISTORIAL));
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
  }, [sucursalId]);

  const activosLista = Array.from(activos.values()).sort((a, b) =>
    (a.ventanilla_nombre ?? "").localeCompare(b.ventanilla_nombre ?? ""),
  );

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
        <main className="flex flex-1 flex-col items-center justify-center gap-12 px-10 py-8">
          {activosLista.length === 0 ? (
            <p className="text-3xl text-slate-400">Esperando el próximo llamado</p>
          ) : (
            <div className="grid w-full max-w-6xl grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              <AnimatePresence>
                {activosLista.map((t) => (
                  <motion.div
                    key={t.ventanilla_id}
                    layout
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ duration: 0.35 }}
                    className="overflow-hidden rounded-2xl px-8 py-8 text-white shadow-lg"
                    style={{ backgroundColor: t.estado === "LLAMANDO" ? DORADO : AZUL }}
                  >
                    <span className="text-sm font-semibold tracking-wide uppercase opacity-80">
                      {t.estado === "LLAMANDO" ? "Llamando" : "Atendiendo"}
                    </span>
                    <p className="mt-1 text-6xl font-bold tabular-nums">{t.codigo_ticket}</p>
                    <p className="mt-2 text-lg opacity-90">Ventanilla {t.ventanilla_nombre ?? "—"}</p>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {historial.length > 0 && (
            <div className="w-full max-w-6xl">
              <p className="mb-2 text-sm font-medium text-slate-400">Últimos llamados</p>
              <div className="grid grid-cols-3 gap-4 rounded-xl bg-white p-5 shadow-sm lg:grid-cols-6">
                <AnimatePresence initial={false}>
                  {historial.map((t) => (
                    <motion.div
                      key={t.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.25 }}
                      className="flex flex-col items-center justify-center gap-1 rounded-lg bg-slate-50 px-4 py-4 text-center"
                    >
                      <span className="text-3xl font-bold tabular-nums" style={{ color: AZUL }}>
                        {t.codigo_ticket}
                      </span>
                      <span className="text-xs text-slate-500">
                        Ventanilla {t.ventanilla_nombre ?? "—"}
                      </span>
                    </motion.div>
                  ))}
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
