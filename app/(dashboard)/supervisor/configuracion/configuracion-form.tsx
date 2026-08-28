"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { guardarConfiguracion } from "./actions";

export function ConfiguracionForm({
  valoresIniciales,
}: {
  valoresIniciales: {
    timeoutAusenteSegundos: number;
    limitePausaMinutos: number;
    ratioPreferencial: number;
    minutosEscalacionUrgente: number;
    mensajePantalla: string;
  };
}) {
  const router = useRouter();
  const [valores, setValores] = useState(valoresIniciales);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);

  async function guardar() {
    setEnviando(true);
    setError(null);
    setGuardado(false);
    const resultado = await guardarConfiguracion(valores);
    setEnviando(false);
    if (resultado.ok) {
      setGuardado(true);
      router.refresh();
    } else {
      setError(resultado.error);
    }
  }

  return (
    <div className="max-w-2xl rounded-xl border bg-card p-5 shadow-sm sm:p-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="timeout">Timeout para marcar AUSENTE (segundos)</Label>
          <Input
            id="timeout"
            type="number"
            min={10}
            max={600}
            value={valores.timeoutAusenteSegundos}
            onChange={(e) => setValores((v) => ({ ...v, timeoutAusenteSegundos: Number(e.target.value) }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pausa">Límite de pausa/descanso (minutos)</Label>
          <Input
            id="pausa"
            type="number"
            min={1}
            max={120}
            value={valores.limitePausaMinutos}
            onChange={(e) => setValores((v) => ({ ...v, limitePausaMinutos: Number(e.target.value) }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ratio">Ratio preferencial (normales por cada preferencial)</Label>
          <Input
            id="ratio"
            type="number"
            min={1}
            max={10}
            value={valores.ratioPreferencial}
            onChange={(e) => setValores((v) => ({ ...v, ratioPreferencial: Number(e.target.value) }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="urgente">Minutos de espera para escalar a URGENTE</Label>
          <Input
            id="urgente"
            type="number"
            min={1}
            max={120}
            value={valores.minutosEscalacionUrgente}
            onChange={(e) => setValores((v) => ({ ...v, minutosEscalacionUrgente: Number(e.target.value) }))}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="mensaje">Mensaje que se mueve en la pantalla pública</Label>
          <Textarea
            id="mensaje"
            rows={3}
            maxLength={300}
            value={valores.mensajePantalla}
            onChange={(e) => setValores((v) => ({ ...v, mensajePantalla: e.target.value }))}
          />
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3 border-t pt-5">
        <Button onClick={guardar} disabled={enviando}>
          {enviando ? "Guardando..." : "Guardar cambios"}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {guardado && !error && (
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-[#1baf7a]" /> Guardado.
          </p>
        )}
      </div>
    </div>
  );
}
