"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { obtenerPerfilActual } from "@/lib/auth/perfil-actual";
import { ventanillaSchema, type VentanillaInput } from "@/lib/validations/ventanilla";

export type AccionResultado = { ok: true } | { ok: false; error: string };

export async function guardarVentanilla(input: VentanillaInput): Promise<AccionResultado> {
  const parsed = ventanillaSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const perfil = await obtenerPerfilActual();
  if (!perfil.sucursal_id) {
    return { ok: false, error: "Tu usuario no tiene una sucursal asignada" };
  }

  const supabase = await createClient();
  const { id, nombre, activa, servicioIds, agenteIds } = parsed.data;

  let ventanillaId = id;
  if (ventanillaId) {
    const { error } = await supabase.from("ventanillas").update({ nombre, activa }).eq("id", ventanillaId);
    if (error) return { ok: false, error: "No se pudo actualizar la ventanilla" };
  } else {
    const { data, error } = await supabase
      .from("ventanillas")
      .insert({ nombre, activa, sucursal_id: perfil.sucursal_id })
      .select("id")
      .single();
    if (error || !data) return { ok: false, error: "No se pudo crear la ventanilla" };
    ventanillaId = data.id;
  }

  const [{ error: delServError }, { error: delAgError }] = await Promise.all([
    supabase.from("ventanilla_servicios").delete().eq("ventanilla_id", ventanillaId),
    supabase.from("ventanilla_agentes").delete().eq("ventanilla_id", ventanillaId),
  ]);
  if (delServError || delAgError) {
    return { ok: false, error: "No se pudieron actualizar las asignaciones" };
  }

  if (servicioIds.length > 0) {
    const { error } = await supabase
      .from("ventanilla_servicios")
      .insert(servicioIds.map((servicio_id) => ({ ventanilla_id: ventanillaId, servicio_id })));
    if (error) return { ok: false, error: "No se pudieron asignar los servicios" };
  }

  if (agenteIds.length > 0) {
    const { error } = await supabase
      .from("ventanilla_agentes")
      .insert(agenteIds.map((agente_id) => ({ ventanilla_id: ventanillaId, agente_id })));
    if (error) return { ok: false, error: "No se pudieron asignar los agentes" };
  }

  revalidatePath("/supervisor/ventanillas");
  return { ok: true };
}
