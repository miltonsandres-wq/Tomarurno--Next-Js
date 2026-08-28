"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { nuevaPasswordSchema } from "@/lib/validations/auth";

export type ActualizarPasswordState = { error?: string };

export async function actualizarPassword(
  _prevState: ActualizarPasswordState,
  formData: FormData,
): Promise<ActualizarPasswordState> {
  const parsed = nuevaPasswordSchema.safeParse({ password: formData.get("password") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return { error: "No se pudo actualizar la contraseña. El enlace puede haber expirado." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: perfil } = await supabase.from("perfiles").select("rol").eq("id", user.id).single();
  redirect(perfil?.rol === "agente" ? "/ventanilla" : "/supervisor");
}
