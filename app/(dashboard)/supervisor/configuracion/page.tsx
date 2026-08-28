import { createClient } from "@/lib/supabase/server";
import { obtenerPerfilActual } from "@/lib/auth/perfil-actual";
import { PageHeader } from "@/components/dashboard/page-header";
import { ConfiguracionForm } from "./configuracion-form";

const DEFAULTS = {
  timeout_ausente_segundos: 60,
  rellamado_automatico_segundos: 40,
  limite_pausa_minutos: 15,
  ratio_preferencial: 2,
  minutos_escalacion_urgente: 15,
  turnos_recientes_cantidad: 5,
  destello_llamado_segundos: 10,
  mensaje_pantalla: "Bienvenido. Gracias por su visita.",
};

export default async function ConfiguracionPage() {
  const perfil = await obtenerPerfilActual();

  if (!perfil.sucursal_id) {
    return <div className="p-6 text-muted-foreground">Tu usuario no tiene una sucursal asignada.</div>;
  }

  const supabase = await createClient();
  const { data: filas } = await supabase
    .from("configuracion")
    .select("clave, valor")
    .eq("sucursal_id", perfil.sucursal_id);

  const mapa = new Map((filas ?? []).map((f) => [f.clave, f.valor]));

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Configuración"
        description="Estos valores los aplica el job programado en la base de datos en su próxima corrida (cada 20 segundos), sin necesidad de redeploy."
      />
      <ConfiguracionForm
        valoresIniciales={{
          timeoutAusenteSegundos: Number(mapa.get("timeout_ausente_segundos") ?? DEFAULTS.timeout_ausente_segundos),
          rellamadoAutomaticoSegundos: Number(
            mapa.get("rellamado_automatico_segundos") ?? DEFAULTS.rellamado_automatico_segundos,
          ),
          limitePausaMinutos: Number(mapa.get("limite_pausa_minutos") ?? DEFAULTS.limite_pausa_minutos),
          ratioPreferencial: Number(mapa.get("ratio_preferencial") ?? DEFAULTS.ratio_preferencial),
          minutosEscalacionUrgente: Number(
            mapa.get("minutos_escalacion_urgente") ?? DEFAULTS.minutos_escalacion_urgente,
          ),
          turnosRecientesCantidad: Number(
            mapa.get("turnos_recientes_cantidad") ?? DEFAULTS.turnos_recientes_cantidad,
          ),
          destelloLlamadoSegundos: Number(
            mapa.get("destello_llamado_segundos") ?? DEFAULTS.destello_llamado_segundos,
          ),
          mensajePantalla: mapa.get("mensaje_pantalla") ?? DEFAULTS.mensaje_pantalla,
        }}
      />
    </div>
  );
}
