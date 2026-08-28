import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SupervisorSidebar } from "./sidebar";

export default async function SupervisorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("rol")
    .eq("id", user.id)
    .single();

  if (!perfil || perfil.rol === "agente") {
    redirect("/ventanilla");
  }

  return (
    <div className="flex flex-col md:min-h-[calc(100vh-3rem)] md:flex-row">
      <SupervisorSidebar />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
