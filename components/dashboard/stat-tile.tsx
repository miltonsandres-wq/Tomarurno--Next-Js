import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatTile({
  etiqueta,
  valor,
  icono: Icono,
  tono,
  meter,
  destacado,
}: {
  etiqueta: string;
  valor: string;
  icono?: LucideIcon;
  tono?: "destructive";
  meter?: number;
  /** La tarjeta principal del panel: texto más grande, ocupa más lugar. */
  destacado?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-4 shadow-sm",
        destacado && "border-primary/30 bg-primary/5",
        tono === "destructive" && "border-destructive/30 bg-destructive/5",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className={cn("text-sm text-muted-foreground", destacado && "font-medium text-foreground")}>{etiqueta}</p>
        {Icono && <Icono className={cn("h-4 w-4 shrink-0 text-muted-foreground", destacado && "h-5 w-5")} />}
      </div>
      <p
        className={cn(
          "mt-1 font-semibold tabular-nums",
          destacado ? "text-4xl" : "text-2xl",
          tono === "destructive" && "text-destructive",
        )}
      >
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
