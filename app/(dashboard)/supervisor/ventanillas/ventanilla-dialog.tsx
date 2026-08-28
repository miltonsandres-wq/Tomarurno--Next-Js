"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { guardarVentanilla } from "./actions";

type Opcion = { id: string; nombre: string };

type Ventanilla = {
  id: string;
  nombre: string;
  activa: boolean;
  servicioIds: string[];
  agenteIds: string[];
};

function alternar(lista: string[], id: string): string[] {
  return lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id];
}

export function VentanillaDialog({
  ventanilla,
  servicios,
  agentes,
}: {
  ventanilla?: Ventanilla;
  servicios: Opcion[];
  agentes: Opcion[];
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState(ventanilla?.nombre ?? "");
  const [activa, setActiva] = useState(ventanilla?.activa ?? true);
  const [servicioIds, setServicioIds] = useState<string[]>(ventanilla?.servicioIds ?? []);
  const [agenteIds, setAgenteIds] = useState<string[]>(ventanilla?.agenteIds ?? []);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar() {
    setEnviando(true);
    setError(null);
    const resultado = await guardarVentanilla({
      id: ventanilla?.id,
      nombre,
      activa,
      servicioIds,
      agenteIds,
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
          <Button variant={ventanilla ? "outline" : "default"} size={ventanilla ? "sm" : "default"}>
            {ventanilla ? "Editar" : "Nueva ventanilla"}
          </Button>
        }
      />
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{ventanilla ? "Editar ventanilla" : "Nueva ventanilla"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre</Label>
            <Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Switch id="activa" checked={activa} onCheckedChange={setActiva} />
            <Label htmlFor="activa">Activa</Label>
          </div>

          <div className="space-y-2">
            <Label>Servicios que atiende</Label>
            <div className="space-y-2 rounded-md border p-3">
              {servicios.length === 0 && (
                <p className="text-sm text-muted-foreground">No hay servicios creados todavía.</p>
              )}
              {servicios.map((s) => (
                <div key={s.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`serv-${s.id}`}
                    checked={servicioIds.includes(s.id)}
                    onCheckedChange={() => setServicioIds((prev) => alternar(prev, s.id))}
                  />
                  <Label htmlFor={`serv-${s.id}`} className="font-normal">
                    {s.nombre}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Agentes asignados</Label>
            <div className="space-y-2 rounded-md border p-3">
              {agentes.length === 0 && (
                <p className="text-sm text-muted-foreground">No hay agentes invitados todavía.</p>
              )}
              {agentes.map((a) => (
                <div key={a.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`agente-${a.id}`}
                    checked={agenteIds.includes(a.id)}
                    onCheckedChange={() => setAgenteIds((prev) => alternar(prev, a.id))}
                  />
                  <Label htmlFor={`agente-${a.id}`} className="font-normal">
                    {a.nombre}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button onClick={guardar} disabled={enviando || !nombre}>
            {enviando ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
