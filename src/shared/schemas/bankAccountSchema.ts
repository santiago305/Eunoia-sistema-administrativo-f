import { z } from "zod";

const emptyToNull = (value: unknown) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

export const createBankAccountSchema = z.object({
  companyId: z.string().uuid("La compañía no es válida"),
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  number: z.preprocess(
    emptyToNull,
    z.string().trim().min(1, "El número no puede estar vacío").nullable().optional(),
  ),
  isActive: z.boolean().optional(),
});

export const updateBankAccountSchema = z
  .object({
    name: z.string().trim().min(1, "El nombre es obligatorio").optional(),
    number: z.preprocess(
      emptyToNull,
      z.string().trim().min(1, "El número no puede estar vacío").nullable().optional(),
    ),
  })
  .refine((data) => data.name !== undefined || data.number !== undefined, {
    message: "Debe enviar al menos un campo",
  });

export const updateBankAccountActiveSchema = z.object({
  isActive: z.boolean(),
});

export type CreateBankAccountSchema = z.infer<typeof createBankAccountSchema>;
export type UpdateBankAccountSchema = z.infer<typeof updateBankAccountSchema>;
export type UpdateBankAccountActiveSchema = z.infer<typeof updateBankAccountActiveSchema>;