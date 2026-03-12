import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { PageTitle } from "@/components/PageTitle";
import { type UbigeoSelection } from "@/components/UbigeoSelectSection";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { errorResponse, successResponse } from "@/common/utils/response";
import { createCompany, getCompany, updateCompany, uploadCompanyCert, uploadCompanyLogo } from "@/services/companyService";
import { env } from "@/env";
import { createCompanySchema } from "@/schemas/companySchemas";
import type { Company } from "@/pages/company/types/company";
import { Card, CardHeader } from "@/pages/profile/components/ProfilePrimitives";
import { CompanyLogoBlock } from "./components/CompanyLogoBlock";
import { CompanyFormSection } from "./components/CompanyFormSection";
import type { CompanyFormErrors, CompanyFormValues } from "./types/companyFormTypes";

const COMPANY_PRIMARY = "#21b8a6";

function resolveCompanyLogoUrl(rawLogoUrl?: string | null) {
    const raw = rawLogoUrl?.trim();
    if (!raw) return "";
    if (/^https?:\/\//i.test(raw)) return raw;

    try {
        return new URL(raw, env.apiBaseUrl).toString();
    } catch {
        return raw;
    }
}

function resolveCompanyCertUrl(rawCertUrl?: string | null) {
    const raw = rawCertUrl?.trim();
    if (!raw) return "";
    if (/^https?:\/\//i.test(raw)) return raw;

    try {
        return new URL(raw, env.apiBaseUrl).toString();
    } catch {
        return raw;
    }
}

function getCertLabel(rawCertUrl?: string | null) {
    const raw = rawCertUrl?.trim();
    if (!raw) return "";
    const withoutQuery = raw.split("?")[0] ?? raw;
    const fileName = withoutQuery.split("/").pop() ?? "";
    return fileName || raw;
}

const emptyCompanyForm: CompanyFormValues = {
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

export default function CompanyPage() {
    const { showFlash, clearFlash } = useFlashMessage();

    const [loading, setLoading] = useState(true);
    const [savingLogo, setSavingLogo] = useState(false);
    const [savingCert, setSavingCert] = useState(false);
    const [savingCompany, setSavingCompany] = useState(false);
    const [company, setCompany] = useState<Company | null>(null);
    const hasCompany = Boolean(company && (company.id || company.ruc || company.name));

    const [formValues, setFormValues] = useState<CompanyFormValues>(emptyCompanyForm);
    const [formErrors, setFormErrors] = useState<CompanyFormErrors>({});

    const logoUrl = useMemo(() => resolveCompanyLogoUrl(company?.logoPath), [company?.logoPath]);
    const certUrl = useMemo(() => resolveCompanyCertUrl(company?.certPath), [company?.certPath]);
    const certLabel = useMemo(() => getCertLabel(company?.certPath), [company?.certPath]);

    const displayName = useMemo(() => company?.name ?? "Empresa", [company?.name]);

    const ubigeoSelection = useMemo(
        () => ({
            ubigeo: formValues.ubigeo ?? "",
            department: formValues.department ?? "",
            province: formValues.province ?? "",
            district: formValues.district ?? "",
        }),
        [formValues.ubigeo, formValues.department, formValues.province, formValues.district],
    );

    const handleUbigeoChange = useCallback((next: UbigeoSelection) => {
        setFormValues((prev) => ({
            ...prev,
            department: next.department,
            province: next.province,
            district: next.district,
            ubigeo: next.ubigeo,
        }));
        setFormErrors((prev) => ({
            ...prev,
            department: undefined,
            province: undefined,
            district: undefined,
            ubigeo: undefined,
        }));
    }, []);

    const updateField = useCallback(<K extends keyof CompanyFormValues>(field: K, value: CompanyFormValues[K]) => {
        setFormValues((prev) => ({ ...prev, [field]: value }));
        setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    }, []);

    const resetForm = useCallback(() => {
        setFormValues(emptyCompanyForm);
        setFormErrors({});
    }, []);
    const normalizeForm = useCallback((values: CompanyFormValues) => {
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
            email: normalized.email ? normalized.email : undefined,
        };
    }, []);

    const validateForm = useCallback((values: CompanyFormValues) => {
        const parsed = createCompanySchema.safeParse(values);
        if (parsed.success) {
            setFormErrors({});
            return { ok: true as const, values: parsed.data };
        }

        const nextErrors: CompanyFormErrors = {};
        parsed.error.issues.forEach((issue) => {
            const key = issue.path[0] as keyof CompanyFormValues | undefined;
            if (key && !nextErrors[key]) nextErrors[key] = issue.message;
        });
        setFormErrors(nextErrors);
        return { ok: false as const };
    }, []);

    const fetchCompany = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getCompany();
            const normalizedCompany = {
                ...res,
                id: res.id ?? (res as { companyId?: string }).companyId ?? "",
            };
            setCompany(normalizedCompany);
            setFormValues({
                name: normalizedCompany.name ?? "",
                ruc: normalizedCompany.ruc ?? "",
                department: normalizedCompany.department ?? "",
                province: normalizedCompany.province ?? "",
                district: normalizedCompany.district ?? "",
                ubigeo: normalizedCompany.ubigeo ?? "",
                urbanization: normalizedCompany.urbanization ?? "",
                address: normalizedCompany.address ?? "",
                phone: normalizedCompany.phone ?? "",
                email: normalizedCompany.email ?? "",
                codLocal: normalizedCompany.codLocal ?? "",
                solUser: normalizedCompany.solUser ?? "",
                solPass: normalizedCompany.solPass ?? "",
                production: Boolean(normalizedCompany.production),
                isActive: Boolean(normalizedCompany.isActive),
            });
            setFormErrors({});
        } catch (err) {
            const status = (err as { response?: { status?: number } }).response?.status;
            if (status === 404) {
                setCompany(null);
                resetForm();
                return;
            }
            showFlash(errorResponse("Error al cargar la empresa"));
        } finally {
            setLoading(false);
        }
    }, [resetForm, showFlash]);

    useEffect(() => {
        void fetchCompany();
    }, [fetchCompany]);

    const onPickLogo = async (file: File) => {
        clearFlash();
        setSavingLogo(true);
        try {
            await uploadCompanyLogo(file);
            showFlash(successResponse("Logo actualizado"));
            await fetchCompany();
        } catch {
            showFlash(errorResponse("No se pudo actualizar el logo"));
        } finally {
            setSavingLogo(false);
        }
    };

    const onPickCert = async (file: File) => {
        clearFlash();
        setSavingCert(true);
        try {
            await uploadCompanyCert(file);
            showFlash(successResponse("Certificado actualizado"));
            await fetchCompany();
        } catch {
            showFlash(errorResponse("No se pudo actualizar el certificado"));
        } finally {
            setSavingCert(false);
        }
    };

    const onSubmitCompany = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        clearFlash();
        setSavingCompany(true);
        try {
            const normalized = normalizeForm(formValues);
            const validation = validateForm(normalized);
            if (!validation.ok) {
                showFlash(errorResponse("Revisa los campos obligatorios"));
                return;
            }

            if (!hasCompany) {
                await createCompany(validation.values);
                showFlash(successResponse("Empresa creada"));
            } else {
                await updateCompany(validation.values);
                showFlash(successResponse("Empresa actualizada"));
            }
            await fetchCompany();
        } catch {
            showFlash(errorResponse("No se pudo actualizar la empresa"));
        } finally {
            setSavingCompany(false);
        }
    };
    return (
      <div className="min-h-screen w-full bg-white text-black">
        <PageTitle title="Empresa" />

        <div className="mx-auto w-full max-w-[1100px] px-4 py-6 sm:px-6 lg:max-w-[1280px] lg:px-8 2xl:max-w-[1600px] 2xl:px-10">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="flex flex-col gap-2">
            <h1 className="text-xl font-semibold">Información de la empresa</h1>
          </motion.div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
            {hasCompany && (
                <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="lg:col-span-4">
                  <Card>
                    <CardHeader title="Logo" subtitle="Se mostrara en documentos y pantallas." />
                    <div className="p-5 pt-0">
                        <CompanyLogoBlock
                            loading={loading}
                            name={displayName}
                            logoUrl={logoUrl}
                            certUrl={certUrl || undefined}
                            certLabel={certLabel || undefined}
                            onPickLogo={onPickLogo}
                            onPickCert={onPickCert}
                            disabled={savingLogo || !hasCompany}
                            certDisabled={savingCert || !hasCompany}
                            COMPANY_PRIMARY={COMPANY_PRIMARY}
                            certLabelMaxChars={20}
                        />
                    </div>
                  </Card>
                </motion.section>
            )}
            <div className="space-y-6 lg:col-span-8">
              <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
                <div className="rounded-2xl border border-black/10 bg-white shadow-sm">
                  <CardHeader title="" subtitle="" />
                  <CompanyFormSection
                      formValues={formValues}
                      formErrors={formErrors}
                      ubigeoSelection={ubigeoSelection}
                      loading={loading}
                      saving={savingCompany}
                      onSubmit={onSubmitCompany}
                      onFieldChange={updateField}
                      onUbigeoChange={handleUbigeoChange}
                  />
                </div>
              </motion.section>
            </div>
          </div>
        </div>
      </div>
    );
}
