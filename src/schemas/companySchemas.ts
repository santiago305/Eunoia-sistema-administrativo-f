import { z } from "zod";

export const createCompanySchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  ruc: z.string().min(1, "El RUC es obligatorio"),
  ubigeo: z.string().optional(),
  department: z.string().optional(),
  province: z.string().optional(),
  district: z.string().optional(),
  urbanization: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Correo invalido").optional(),
  codLocal: z.string().optional(),
  solUser: z.string().optional(),
  solPass: z.string().optional(),
  production: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const updateCompanySchema = createCompanySchema.partial();
