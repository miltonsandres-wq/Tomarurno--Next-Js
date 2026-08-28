"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { cambiarActivoUsuario } from "./actions";

export function UsuarioActivoSwitch({ id, activo }: { id: string; activo: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Switch
      checked={activo}
      disabled={pending}
      onCheckedChange={(valor) => {
        startTransition(async () => {
          await cambiarActivoUsuario(id, valor);
          router.refresh();
        });
      }}
    />
  );
}
