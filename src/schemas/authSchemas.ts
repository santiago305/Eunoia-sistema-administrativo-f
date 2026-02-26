import { z } from "zod";

/**
 * Schema de validacion para el inicio de sesion.
 */
export const LoginSchema = z.object({
  email: z.string().min(1, "El email es obligatorio").email("Email invalido"),
  password: z
    .string()
    .min(1, "La contrasena es obligatoria")
    .min(8, "La contrasena debe tener al menos 8 caracteres"),
});
export const ChangePasswordSchema = z.object({
  password: z
  .string()
  .min(1, "La contrasena actual es obligatoria")
  .min(8, "La contrasena debe tener al menos 8 caracteres"),
  newPassword: z
  .string()
  .min(1, "La nueva contraseña es obligatoria")
  .min(8, "La contrasena debe tener al menos 8 caracteres"),
});
