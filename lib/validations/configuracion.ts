import { z } from "zod";

export const configuracionSchema = z.object({
  timeoutAusenteSegundos: z.coerce.number().int().min(10).max(600),
  limitePausaMinutos: z.coerce.number().int().min(1).max(120),
  ratioPreferencial: z.coerce.number().int().min(1).max(10),
  minutosEscalacionUrgente: z.coerce.number().int().min(1).max(120),
  mensajePantalla: z.string().max(300),
});

export type ConfiguracionInput = z.infer<typeof configuracionSchema>;
