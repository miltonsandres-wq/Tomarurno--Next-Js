"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Layers,
  Armchair,
  Users,
  UserX,
  BarChart3,
  Megaphone,
  Settings,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SECCIONES: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/supervisor", label: "Monitoreo", icon: LayoutDashboard },
  { href: "/supervisor/servicios", label: "Servicios", icon: Layers },
  { href: "/supervisor/ventanillas", label: "Ventanillas", icon: Armchair },
  { href: "/supervisor/usuarios", label: "Usuarios", icon: Users },
  { href: "/supervisor/ausentes", label: "Ausentes", icon: UserX },
  { href: "/supervisor/metricas", label: "Métricas", icon: BarChart3 },
  { href: "/supervisor/publicidad", label: "Publicidad", icon: Megaphone },
  { href: "/supervisor/configuracion", label: "Configuración", icon: Settings },
];

function Marca() {
  return (
    <div className="flex items-center gap-2.5 border-b px-4 py-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
        T
      </div>
      <div className="leading-tight">
        <p className="text-sm font-semibold">Turnos HN</p>
        <p className="text-xs text-muted-foreground">Panel de administración</p>
      </div>
    </div>
  );
}

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
      {SECCIONES.map((s) => {
        const activo = s.href === "/supervisor" ? pathname === s.href : pathname.startsWith(s.href);
        const Icon = s.icon;
        return (
          <Link
            key={s.href}
            href={s.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 rounded-lg border-l-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
              activo && "border-l-primary bg-accent text-accent-foreground",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {s.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function SupervisorSidebar() {
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between border-b bg-card px-4 py-2.5 md:hidden">
        <span className="text-sm font-semibold text-primary">Panel de administración</span>
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      <aside className="hidden w-60 shrink-0 flex-col border-r bg-card md:flex">
        <Marca />
        <NavLinks pathname={pathname} />
      </aside>

      {abierto && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAbierto(false)} />
          <div className="absolute inset-y-0 left-0 flex w-64 flex-col bg-card shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-4">
              <span className="text-sm font-semibold text-primary">Turnos HN</span>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
                aria-label="Cerrar menú"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavLinks pathname={pathname} onNavigate={() => setAbierto(false)} />
          </div>
        </div>
      )}
    </>
  );
}
