import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "./actions";
import { Button } from "@/components/ui/button";

export default async function DashboardLayout({
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
    .select("nombre, rol")
    .eq("id", user.id)
    .single();

  if (!perfil) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <header
        className="flex h-12 items-center justify-between border-b-4 px-4 text-white sm:px-6"
        style={{ backgroundColor: "#0b3d91", borderColor: "#c8a13a" }}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white/15 text-xs font-bold">T</div>
          <span className="hidden text-sm font-semibold tracking-tight sm:inline">Turnos HN</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm font-medium sm:inline">
            {perfil.nombre} <span className="text-white/50">·</span>{" "}
            <span className="text-white/80 capitalize">{perfil.rol}</span>
          </span>
          <form action={logout}>
            <Button type="submit" variant="secondary" size="sm">
              Cerrar sesión
            </Button>
          </form>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
