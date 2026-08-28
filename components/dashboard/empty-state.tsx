import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icono: Icono,
  titulo,
  descripcion,
}: {
  icono: LucideIcon;
  titulo: string;
  descripcion?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-14 text-center">
      <Icono className="h-8 w-8 text-muted-foreground/50" />
      <p className="font-medium text-foreground">{titulo}</p>
      {descripcion && <p className="max-w-sm text-sm text-muted-foreground">{descripcion}</p>}
    </div>
  );
}
