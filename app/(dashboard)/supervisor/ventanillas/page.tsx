import { Armchair } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { obtenerPerfilActual } from "@/lib/auth/perfil-actual";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatTile } from "@/components/dashboard/stat-tile";
import { EmptyState } from "@/components/dashboard/empty-state";
import { VentanillaDialog } from "./ventanilla-dialog";

export default async function VentanillasPage() {
  const perfil = await obtenerPerfilActual();
  const supabase = await createClient();

  if (!perfil.sucursal_id) {
    return <div className="p-6 text-muted-foreground">Tu usuario no tiene una sucursal asignada.</div>;
  }

  const [{ data: ventanillas }, { data: servicios }, { data: agentes }] = await Promise.all([
    supabase.from("ventanillas").select("id, nombre, activa").eq("sucursal_id", perfil.sucursal_id).order("nombre"),
    supabase.from("servicios").select("id, nombre").eq("sucursal_id", perfil.sucursal_id).eq("activo", true).order("nombre"),
    supabase.from("perfiles").select("id, nombre").eq("sucursal_id", perfil.sucursal_id).eq("rol", "agente").order("nombre"),
  ]);

  const ventanillaIds = (ventanillas ?? []).map((v) => v.id);
  const [{ data: asignServ }, { data: asignAg }] = await Promise.all([
    ventanillaIds.length
      ? supabase.from("ventanilla_servicios").select("ventanilla_id, servicio_id").in("ventanilla_id", ventanillaIds)
      : Promise.resolve({ data: [] as { ventanilla_id: string; servicio_id: string }[] }),
    ventanillaIds.length
      ? supabase.from("ventanilla_agentes").select("ventanilla_id, agente_id").in("ventanilla_id", ventanillaIds)
      : Promise.resolve({ data: [] as { ventanilla_id: string; agente_id: string }[] }),
  ]);

  const serviciosPorVentanilla = new Map<string, string[]>();
  for (const row of asignServ ?? []) {
    const lista = serviciosPorVentanilla.get(row.ventanilla_id) ?? [];
    lista.push(row.servicio_id);
    serviciosPorVentanilla.set(row.ventanilla_id, lista);
  }
  const agentesPorVentanilla = new Map<string, string[]>();
  for (const row of asignAg ?? []) {
    const lista = agentesPorVentanilla.get(row.ventanilla_id) ?? [];
    lista.push(row.agente_id);
    agentesPorVentanilla.set(row.ventanilla_id, lista);
  }

  const nombreServicio = new Map((servicios ?? []).map((s) => [s.id, s.nombre]));
  const nombreAgente = new Map((agentes ?? []).map((a) => [a.id, a.nombre]));

  const lista = ventanillas ?? [];
  const activas = lista.filter((v) => v.activa).length;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Ventanillas"
        description="Puntos de atención y qué servicios y agentes tiene asignados cada uno."
        actions={<VentanillaDialog servicios={servicios ?? []} agentes={agentes ?? []} />}
      />

      <div className="grid grid-cols-2 gap-4 sm:w-64">
        <StatTile etiqueta="Ventanillas" valor={String(lista.length)} icono={Armchair} />
        <StatTile etiqueta="Activas" valor={String(activas)} meter={lista.length > 0 ? activas / lista.length : 0} />
      </div>

      {lista.length === 0 ? (
        <EmptyState
          icono={Armchair}
          titulo="No hay ventanillas registradas"
          descripcion="Creá una ventanilla y asignale servicios y agentes para empezar a atender."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Servicios</TableHead>
                <TableHead>Agentes</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.map((v) => {
                const servicioIds = serviciosPorVentanilla.get(v.id) ?? [];
                const agenteIds = agentesPorVentanilla.get(v.id) ?? [];
                return (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{v.nombre}</TableCell>
                    <TableCell>
                      <Badge variant={v.activa ? "default" : "secondary"}>
                        {v.activa ? "Activa" : "Inactiva"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {servicioIds.map((id) => nombreServicio.get(id)).filter(Boolean).join(", ") || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {agenteIds.map((id) => nombreAgente.get(id)).filter(Boolean).join(", ") || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <VentanillaDialog
                        ventanilla={{ id: v.id, nombre: v.nombre, activa: v.activa, servicioIds, agenteIds }}
                        servicios={servicios ?? []}
                        agentes={agentes ?? []}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
