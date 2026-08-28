"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { createClient } from "@/lib/supabase/client";
import { guardarAnuncio } from "./actions";

type Anuncio = {
  id: string;
  titulo: string | null;
  imagen_url: string;
  activo: boolean;
  orden: number;
};

const EXTENSIONES_VIDEO = [".mp4", ".webm", ".mov", ".ogg"];
const esVideo = (url: string) => EXTENSIONES_VIDEO.some((ext) => url.toLowerCase().includes(ext));

export function AnuncioDialog({
  sucursalId,
  anuncio,
}: {
  sucursalId: string;
  anuncio?: Anuncio;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [titulo, setTitulo] = useState(anuncio?.titulo ?? "");
  const [orden, setOrden] = useState(anuncio?.orden ?? 0);
  const [activo, setActivo] = useState(anuncio?.activo ?? true);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar() {
    setEnviando(true);
    setError(null);

    let imagenUrl = anuncio?.imagen_url;

    if (archivo) {
      const supabase = createClient();
      const extension = archivo.name.split(".").pop();
      const ruta = `${sucursalId}/${crypto.randomUUID()}.${extension}`;
      const { error: subidaError } = await supabase.storage.from("publicidad").upload(ruta, archivo);
      if (subidaError) {
        setEnviando(false);
        setError("No se pudo subir el archivo");
        return;
      }
      imagenUrl = supabase.storage.from("publicidad").getPublicUrl(ruta).data.publicUrl;
    }

    if (!imagenUrl) {
      setEnviando(false);
      setError("Seleccioná una imagen o video");
      return;
    }

    const resultado = await guardarAnuncio({ id: anuncio?.id, titulo, imagenUrl, activo, orden });
    setEnviando(false);
    if (resultado.ok) {
      setAbierto(false);
      router.refresh();
    } else {
      setError(resultado.error);
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger
        render={
          <Button variant={anuncio ? "outline" : "default"} size={anuncio ? "sm" : "default"}>
            {anuncio ? "Editar" : "Nuevo anuncio"}
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{anuncio ? "Editar anuncio" : "Nuevo anuncio"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título (opcional)</Label>
            <Input id="titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="imagen">Imagen o video</Label>
            {anuncio?.imagen_url && !archivo && (
              esVideo(anuncio.imagen_url) ? (
                <video src={anuncio.imagen_url} className="h-24 w-full rounded-md object-cover" muted />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={anuncio.imagen_url} alt="" className="h-24 w-full rounded-md object-cover" />
              )
            )}
            <Input
              id="imagen"
              type="file"
              accept="image/*,video/*"
              onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="orden">Orden</Label>
            <Input id="orden" type="number" min={0} value={orden} onChange={(e) => setOrden(Number(e.target.value))} />
          </div>
          <div className="flex items-center gap-2">
            <Switch id="activo" checked={activo} onCheckedChange={setActivo} />
            <Label htmlFor="activo">Activo</Label>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button onClick={guardar} disabled={enviando || (!anuncio && !archivo)}>
            {enviando ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
