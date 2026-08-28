"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { obtenerPerfilActual } from "@/lib/auth/perfil-actual";
import { anuncioSchema, type AnuncioInput } from "@/lib/validations/anuncio";

export type AccionResultado = { ok: true } | { ok: false; error: string };

export async function guardarAnuncio(input: AnuncioInput): Promise<AccionResultado> {
  const parsed = anuncioSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const perfil = await obtenerPerfilActual();
  if (!perfil.sucursal_id) {
    return { ok: false, error: "Tu usuario no tiene una sucursal asignada" };
  }

  const supabase = await createClient();
  const { id, titulo, imagenUrl, activo, orden } = parsed.data;

  const { error } = id
    ? await supabase
        .from("anuncios")
        .update({ titulo: titulo || null, imagen_url: imagenUrl, activo, orden })
        .eq("id", id)
    : await supabase
        .from("anuncios")
        .insert({ titulo: titulo || null, imagen_url: imagenUrl, activo, orden, sucursal_id: perfil.sucursal_id });

  if (error) {
    return { ok: false, error: "No se pudo guardar el anuncio" };
  }

  revalidatePath("/supervisor/publicidad");
  return { ok: true };
}

export async function eliminarAnuncio(id: string, imagenUrl: string): Promise<AccionResultado> {
  const supabase = await createClient();

  const { error } = await supabase.from("anuncios").delete().eq("id", id);
  if (error) {
    return { ok: false, error: "No se pudo eliminar el anuncio" };
  }

  const marcador = "/object/public/publicidad/";
  const indice = imagenUrl.indexOf(marcador);
  if (indice !== -1) {
    const ruta = imagenUrl.slice(indice + marcador.length);
    await supabase.storage.from("publicidad").remove([ruta]);
  }

  revalidatePath("/supervisor/publicidad");
  return { ok: true };
}
