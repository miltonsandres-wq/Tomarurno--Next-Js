"use client";

import { useActionState } from "react";
import Image from "next/image";
import { login, type LoginState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: LoginState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden lg:block" style={{ backgroundColor: "#0b3d91" }}>
        <Image
          src="/images/catedral-comayagua.jpg"
          alt=""
          fill
          priority
          className="object-cover opacity-40"
        />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(160deg, rgba(11,61,145,0.55) 0%, rgba(11,61,145,0.92) 100%)" }}
        />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15 text-lg font-bold">T</div>
            <span className="text-lg font-semibold tracking-tight">Turnos HN</span>
          </div>
          <div className="max-w-md space-y-4">
            <p className="text-sm font-medium uppercase tracking-widest text-white/60">
              Gestión de turnos municipal
            </p>
            <h1 className="text-4xl font-semibold leading-tight text-balance">
              Menos filas, más servicio para Comayagua.
            </h1>
            <p className="text-white/70">
              Monitoreo en vivo, métricas de atención y control de ventanillas en un solo lugar para tu
              municipalidad.
            </p>
          </div>
          <p className="text-xs text-white/50">© {new Date().getFullYear()} Sistema de Turnos Honduras</p>
        </div>
      </div>

      <div className="flex items-center justify-center bg-muted/40 px-4 py-12">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-1.5 text-center lg:text-left">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-lg font-bold text-primary-foreground lg:hidden">
              T
            </div>
            <h2 className="text-xl font-semibold tracking-tight">Ingresá a tu cuenta</h2>
            <p className="text-sm text-muted-foreground">Usá tu cuenta institucional para continuar.</p>
          </div>

          <form action={formAction} className="space-y-4 rounded-xl border bg-card p-6 shadow-sm">
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input id="email" name="email" type="email" required autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" name="password" type="password" required autoComplete="current-password" />
            </div>
            {state?.error && (
              <p className="text-sm text-destructive" role="alert">
                {state.error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Ingresando..." : "Ingresar"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
