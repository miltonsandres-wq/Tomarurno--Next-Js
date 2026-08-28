"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AccionResultado = { ok: true } | { ok: false; error: string };

export async function reactivarTurno(turnoId: string): Promise<AccionResultado> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("reactivar_ausente", { p_turno_id: turnoId });

  if (error) {
    return { ok: false, error: error.message || "No se pudo reactivar el turno" };
  }

  revalidatePath("/supervisor/ausentes");
  return { ok: true };
}
