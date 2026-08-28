"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { HeartHandshake, User } from "lucide-react";
import QRCode from "qrcode";
import { obtenerIconoServicio } from "@/lib/iconos-servicio";
import { tomarTicket } from "./actions";

type Servicio = { id: string; nombre: string; prefijo_ticket: string; icono: string };
type Sucursal = { id: string; nombre: string };

type Paso =
  | { tipo: "landing" }
  | { tipo: "servicio" }
  | { tipo: "prioridad"; servicio: Servicio }
  | { tipo: "resultado"; codigoTicket: string }
  | { tipo: "error"; mensaje: string };

const RESULTADO_DURACION_MS = 5000;
const AZUL = "#0b3d91";
const DORADO = "#c8a13a";

function FondoCatedral({ claro = false }: { claro?: boolean }) {
  return (
    <>
      <Image
        src="/images/catedral-comayagua.jpg"
        alt="Catedral de la Inmaculada Concepción de Comayagua"
        fill
        priority
        className="object-cover"
      />
      <div className={claro ? "absolute inset-0 bg-white/88" : "absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/20"} />
    </>
  );
}

export function KioscoClient({
  sucursal,
  servicios,
}: {
  sucursal: Sucursal;
  servicios: Servicio[];
}) {
  const [paso, setPaso] = useState<Paso>({ tipo: "landing" });
  const [enviando, setEnviando] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const volverAlInicio = useCallback(() => setPaso({ tipo: "landing" }), []);

  useEffect(() => {
    if (paso.tipo !== "resultado") return;
    const id = setTimeout(volverAlInicio, RESULTADO_DURACION_MS);
    return () => clearTimeout(id);
  }, [paso, volverAlInicio]);

  useEffect(() => {
    if (paso.tipo !== "resultado") {
      setQrDataUrl(null);
      return;
    }
    let cancelado = false;
    QRCode.toDataURL(`Turno ${paso.codigoTicket} - ${sucursal.nombre}`, {
      width: 240,
      margin: 1,
      color: { dark: AZUL, light: "#ffffff" },
    }).then((url) => {
      if (!cancelado) setQrDataUrl(url);
    });
    return () => {
      cancelado = true;
    };
  }, [paso, sucursal.nombre]);

  async function elegirPrioridad(servicio: Servicio, prioridad: "NORMAL" | "PREFERENCIAL") {
    setEnviando(true);
    const resultado = await tomarTicket({ servicioId: servicio.id, prioridad });
    setEnviando(false);
    setPaso(
      resultado.ok
        ? { tipo: "resultado", codigoTicket: resultado.codigoTicket }
        : { tipo: "error", mensaje: resultado.error },
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header
        className="border-b-4 bg-white px-8 py-6 print:hidden"
        style={{ borderColor: DORADO }}
      >
        <h1 className="text-2xl font-semibold" style={{ color: AZUL }}>
          {sucursal.nombre}
        </h1>
      </header>

      <main className="relative flex flex-1 items-center justify-center overflow-hidden p-8">
        <AnimatePresence mode="wait">
          {paso.tipo === "landing" && (
            <motion.div
              key="landing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center px-6 md:px-10"
            >
              <FondoCatedral />

              <div className="relative z-10 flex w-full max-w-6xl flex-col items-start gap-10 text-left md:flex-row md:justify-between">
                <div className="flex max-w-xl flex-col items-start gap-6">
                  <p className="text-lg font-medium tracking-wide" style={{ color: DORADO }}>
                    Primera Capital de Honduras
                  </p>
                  <h2 className="text-4xl font-bold text-white drop-shadow-md">
                    Bienvenido a {sucursal.nombre}
                  </h2>
                  <p className="text-lg leading-relaxed text-white/90">
                    Fundada en 1537, Comayagua fue la capital de Honduras durante gran parte de la
                    época colonial. Su casco histórico conserva arquitectura colonial, y la
                    Catedral de la Inmaculada Concepción alberga uno de los relojes más antiguos
                    del mundo todavía en funcionamiento.
                  </p>
                </div>

                <div className="flex max-w-md flex-col items-start gap-6">
                  <h2 className="text-4xl font-bold drop-shadow-md" style={{ color: DORADO }}>
                    Bienvenido, Toma tu Turno
                  </h2>
                  <p className="text-lg text-white/90">
                    Presioná el botón para ser atendido en nuestras ventanillas.
                  </p>
                  <button
                    onClick={() => setPaso({ tipo: "servicio" })}
                    className="rounded-2xl bg-white px-16 py-8 text-3xl font-semibold shadow-md transition active:scale-95"
                    style={{ color: AZUL }}
                  >
                    Generar Ticket
                  </button>
                </div>
              </div>

              <p className="absolute bottom-2 right-3 z-10 text-xs text-white/50">
                Foto: Luis Alfredo Romero / Wikimedia Commons (CC BY 4.0)
              </p>
            </motion.div>
          )}

          {paso.tipo === "servicio" && (
            <motion.div
              key="servicio"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-8 overflow-y-auto px-6 py-10"
            >
              <FondoCatedral claro />

              <div className="relative z-10 text-center">
                <h2 className="text-4xl font-bold" style={{ color: AZUL }}>
                  Servicios Disponibles
                </h2>
                <p className="mx-auto mt-3 max-w-2xl text-lg text-slate-600">
                  Selecciona el servicio que necesitas para solicitar tu turno. Todos nuestros
                  servicios están disponibles con atención prioritaria para adultos mayores,
                  personas con discapacidad y mujeres embarazadas.
                </p>
              </div>

              <div className="relative z-10 grid w-full max-w-4xl grid-cols-1 gap-6 sm:grid-cols-2">
                {servicios.length === 0 && (
                  <p className="col-span-full text-center text-xl text-slate-500">
                    No hay servicios disponibles en este momento.
                  </p>
                )}
                {servicios.map((servicio) => {
                  const Icono = obtenerIconoServicio(servicio.icono);
                  return (
                    <button
                      key={servicio.id}
                      onClick={() => setPaso({ tipo: "prioridad", servicio })}
                      className="flex flex-col items-center gap-3 rounded-2xl border-4 bg-white px-8 py-10 text-center text-3xl font-semibold shadow-md transition active:scale-95"
                      style={{ borderColor: AZUL, color: AZUL }}
                    >
                      <Icono className="h-12 w-12" />
                      {servicio.nombre}
                    </button>
                  );
                })}
              </div>
              <button onClick={volverAlInicio} className="relative z-10 text-lg text-slate-500 underline">
                Volver
              </button>
            </motion.div>
          )}

          {paso.tipo === "prioridad" && (
            <motion.div
              key="prioridad"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-8 px-6"
            >
              <FondoCatedral claro />

              <h2 className="relative z-10 text-center text-3xl font-semibold" style={{ color: AZUL }}>
                {paso.servicio.nombre}
              </h2>
              <div className="relative z-10 grid w-full max-w-3xl grid-cols-1 gap-6 sm:grid-cols-2">
                <button
                  disabled={enviando}
                  onClick={() => elegirPrioridad(paso.servicio, "NORMAL")}
                  className="flex flex-col items-center gap-3 rounded-2xl border-4 bg-white px-8 py-12 text-center text-2xl font-semibold shadow-md transition active:scale-95 disabled:opacity-50"
                  style={{ borderColor: AZUL, color: AZUL }}
                >
                  <User className="h-10 w-10" />
                  Atención Normal
                </button>
                <button
                  disabled={enviando}
                  onClick={() => elegirPrioridad(paso.servicio, "PREFERENCIAL")}
                  className="flex flex-col items-center gap-3 rounded-2xl border-4 bg-white px-8 py-12 text-center text-2xl font-semibold shadow-md transition active:scale-95 disabled:opacity-50"
                  style={{ borderColor: DORADO, color: DORADO }}
                >
                  <HeartHandshake className="h-10 w-10" />
                  Atención Preferencial
                  <span className="block text-base font-normal text-slate-500">
                    Tercera edad, embarazadas, discapacidad
                  </span>
                </button>
              </div>
              <button onClick={volverAlInicio} className="relative z-10 text-lg text-slate-500 underline">
                Cancelar
              </button>
            </motion.div>
          )}

          {paso.tipo === "resultado" && (
            <motion.div
              key="resultado"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center gap-4 text-center"
            >
              <p className="text-2xl text-slate-600 print:hidden">Su turno es</p>
              <p className="text-8xl font-bold" style={{ color: AZUL }}>
                {paso.codigoTicket}
              </p>
              {qrDataUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrDataUrl} alt={`Código QR del turno ${paso.codigoTicket}`} width={200} height={200} />
              )}
              <p className="text-xl text-slate-600">Por favor espere a ser llamado</p>
              <button
                onClick={() => window.print()}
                className="mt-2 rounded-xl border-2 px-6 py-3 text-lg font-medium transition active:scale-95 print:hidden"
                style={{ borderColor: AZUL, color: AZUL }}
              >
                Imprimir
              </button>
            </motion.div>
          )}

          {paso.tipo === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-6 text-center"
            >
              <p className="text-2xl text-red-600">{paso.mensaje}</p>
              <button
                onClick={volverAlInicio}
                className="rounded-xl px-8 py-4 text-xl text-white"
                style={{ backgroundColor: AZUL }}
              >
                Volver a intentar
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
