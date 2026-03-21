import { createCompanySchema } from "@/schemas/companySchemas";
import type { Company } from "@/pages/company/types/company";
import type {
  CompanyFormErrors,
  CompanyFormValues,
} from "@/pages/company/types/companyFormTypes";

/**
 * Estado inicial del formulario de empresa para creación o reinicio.
 */
export const emptyCompanyForm: CompanyFormValues = {
  name: "",
  ruc: "",
  department: "",
  province: "",
  district: "",
  ubigeo: "",
  urbanization: "",
  address: "",
  phone: "",
  email: "",
  codLocal: "",
  solUser: "",
  solPass: "",
  production: false,
  isActive: true,
};

/**
 * Convierte la entidad de empresa proveniente de la API a la estructura del
 * formulario editable.
 */
export function mapCompanyToFormValues(company: Company): CompanyFormValues {
  return {
    name: company.name ?? "",
    ruc: company.ruc ?? "",
    department: company.department ?? "",
    province: company.province ?? "",
    district: company.district ?? "",
    ubigeo: company.ubigeo ?? "",
    urbanization: company.urbanization ?? "",
    address: company.address ?? "",
    phone: company.phone ?? "",
    email: company.email ?? "",
    codLocal: company.codLocal ?? "",
    solUser: company.solUser ?? "",
    solPass: company.solPass ?? "",
    production: Boolean(company.production),
    isActive: Boolean(company.isActive),
  };
}

/**
 * Normaliza los valores del formulario eliminando espacios sobrantes y
 * convirtiendo el correo vacío a `undefined` para respetar el contrato del schema.
 */
export function normalizeCompanyFormValues(
  values: CompanyFormValues,
): CompanyFormValues {
  const normalized = {
    ...values,
    name: values.name?.trim() ?? "",
    ruc: values.ruc?.trim() ?? "",
    department: values.department?.trim() ?? "",
    province: values.province?.trim() ?? "",
    district: values.district?.trim() ?? "",
    ubigeo: values.ubigeo?.trim() ?? "",
    urbanization: values.urbanization?.trim() ?? "",
    address: values.address?.trim() ?? "",
    phone: values.phone?.trim() ?? "",
    email: values.email?.trim() ?? "",
    codLocal: values.codLocal?.trim() ?? "",
    solUser: values.solUser?.trim() ?? "",
    solPass: values.solPass?.trim() ?? "",
  };

  return {
    ...normalized,
    email: normalized.email || undefined,
  };
}

/**
 * Valida el formulario contra el schema y devuelve tanto los errores por campo
 * como los datos parseados cuando la validación es correcta.
 */
export function validateCompanyFormValues(values: CompanyFormValues) {
  const parsed = createCompanySchema.safeParse(values);

  if (parsed.success) {
    return {
      ok: true as const,
      errors: {} as CompanyFormErrors,
      values: parsed.data,
    };
  }

  const errors: CompanyFormErrors = {};
  parsed.error.issues.forEach((issue) => {
    const key = issue.path[0] as keyof CompanyFormValues | undefined;
    if (key && !errors[key]) {
      errors[key] = issue.message;
    }
  });

  return {
    ok: false as const,
    errors,
  };
}
