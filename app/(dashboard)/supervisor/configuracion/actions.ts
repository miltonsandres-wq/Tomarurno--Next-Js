"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { obtenerPerfilActual } from "@/lib/auth/perfil-actual";
import { configuracionSchema, type ConfiguracionInput } from "@/lib/validations/configuracion";

export type AccionResultado = { ok: true } | { ok: false; error: string };

const CLAVES = {
  timeoutAusenteSegundos: "timeout_ausente_segundos",
  rellamadoAutomaticoSegundos: "rellamado_automatico_segundos",
  limitePausaMinutos: "limite_pausa_minutos",
  ratioPreferencial: "ratio_preferencial",
  minutosEscalacionUrgente: "minutos_escalacion_urgente",
  turnosRecientesCantidad: "turnos_recientes_cantidad",
  destelloLlamadoSegundos: "destello_llamado_segundos",
  mensajePantalla: "mensaje_pantalla",
} as const;

export async function guardarConfiguracion(input: ConfiguracionInput): Promise<AccionResultado> {
  const parsed = configuracionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const perfil = await obtenerPerfilActual();
  if (!perfil.sucursal_id) {
    return { ok: false, error: "Tu usuario no tiene una sucursal asignada" };
  }

  const supabase = await createClient();
  const actualizaciones = (Object.keys(CLAVES) as (keyof typeof CLAVES)[]).map((campo) =>
    supabase
      .from("configuracion")
      .update({ valor: String(parsed.data[campo]) })
      .eq("sucursal_id", perfil.sucursal_id!)
      .eq("clave", CLAVES[campo]),
  );

  const resultados = await Promise.all(actualizaciones);
  if (resultados.some((r) => r.error)) {
    return { ok: false, error: "No se pudo guardar la configuración" };
  }

  revalidatePath("/supervisor/configuracion");
  return { ok: true };
}
