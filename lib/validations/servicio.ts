import { z } from "zod";
import { ICONOS_SERVICIO } from "@/lib/iconos-servicio";

const VALORES_ICONO = ICONOS_SERVICIO.map((i) => i.valor) as [string, ...string[]];

export const servicioSchema = z.object({
  id: z.string().uuid().optional(),
  nombre: z.string().min(2, "El nombre es muy corto").max(80),
  prefijoTicket: z
    .string()
    .regex(/^[A-Z]{1,3}$/, "Debe ser de 1 a 3 letras mayúsculas (ej. C)"),
  icono: z.enum(VALORES_ICONO),
  activo: z.boolean(),
});

export type ServicioInput = z.infer<typeof servicioSchema>;
