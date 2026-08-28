import { createClient } from "@/lib/supabase/server";
import { DisplayClient } from "./display-client";

const HISTORIAL_TOTAL = 6;

export default async function DisplayPage({
  params,
}: {
  params: Promise<{ sucursal: string }>;
}) {
  const { sucursal } = await params;
  const supabase = await createClient();

  const { data: sucursalRow } = await supabase
    .from("sucursales")
    .select("id, nombre")
    .eq("id", sucursal)
    .eq("activa", true)
    .single();

  if (!sucursalRow) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black p-8 text-center text-white">
        <p className="text-2xl text-white/60">Sucursal no encontrada o inactiva.</p>
      </div>
    );
  }

  const [{ data: activos }, { data: historial }, { data: ventanillas }, { data: anuncios }, { data: config }] =
    await Promise.all([
      supabase
        .from("v_turnos_publicos")
        .select("*")
        .eq("sucursal_id", sucursalRow.id)
        .in("estado", ["LLAMANDO", "EN_ATENCION"]),
      supabase
        .from("v_turnos_publicos")
        .select("*")
        .eq("sucursal_id", sucursalRow.id)
        .in("estado", ["FINALIZADO", "AUSENTE"])
        .not("llamado_at", "is", null)
        .order("llamado_at", { ascending: false })
        .limit(HISTORIAL_TOTAL),
      supabase.from("ventanillas").select("id, nombre").eq("sucursal_id", sucursalRow.id),
      supabase
        .from("anuncios")
        .select("id, titulo, imagen_url")
        .eq("sucursal_id", sucursalRow.id)
        .eq("activo", true)
        .order("orden"),
      supabase
        .from("configuracion")
        .select("valor")
        .eq("sucursal_id", sucursalRow.id)
        .eq("clave", "mensaje_pantalla")
        .maybeSingle(),
    ]);

  return (
    <DisplayClient
      sucursalId={sucursalRow.id}
      sucursalNombre={sucursalRow.nombre}
      activosIniciales={activos ?? []}
      historialInicial={historial ?? []}
      ventanillasIniciales={ventanillas ?? []}
      anuncios={anuncios ?? []}
      mensajePantalla={config?.valor ?? ""}
    />
  );
}
