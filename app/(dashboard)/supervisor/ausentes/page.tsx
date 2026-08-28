import { UserX } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { obtenerPerfilActual } from "@/lib/auth/perfil-actual";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ReactivarButton } from "./reactivar-button";

export default async function AusentesPage() {
  const perfil = await obtenerPerfilActual();
  const supabase = await createClient();

  const { data: turnos } = perfil.sucursal_id
    ? await supabase
        .from("turnos")
        .select("id, codigo_ticket, prioridad, created_at, servicios(nombre)")
        .eq("sucursal_id", perfil.sucursal_id)
        .eq("estado", "AUSENTE")
        .order("created_at", { ascending: false })
    : { data: [] };

  const lista = turnos ?? [];

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Turnos ausentes"
        description="Solo un supervisor puede reactivar un turno ausente y devolverlo a la cola."
      />

      {lista.length === 0 ? (
        <EmptyState icono={UserX} titulo="No hay turnos ausentes" descripcion="Los turnos que no respondan al llamado aparecerán aquí." />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket</TableHead>
                <TableHead>Servicio</TableHead>
                <TableHead>Prioridad</TableHead>
                <TableHead>Creado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono font-medium">{t.codigo_ticket}</TableCell>
                  <TableCell>{t.servicios?.nombre ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={t.prioridad === "URGENTE" ? "destructive" : "outline"} className="capitalize">
                      {t.prioridad.toLowerCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{new Date(t.created_at).toLocaleString("es-HN")}</TableCell>
                  <TableCell className="text-right">
                    <ReactivarButton turnoId={t.id} />
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
