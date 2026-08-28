import { createClient } from "@/lib/supabase/server";
import { HomeClient, type Enlace } from "./home-client";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: sucursales } = await supabase
    .from("sucursales")
    .select("id, nombre")
    .eq("activa", true)
    .order("nombre");

  const sucursal = sucursales?.[0] ?? null;

  const enlaces: Enlace[] = [
    {
      href: sucursal ? `/kiosco/${sucursal.id}` : undefined,
      icono: "Ticket",
      titulo: "Kiosco",
      descripcion: "Toma de turnos para ciudadanos en sala de espera.",
    },
    {
      href: sucursal ? `/display/${sucursal.id}` : undefined,
      icono: "Tv",
      titulo: "Pantalla",
      descripcion: "Visualización de turnos llamados en tiempo real.",
    },
    {
      href: "/supervisor",
      icono: "ShieldCheck",
      titulo: "Administración",
      descripcion: "Panel de agentes, supervisores y métricas.",
    },
  ];

  return (
    <HomeClient
      nombreSucursal={sucursal?.nombre ?? "Sistema de gestión de turnos municipal"}
      enlaces={enlaces}
    />
  );
}
