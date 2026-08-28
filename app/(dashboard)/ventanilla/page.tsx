import { createClient } from "@/lib/supabase/server";
import { obtenerPerfilActual } from "@/lib/auth/perfil-actual";
import { SelectorVentanilla } from "./selector-ventanilla";
import { VentanillaClient } from "./ventanilla-client";

export default async function VentanillaPage({
  searchParams,
}: {
  searchParams: Promise<{ ventanilla?: string }>;
}) {
  const perfil = await obtenerPerfilActual();
  const { ventanilla: ventanillaParam } = await searchParams;
  const supabase = await createClient();

  const { data: asignaciones } = await supabase
    .from("ventanilla_agentes")
    .select("ventanillas(id, nombre, activa)")
    .eq("agente_id", perfil.id);

  const ventanillas = (asignaciones ?? [])
    .map((a) => a.ventanillas)
    .filter((v): v is { id: string; nombre: string; activa: boolean } => !!v && v.activa);

  if (ventanillas.length === 0) {
    return (
      <div className="p-6 text-muted-foreground">
        No tenés ninguna ventanilla asignada. Contactá a tu supervisor.
      </div>
    );
  }

  const ventanillaSeleccionada =
    ventanillas.find((v) => v.id === ventanillaParam) ?? ventanillas[0];

  const [{ data: serviciosAsignados }, { data: turnoActual }, { data: pausaActiva }, { data: configuracion }] =
    await Promise.all([
      supabase
        .from("ventanilla_servicios")
        .select("servicios(id, nombre)")
        .eq("ventanilla_id", ventanillaSeleccionada.id),
      supabase
        .from("turnos")
        .select("*")
        .eq("ventanilla_id", ventanillaSeleccionada.id)
        .eq("agente_id", perfil.id)
        .in("estado", ["LLAMANDO", "EN_ATENCION"])
        .order("llamado_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from("pausas_agente").select("id, inicio, motivo").eq("agente_id", perfil.id).is("fin", null).maybeSingle(),
      perfil.sucursal_id
        ? supabase
            .from("configuracion")
            .select("valor")
            .eq("sucursal_id", perfil.sucursal_id)
            .eq("clave", "limite_pausa_minutos")
            .single()
        : Promise.resolve({ data: null }),
    ]);

  const servicios = (serviciosAsignados ?? [])
    .map((s) => s.servicios)
    .filter((s): s is { id: string; nombre: string } => !!s);
  const servicioIds = servicios.map((s) => s.id);

  const { data: cola } = perfil.sucursal_id && servicioIds.length > 0
    ? await supabase
        .from("turnos")
        .select("*")
        .eq("sucursal_id", perfil.sucursal_id)
        .eq("estado", "ESPERANDO")
        .in("servicio_id", servicioIds)
    : { data: [] };

  const { data: ausentes } = perfil.sucursal_id && servicioIds.length > 0
    ? await supabase
        .from("turnos")
        .select("*")
        .eq("sucursal_id", perfil.sucursal_id)
        .eq("estado", "AUSENTE")
        .in("servicio_id", servicioIds)
        .not("llamado_at", "is", null)
        .order("llamado_at", { ascending: false })
        .limit(6)
    : { data: [] };

  return (
    <div>
      {ventanillas.length > 1 && (
        <div className="flex justify-end px-6 pt-4">
          <SelectorVentanilla ventanillas={ventanillas} seleccionada={ventanillaSeleccionada.id} />
        </div>
      )}
      <VentanillaClient
        ventanillaId={ventanillaSeleccionada.id}
        ventanillaNombre={ventanillaSeleccionada.nombre}
        agenteId={perfil.id}
        sucursalId={perfil.sucursal_id ?? ""}
        servicios={servicios}
        turnoInicial={turnoActual ?? null}
        colaInicial={cola ?? []}
        ausentesInicial={ausentes ?? []}
        pausaActivaInicial={pausaActiva ?? null}
        limitePausaMinutos={Number(configuracion?.valor ?? 15)}
      />
    </div>
  );
}
