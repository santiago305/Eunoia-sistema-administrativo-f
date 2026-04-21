import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardHeader } from "@/components/AppCard";
import { PageTitle } from "@/components/PageTitle";
import { SystemButton } from "@/components/SystemButton";
import type { UbigeoSelection } from "@/components/UbigeoSelectSection";
import { errorResponse, successResponse } from "@/common/utils/response";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { CompanyFormSection } from "@/pages/company/components/CompanyFormSection";
import { CompanyLogoBlock } from "@/pages/company/components/CompanyLogoBlock";
import { PaymentMethodListModal } from "@/pages/company/components/PaymentMethodListModal";
import type { Company } from "@/pages/company/types/company";
import type {
  CompanyFormErrors,
  CompanyFormValues,
} from "@/pages/company/types/companyFormTypes";
import {
  getCompanyAssetLabel,
  resolveCompanyAssetUrl,
} from "@/pages/company/utils/companyAssets";
import {
  emptyCompanyForm,
  mapCompanyToFormValues,
  normalizeCompanyFormValues,
  validateCompanyFormValues,
} from "@/pages/company/utils/companyForm";
import {
  createCompany,
  getCompany,
  updateCompany,
  uploadCompanyCert,
  uploadCompanyLogo,
} from "@/services/companyService";
import { Headed } from "@/components/Headed";
import { useCompany } from "@/hooks/useCompany";

const COMPANY_PRIMARY = "hsl(var(--primary))";

export default function CompanyPage() {
  const { showFlash, clearFlash } = useFlashMessage();
  const { refreshCompany } = useCompany();

  const [loading, setLoading] = useState(true);
  const [savingLogo, setSavingLogo] = useState(false);
  const [savingCert, setSavingCert] = useState(false);
  const [savingCompany, setSavingCompany] = useState(false);
  const [company, setCompany] = useState<Company | null>(null);
  const [openPaymentMethods, setOpenPaymentMethods] = useState(false);
  const [formValues, setFormValues] = useState<CompanyFormValues>(emptyCompanyForm);
  const [formErrors, setFormErrors] = useState<CompanyFormErrors>({});

  const hasCompany = Boolean(company && (company.companyId || company.ruc || company.name));
  const logoUrl = useMemo(
    () => resolveCompanyAssetUrl(company?.logoPath),
    [company?.logoPath],
  );
  const certUrl = useMemo(
    () => resolveCompanyAssetUrl(company?.certPath),
    [company?.certPath],
  );
  const certLabel = useMemo(
    () => getCompanyAssetLabel(company?.certPath),
    [company?.certPath],
  );
  const displayName = useMemo(() => company?.name ?? "Empresa", [company?.name]);

  const ubigeoSelection = useMemo(
    () => ({
      ubigeo: formValues.ubigeo ?? "",
      department: formValues.department ?? "",
      province: formValues.province ?? "",
      district: formValues.district ?? "",
    }),
    [
      formValues.ubigeo,
      formValues.department,
      formValues.province,
      formValues.district,
    ],
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

  const updateField = useCallback(
    <K extends keyof CompanyFormValues>(
      field: K,
      value: CompanyFormValues[K],
    ) => {
      setFormValues((prev) => ({ ...prev, [field]: value }));
      setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    },
    [],
  );

  const resetForm = useCallback(() => {
    setFormValues(emptyCompanyForm);
    setFormErrors({});
  }, []);

  const fetchCompany = useCallback(async () => {
    setLoading(true);

    try {
      const response = await getCompany();
      setCompany(response);
      setFormValues(mapCompanyToFormValues(response));
      setFormErrors({});
    } catch (error) {
      const status = (error as { response?: { status?: number } }).response?.status;
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
      await refreshCompany();
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
      await refreshCompany();
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
      const normalized = normalizeCompanyFormValues(formValues);
      const validation = validateCompanyFormValues(normalized);
      setFormErrors(validation.errors);

      if (!validation.ok) {
        showFlash(errorResponse("Revisa los campos obligatorios"));
        return;
      }

      if (!hasCompany) {
        await createCompany(validation.values);
        await refreshCompany();
        showFlash(successResponse("Empresa creada"));
      } else {
        await updateCompany(validation.values);
        await refreshCompany();
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
    <div className="min-h-screen w-full">
      <PageTitle title="Empresa" />

      <div className="mx-auto w-full max-w-[1100px] px-4 py-6 sm:px-6 lg:max-w-[1280px] lg:px-8 2xl:max-w-[1600px] 2xl:px-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="flex flex-col gap-1"
        >
          <Headed
            title="Información de la empresa"
            subtitle="Datos generales y de contacto"
            size="lg"
          />
        </motion.div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="lg:col-span-4"
          >
            <Card>
              <CardHeader
                title="Logo"
                subtitle="Se mostrará en documentos y pantallas."
              />
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
                  companyPrimary={COMPANY_PRIMARY}
                  certLabelMaxChars={20}
                />
              </div>
            </Card>

            {hasCompany && (
              <div className="mt-2 rounded-lg shadow-sm">
                <SystemButton
                  fullWidth
                  variant="outline"
                  disabled={loading}
                  onClick={(event) => {
                    event.preventDefault();
                    setOpenPaymentMethods(true);
                  }}
                >
                  Ver métodos de pago
                </SystemButton>
              </div>
            )}
          </motion.section>

          <div className="space-y-6 lg:col-span-8">
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
            >
              <div className="rounded-lg border border-black/10 bg-white shadow-sm">
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

      {openPaymentMethods && company?.companyId && (
        <PaymentMethodListModal
          title="Métodos de pago"
          close={() => setOpenPaymentMethods(false)}
          className="max-w-[600px]"
          companyId={company.companyId}
        />
      )}
    </div>
  );
}
