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
import { ICONOS_SERVICIO } from "@/lib/iconos-servicio";
import { guardarServicio } from "./actions";

type Servicio = {
  id: string;
  nombre: string;
  prefijo_ticket: string;
  icono: string;
  activo: boolean;
};

export function ServicioDialog({ servicio }: { servicio?: Servicio }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState(servicio?.nombre ?? "");
  const [prefijo, setPrefijo] = useState(servicio?.prefijo_ticket ?? "");
  const [icono, setIcono] = useState(servicio?.icono ?? ICONOS_SERVICIO[0].valor);
  const [activo, setActivo] = useState(servicio?.activo ?? true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar() {
    setEnviando(true);
    setError(null);
    const resultado = await guardarServicio({
      id: servicio?.id,
      nombre,
      prefijoTicket: prefijo.toUpperCase(),
      icono,
      activo,
    });
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
          <Button variant={servicio ? "outline" : "default"} size={servicio ? "sm" : "default"}>
            {servicio ? "Editar" : "Nuevo servicio"}
          </Button>
        }
      />
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{servicio ? "Editar servicio" : "Nuevo servicio"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre</Label>
            <Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prefijo">Prefijo del ticket (1-3 letras, ej. C)</Label>
            <Input
              id="prefijo"
              value={prefijo}
              maxLength={3}
              onChange={(e) => setPrefijo(e.target.value.toUpperCase())}
            />
          </div>
          <div className="space-y-2">
            <Label>Ícono (se muestra en el kiosco)</Label>
            <div className="grid grid-cols-4 gap-2 rounded-md border p-3 sm:grid-cols-6">
              {ICONOS_SERVICIO.map(({ valor, etiqueta, Icono }) => (
                <button
                  key={valor}
                  type="button"
                  title={etiqueta}
                  onClick={() => setIcono(valor)}
                  className={`flex flex-col items-center justify-center rounded-md border p-2 transition ${
                    icono === valor ? "border-primary bg-accent" : "border-transparent hover:bg-accent"
                  }`}
                >
                  <Icono className="h-5 w-5" />
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="activo" checked={activo} onCheckedChange={setActivo} />
            <Label htmlFor="activo">Activo</Label>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button onClick={guardar} disabled={enviando || !nombre || !prefijo}>
            {enviando ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
