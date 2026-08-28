import { z } from "zod";

export const tomarTicketSchema = z.object({
  servicioId: z.string().uuid(),
  prioridad: z.enum(["NORMAL", "PREFERENCIAL"]),
});

export type TomarTicketInput = z.infer<typeof tomarTicketSchema>;
