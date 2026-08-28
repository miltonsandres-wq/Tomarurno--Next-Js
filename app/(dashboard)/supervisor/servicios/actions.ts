"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { obtenerPerfilActual } from "@/lib/auth/perfil-actual";
import { servicioSchema, type ServicioInput } from "@/lib/validations/servicio";

export type AccionResultado = { ok: true } | { ok: false; error: string };

export async function guardarServicio(input: ServicioInput): Promise<AccionResultado> {
  const parsed = servicioSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const perfil = await obtenerPerfilActual();
  if (!perfil.sucursal_id) {
    return { ok: false, error: "Tu usuario no tiene una sucursal asignada" };
  }

  const supabase = await createClient();
  const { id, nombre, prefijoTicket, icono, activo } = parsed.data;

  const { error } = id
    ? await supabase
        .from("servicios")
        .update({ nombre, prefijo_ticket: prefijoTicket, icono, activo })
        .eq("id", id)
    : await supabase
        .from("servicios")
        .insert({ nombre, prefijo_ticket: prefijoTicket, icono, activo, sucursal_id: perfil.sucursal_id });

  if (error) {
    return { ok: false, error: "No se pudo guardar el servicio" };
  }

  revalidatePath("/supervisor/servicios");
  return { ok: true };
}
