import { Layers } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { obtenerPerfilActual } from "@/lib/auth/perfil-actual";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { obtenerIconoServicio } from "@/lib/iconos-servicio";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatTile } from "@/components/dashboard/stat-tile";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ServicioDialog } from "./servicio-dialog";

export default async function ServiciosPage() {
  const perfil = await obtenerPerfilActual();
  const supabase = await createClient();

  const { data: servicios } = perfil.sucursal_id
    ? await supabase
        .from("servicios")
        .select("id, nombre, prefijo_ticket, icono, activo")
        .eq("sucursal_id", perfil.sucursal_id)
        .order("nombre")
    : { data: [] };

  const lista = servicios ?? [];
  const activos = lista.filter((s) => s.activo).length;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Servicios"
        description="Los tipos de trámite que los ciudadanos pueden solicitar en el kiosco."
        actions={<ServicioDialog />}
      />

      <div className="grid grid-cols-2 gap-4 sm:w-64">
        <StatTile etiqueta="Servicios" valor={String(lista.length)} icono={Layers} />
        <StatTile etiqueta="Activos" valor={String(activos)} meter={lista.length > 0 ? activos / lista.length : 0} />
      </div>

      {lista.length === 0 ? (
        <EmptyState
          icono={Layers}
          titulo="No hay servicios registrados"
          descripcion="Creá el primer servicio para que empiece a aparecer en el kiosco de turnos."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Servicio</TableHead>
                <TableHead>Prefijo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.map((s) => {
                const Icono = obtenerIconoServicio(s.icono);
                return (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent">
                          <Icono className="h-4 w-4 text-accent-foreground" />
                        </span>
                        <span className="font-medium">{s.nombre}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">{s.prefijo_ticket}</TableCell>
                    <TableCell>
                      <Badge variant={s.activo ? "default" : "secondary"}>{s.activo ? "Activo" : "Inactivo"}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <ServicioDialog servicio={s} />
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
