import { z } from "zod";

const optionalText = z.string().trim().optional().or(z.literal(""));

export const createCompanySchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  ruc: z
    .string()
    .trim()
    .min(1, "El RUC es obligatorio")
    .regex(/^\d{11}$/, "El RUC debe tener 11 dígitos"),

  ubigeo: optionalText,
  department: optionalText,
  province: optionalText,
  district: optionalText,
  urbanization: optionalText,
  address: optionalText,
  phone: optionalText,

  email: z.union([
    z.literal(""),
    z.string().trim().email("Correo inválido"),
  ]).optional(),

  codLocal: optionalText,
  solUser: optionalText,
  solPass: optionalText,
  production: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const updateCompanySchema = createCompanySchema.partial();