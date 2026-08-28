"use client";

import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function SelectorVentanilla({
  ventanillas,
  seleccionada,
}: {
  ventanillas: { id: string; nombre: string }[];
  seleccionada: string;
}) {
  const router = useRouter();

  return (
    <Select
      value={seleccionada}
      onValueChange={(v) => router.push(`/ventanilla?ventanilla=${v}`)}
    >
      <SelectTrigger className="w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ventanillas.map((v) => (
          <SelectItem key={v.id} value={v.id}>
            {v.nombre}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
