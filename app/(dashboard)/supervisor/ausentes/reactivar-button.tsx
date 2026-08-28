"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { reactivarTurno } from "./actions";

export function ReactivarButton({ turnoId }: { turnoId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await reactivarTurno(turnoId);
          router.refresh();
        })
      }
    >
      {pending ? "Reactivando..." : "Reactivar"}
    </Button>
  );
}
