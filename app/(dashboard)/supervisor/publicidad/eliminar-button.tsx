"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { eliminarAnuncio } from "./actions";

export function EliminarButton({ id, imagenUrl }: { id: string; imagenUrl: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await eliminarAnuncio(id, imagenUrl);
          router.refresh();
        })
      }
    >
      {pending ? "Eliminando..." : "Eliminar"}
    </Button>
  );
}
