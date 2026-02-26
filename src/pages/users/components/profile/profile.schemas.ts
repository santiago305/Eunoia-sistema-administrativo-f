import { z } from "zod";

export const profileSchema = z.object({
  name: z.string().min(2, "Nombre muy corto").max(80, "Nombre muy largo"),
  telefono: z.string().optional().or(z.literal("")),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;

export const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "La contrasena actual es obligatoria"),
    newPassword: z.string().min(8, "Minimo 8 caracteres"),
    confirmNewPassword: z.string().min(8, "Minimo 8 caracteres"),
  })
  .refine((v) => v.newPassword === v.confirmNewPassword, {
    message: "Las contrasenas no coinciden",
    path: ["confirmNewPassword"],
  });

export type PasswordFormValues = z.infer<typeof passwordSchema>;
