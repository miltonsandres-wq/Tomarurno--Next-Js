import { Megaphone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { obtenerPerfilActual } from "@/lib/auth/perfil-actual";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { AnuncioDialog } from "./anuncio-dialog";
import { EliminarButton } from "./eliminar-button";

const EXTENSIONES_VIDEO = [".mp4", ".webm", ".mov", ".ogg"];
const esVideo = (url: string) => EXTENSIONES_VIDEO.some((ext) => url.toLowerCase().includes(ext));

export default async function PublicidadPage() {
  const perfil = await obtenerPerfilActual();

  const sucursalId = perfil.sucursal_id;
  if (!sucursalId) {
    return <div className="p-6 text-muted-foreground">Tu usuario no tiene una sucursal asignada.</div>;
  }

  const supabase = await createClient();
  const { data: anuncios } = await supabase
    .from("anuncios")
    .select("id, titulo, imagen_url, activo, orden")
    .eq("sucursal_id", sucursalId)
    .order("orden");

  const lista = anuncios ?? [];

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Publicidad"
        description="Estas imágenes y videos rotan en el panel lateral de la pantalla pública."
        actions={<AnuncioDialog sucursalId={sucursalId} />}
      />

      {lista.length === 0 ? (
        <EmptyState
          icono={Megaphone}
          titulo="No hay anuncios cargados"
          descripcion='La pantalla pública mostrará un espacio "Publicite aquí" mientras tanto.'
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Imagen</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Orden</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    {esVideo(a.imagen_url) ? (
                      <video src={a.imagen_url} className="h-12 w-20 rounded-md border object-cover" muted />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.imagen_url} alt="" className="h-12 w-20 rounded-md border object-cover" />
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{a.titulo ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{a.orden}</TableCell>
                  <TableCell>
                    <Badge variant={a.activo ? "default" : "secondary"}>{a.activo ? "Activo" : "Inactivo"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <AnuncioDialog sucursalId={sucursalId} anuncio={a} />
                      <EliminarButton id={a.id} imagenUrl={a.imagen_url} />
                    </div>
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
