import { z } from "zod";

export const ventanillaSchema = z.object({
  id: z.string().uuid().optional(),
  nombre: z.string().min(1, "El nombre es requerido").max(40),
  activa: z.boolean(),
  servicioIds: z.array(z.string().uuid()),
  agenteIds: z.array(z.string().uuid()),
});

export type VentanillaInput = z.infer<typeof ventanillaSchema>;
