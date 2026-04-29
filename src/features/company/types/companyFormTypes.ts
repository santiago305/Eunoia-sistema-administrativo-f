import { z } from "zod";

import { createCompanySchema } from "@/shared/schemas/companySchemas";

export type CompanyFormValues = z.infer<typeof createCompanySchema>;
export type CompanyFormErrors = Partial<Record<keyof CompanyFormValues, string>>;
