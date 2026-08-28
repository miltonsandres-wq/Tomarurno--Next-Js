"use server";

import { createClient } from "@/lib/supabase/server";
import { tomarTicketSchema, type TomarTicketInput } from "@/lib/validations/turno";

export type TomarTicketResult =
  | { ok: true; codigoTicket: string }
  | { ok: false; error: string };

export async function tomarTicket(input: TomarTicketInput): Promise<TomarTicketResult> {
  const parsed = tomarTicketSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("tomar_ticket", {
    p_servicio_id: parsed.data.servicioId,
    p_prioridad: parsed.data.prioridad,
  });

  if (error || !data?.codigo_ticket) {
    return { ok: false, error: "No se pudo generar el turno. Intente nuevamente." };
  }

  return { ok: true, codigoTicket: data.codigo_ticket };
}
