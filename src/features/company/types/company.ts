import { z } from "zod";
import { createCompanySchema, updateCompanySchema } from "@/shared/schemas/companySchemas";

export type CreateCompanyDto = z.infer<typeof createCompanySchema>;
export type UpdateCompanyDto = z.infer<typeof updateCompanySchema>;

export type Company = {
  companyId: string;
  name: string;
  ruc: string;
  ubigeo?: string | null;
  department?: string | null;
  province?: string | null;
  district?: string | null;
  urbanization?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  codLocal?: string | null;
  solUser?: string | null;
  solPass?: string | null;
  logoPath?: string | null;
  certPath?: string | null;
  production: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};
