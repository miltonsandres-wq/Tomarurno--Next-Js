"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { obtenerPerfilActual } from "@/lib/auth/perfil-actual";

export type AccionResultado = { ok: true } | { ok: false; error: string };

export async function llamarSiguiente(ventanillaId: string): Promise<AccionResultado> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("llamar_siguiente_turno", { p_ventanilla_id: ventanillaId });

  if (error) {
    return { ok: false, error: error.message || "No se pudo llamar el siguiente turno" };
  }
  if (!data) {
    return { ok: false, error: "No hay turnos en espera para esta ventanilla" };
  }

  revalidatePath("/ventanilla");
  return { ok: true };
}

export async function rellamar(turnoId: string): Promise<AccionResultado> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("rellamar_turno", { p_turno_id: turnoId });
  if (error) return { ok: false, error: error.message || "No se pudo re-llamar el turno" };
  revalidatePath("/ventanilla");
  return { ok: true };
}

export async function iniciarAtencion(turnoId: string): Promise<AccionResultado> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("iniciar_atencion", { p_turno_id: turnoId });
  if (error) return { ok: false, error: error.message || "No se pudo iniciar la atención" };
  revalidatePath("/ventanilla");
  return { ok: true };
}

export async function finalizarTurno(turnoId: string): Promise<AccionResultado> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("finalizar_turno", { p_turno_id: turnoId });
  if (error) return { ok: false, error: error.message || "No se pudo finalizar el turno" };
  revalidatePath("/ventanilla");
  return { ok: true };
}

export async function marcarAusente(turnoId: string): Promise<AccionResultado> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("marcar_ausente_manual", { p_turno_id: turnoId });
  if (error) return { ok: false, error: error.message || "No se pudo marcar el turno como ausente" };
  revalidatePath("/ventanilla");
  return { ok: true };
}

export type IniciarPausaResultado =
  | { ok: true; pausa: { id: string; inicio: string; motivo: string | null } }
  | { ok: false; error: string };

export async function iniciarPausa(motivo: string): Promise<IniciarPausaResultado> {
  const perfil = await obtenerPerfilActual();
  const supabase = await createClient();

  const { data: pausaAbierta } = await supabase
    .from("pausas_agente")
    .select("id")
    .eq("agente_id", perfil.id)
    .is("fin", null)
    .maybeSingle();

  if (pausaAbierta) {
    return { ok: false, error: "Ya tenés una pausa en curso" };
  }

  const { data, error } = await supabase
    .from("pausas_agente")
    .insert({ agente_id: perfil.id, motivo: motivo || null })
    .select("id, inicio, motivo")
    .single();
  if (error || !data) return { ok: false, error: "No se pudo iniciar la pausa" };

  revalidatePath("/ventanilla");
  return { ok: true, pausa: data };
}

// Terminates the caller's own open pausa; it does not trust a client-supplied
// id, since the client only ever has an id for a pausa this same agent owns.
export async function terminarPausa(): Promise<AccionResultado> {
  const perfil = await obtenerPerfilActual();
  const supabase = await createClient();
  const { error } = await supabase
    .from("pausas_agente")
    .update({ fin: new Date().toISOString() })
    .eq("agente_id", perfil.id)
    .is("fin", null);
  if (error) return { ok: false, error: "No se pudo terminar la pausa" };
  revalidatePath("/ventanilla");
  return { ok: true };
}
