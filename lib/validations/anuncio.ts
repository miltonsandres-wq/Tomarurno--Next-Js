import { z } from "zod";

export const anuncioSchema = z.object({
  id: z.string().uuid().optional(),
  titulo: z.string().max(80).optional(),
  imagenUrl: z.string().url(),
  activo: z.boolean(),
  orden: z.coerce.number().int().min(0).max(999),
});

export type AnuncioInput = z.infer<typeof anuncioSchema>;
