"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { obtenerPerfilActual } from "@/lib/auth/perfil-actual";
import { invitarUsuarioSchema, type InvitarUsuarioInput } from "@/lib/validations/usuario";

export type AccionResultado = { ok: true } | { ok: false; error: string };

export type InvitarResultado =
  | { ok: true; email: string; password: string; avisoVentanillas?: string }
  | { ok: false; error: string };

export async function invitarUsuario(input: InvitarUsuarioInput): Promise<InvitarResultado> {
  const parsed = invitarUsuarioSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const perfil = await obtenerPerfilActual();
  if (perfil.rol !== "supervisor" && perfil.rol !== "admin") {
    return { ok: false, error: "No autorizado" };
  }
  if (!perfil.sucursal_id) {
    return { ok: false, error: "Tu usuario no tiene una sucursal asignada" };
  }

  const admin = createAdminClient();
  const { nombre, email, rol, password, ventanillaIds } = parsed.data;

  // Se crea con contraseña y correo ya confirmado: el usuario queda con
  // credenciales utilizables de inmediato, sin depender de que llegue un
  // correo de invitación (poco confiable en despliegues municipales).
  const { data: creado, error: crearError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (crearError || !creado.user) {
    return { ok: false, error: "No se pudo crear el usuario (¿el correo ya existe?)" };
  }

  const { error: perfilError } = await admin.from("perfiles").insert({
    id: creado.user.id,
    nombre,
    rol,
    sucursal_id: perfil.sucursal_id,
  });

  if (perfilError) {
    await admin.auth.admin.deleteUser(creado.user.id);
    return { ok: false, error: "No se pudo crear el perfil del usuario" };
  }

  let avisoVentanillas: string | undefined;
  if (rol === "agente" && ventanillaIds.length > 0) {
    const { error: asignError } = await admin
      .from("ventanilla_agentes")
      .insert(ventanillaIds.map((ventanilla_id) => ({ ventanilla_id, agente_id: creado.user.id })));
    if (asignError) {
      avisoVentanillas = "El usuario se creó, pero no se pudieron asignar las ventanillas. Asignalas manualmente.";
    }
  }

  revalidatePath("/supervisor/usuarios");
  revalidatePath("/supervisor/ventanillas");
  return { ok: true, email, password, avisoVentanillas };
}

export async function cambiarActivoUsuario(id: string, activo: boolean): Promise<AccionResultado> {
  const perfil = await obtenerPerfilActual();
  if (perfil.rol !== "supervisor" && perfil.rol !== "admin") {
    return { ok: false, error: "No autorizado" };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("perfiles")
    .update({ activo })
    .eq("id", id)
    .eq("sucursal_id", perfil.sucursal_id ?? "");

  if (error) {
    return { ok: false, error: "No se pudo actualizar el usuario" };
  }

  revalidatePath("/supervisor/usuarios");
  return { ok: true };
}
