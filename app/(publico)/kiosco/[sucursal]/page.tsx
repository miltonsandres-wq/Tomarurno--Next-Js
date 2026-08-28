import { createClient } from "@/lib/supabase/server";
import { KioscoClient } from "./kiosco-client";

export default async function KioscoPage({
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
      <div className="flex min-h-screen items-center justify-center bg-white p-8 text-center">
        <p className="text-2xl text-slate-600">Sucursal no encontrada o inactiva.</p>
      </div>
    );
  }

  const { data: servicios } = await supabase
    .from("servicios")
    .select("id, nombre, prefijo_ticket, icono")
    .eq("sucursal_id", sucursalRow.id)
    .eq("activo", true)
    .order("nombre");

  return <KioscoClient sucursal={sucursalRow} servicios={servicios ?? []} />;
}
