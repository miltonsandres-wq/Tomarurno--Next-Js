import { z } from "zod";

export const invitarUsuarioSchema = z.object({
  nombre: z.string().min(2, "El nombre es muy corto").max(80),
  email: z.string().email("Correo inválido"),
  rol: z.enum(["agente", "supervisor"]),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  ventanillaIds: z.array(z.string()).default([]),
});

export type InvitarUsuarioInput = z.infer<typeof invitarUsuarioSchema>;
