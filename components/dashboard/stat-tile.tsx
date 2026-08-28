import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatTile({
  etiqueta,
  valor,
  icono: Icono,
  tono,
  meter,
}: {
  etiqueta: string;
  valor: string;
  icono?: LucideIcon;
  tono?: "destructive";
  meter?: number;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{etiqueta}</p>
        {Icono && <Icono className="h-4 w-4 shrink-0 text-muted-foreground" />}
      </div>
      <p className={cn("mt-1 text-2xl font-semibold tabular-nums", tono === "destructive" && "text-destructive")}>
        {valor}
      </p>
      {meter !== undefined && (
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300"
            style={{ width: `${Math.round(meter * 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}
