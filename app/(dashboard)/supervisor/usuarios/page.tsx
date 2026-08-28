import { Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { obtenerPerfilActual } from "@/lib/auth/perfil-actual";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatTile } from "@/components/dashboard/stat-tile";
import { EmptyState } from "@/components/dashboard/empty-state";
import { InvitarDialog } from "./invitar-dialog";
import { UsuarioActivoSwitch } from "./usuario-activo-switch";

function iniciales(nombre: string) {
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export default async function UsuariosPage() {
  const perfil = await obtenerPerfilActual();
  const supabase = await createClient();

  const [{ data: usuarios }, { data: ventanillas }] = perfil.sucursal_id
    ? await Promise.all([
        supabase
          .from("perfiles")
          .select("id, nombre, rol, activo")
          .eq("sucursal_id", perfil.sucursal_id)
          .order("nombre"),
        supabase.from("ventanillas").select("id, nombre").eq("sucursal_id", perfil.sucursal_id).order("nombre"),
      ])
    : [{ data: [] }, { data: [] }];

  const lista = usuarios ?? [];
  const activos = lista.filter((u) => u.activo).length;
  const listaVentanillas = ventanillas ?? [];

  const agenteIds = lista.filter((u) => u.rol === "agente").map((u) => u.id);
  const { data: asignaciones } = agenteIds.length
    ? await supabase.from("ventanilla_agentes").select("agente_id, ventanillas(nombre)").in("agente_id", agenteIds)
    : { data: [] };

  const ventanillasPorAgente = new Map<string, string[]>();
  for (const a of asignaciones ?? []) {
    if (!a.ventanillas?.nombre) continue;
    const lista = ventanillasPorAgente.get(a.agente_id) ?? [];
    lista.push(a.ventanillas.nombre);
    ventanillasPorAgente.set(a.agente_id, lista);
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Usuarios"
        description="Agentes, supervisores y administradores con acceso a esta sucursal."
        actions={<InvitarDialog ventanillas={listaVentanillas} />}
      />

      <div className="grid grid-cols-2 gap-4 sm:w-64">
        <StatTile etiqueta="Usuarios" valor={String(lista.length)} icono={Users} />
        <StatTile etiqueta="Activos" valor={String(activos)} meter={lista.length > 0 ? activos / lista.length : 0} />
      </div>

      {lista.length === 0 ? (
        <EmptyState icono={Users} titulo="No hay usuarios registrados" descripcion="Invitá a tu primer agente o supervisor." />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Ventanillas</TableHead>
                <TableHead>Activo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                        {iniciales(u.nombre)}
                      </span>
                      <span className="font-medium">{u.nombre}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {u.rol}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {u.rol === "agente" ? (ventanillasPorAgente.get(u.id)?.join(", ") ?? "Sin asignar") : "—"}
                  </TableCell>
                  <TableCell>
                    {u.id === perfil.id ? (
                      <span className="text-sm text-muted-foreground">Tu usuario</span>
                    ) : (
                      <UsuarioActivoSwitch id={u.id} activo={u.activo} />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
