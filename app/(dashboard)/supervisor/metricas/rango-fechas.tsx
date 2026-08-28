"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

export function RangoFechas({ desde, hasta }: { desde: string; hasta: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [desdeValor, setDesdeValor] = useState(desde);
  const [hastaValor, setHastaValor] = useState(hasta);

  function aplicar() {
    const params = new URLSearchParams(searchParams.toString());
    params.set("desde", desdeValor);
    params.set("hasta", hastaValor);
    router.push(`/supervisor/metricas?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <Label htmlFor="desde">Desde</Label>
        <Input id="desde" type="date" value={desdeValor} onChange={(e) => setDesdeValor(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="hasta">Hasta</Label>
        <Input id="hasta" type="date" value={hastaValor} onChange={(e) => setHastaValor(e.target.value)} />
      </div>
      <Button variant="outline" onClick={aplicar}>
        Aplicar
      </Button>
    </div>
  );
}
