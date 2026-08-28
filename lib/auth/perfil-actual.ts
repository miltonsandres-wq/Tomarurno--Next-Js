import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function obtenerPerfilActual() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("id, nombre, rol, sucursal_id")
    .eq("id", user.id)
    .single();

  if (!perfil) {
    redirect("/login");
  }

  return perfil;
}
