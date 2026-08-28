"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ShieldCheck, Ticket, Tv } from "lucide-react";

const AZUL = "#0b3d91";
const DORADO = "#c8a13a";

const ICONOS = { Ticket, Tv, ShieldCheck };

export type Enlace = {
  href?: string;
  icono: keyof typeof ICONOS;
  titulo: string;
  descripcion: string;
};

export function HomeClient({
  nombreSucursal,
  enlaces,
}: {
  nombreSucursal: string;
  enlaces: Enlace[];
}) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-white">
      <Image
        src="/images/catedral-comayagua.jpg"
        alt="Catedral de la Inmaculada Concepción de Comayagua"
        fill
        priority
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/50 to-black/85" />

      <header className="relative z-10 px-6 py-6">
        <div className="mx-auto flex max-w-5xl items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 text-sm font-bold text-white backdrop-blur">
            T
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-white">Turnos HN</p>
            <p className="text-xs text-white/70">{nombreSucursal}</p>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-12 px-6 py-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-3"
        >
          <p className="text-sm font-medium uppercase tracking-widest" style={{ color: DORADO }}>
            Primera Capital de Honduras
          </p>
          <h1 className="text-4xl font-bold text-white drop-shadow-md sm:text-5xl">
            Sistema de Turnos
          </h1>
          <p className="mx-auto max-w-xl text-lg text-white/85">
            Menos filas, más servicio. Elegí la pantalla que necesitás abrir.
          </p>
        </motion.div>

        <div className="grid w-full grid-cols-1 gap-5 sm:grid-cols-3">
          {enlaces.map(({ href, icono, titulo, descripcion }, i) => {
            const Icono = ICONOS[icono];
            const tarjeta = (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15 + i * 0.1 }}
                whileHover={href ? { y: -4 } : undefined}
                className={`flex h-full flex-col items-start gap-3 rounded-2xl border border-white/10 bg-white/95 p-6 text-left shadow-lg backdrop-blur transition-shadow ${
                  href ? "hover:shadow-xl" : "opacity-60"
                }`}
              >
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl"
                  style={{ backgroundColor: "#eaf1fb", color: AZUL }}
                >
                  <Icono className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-lg font-semibold" style={{ color: AZUL }}>
                    {titulo}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">{descripcion}</p>
                </div>
                {!href && (
                  <p className="text-xs text-slate-400">Sin sucursal activa configurada.</p>
                )}
              </motion.div>
            );

            return href ? (
              <Link key={titulo} href={href} className="block h-full">
                {tarjeta}
              </Link>
            ) : (
              <div key={titulo} className="h-full">
                {tarjeta}
              </div>
            );
          })}
        </div>
      </main>

      <footer className="relative z-10 px-6 py-5 text-center text-xs text-white/60">
        © {new Date().getFullYear()} Sistema de Turnos Honduras · Fundada en 1537
      </footer>
    </div>
  );
}
