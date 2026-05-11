import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardHeader } from "@/shared/components/components/AppCard";
import { SystemButton } from "@/shared/components/components/SystemButton";
import type { UbigeoSelection } from "@/shared/types/ubigeo";
import { errorResponse, successResponse } from "@/shared/common/utils/response";
import { useFeedbackToast } from "@/shared/hooks/useFeedbackToast";
import { CompanyFormSection } from "@/features/company/components/CompanyFormSection";
import { CompanyLogoBlock } from "@/features/company/components/CompanyLogoBlock";
import { PaymentMethodListModal } from "@/features/company/components/PaymentMethodListModal";
import type { Company } from "@/features/company/types/company";
import type {
  CompanyFormErrors,
  CompanyFormValues,
} from "@/features/company/types/companyFormTypes";
import {
  getCompanyAssetLabel,
  resolveCompanyAssetUrl,
} from "@/features/company/utils/companyAssets";
import {
  emptyCompanyForm,
  mapCompanyToFormValues,
  normalizeCompanyFormValues,
  validateCompanyFormValues,
} from "@/features/company/utils/companyForm";
import {
  createCompany,
  updateCompany,
  uploadCompanyCert,
  uploadCompanyIsotype,
  uploadCompanyLogo,
} from "@/shared/services/companyService";
import { Headed } from "@/shared/components/components/Headed";
import { useCompany } from "@/shared/hooks/useCompany";

const COMPANY_PRIMARY = "hsl(var(--primary))";

export default function CompanyPage() {
  const { showFeedback, clearFeedback } = useFeedbackToast();
  const {
    refreshCompany,
    company: contextCompany,
    checked: companyChecked,
    loading: companyLoading,
  } = useCompany();

  const [savingLogo, setSavingLogo] = useState(false);
  const [savingIsotype, setSavingIsotype] = useState(false);
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
  const isotypeUrl = useMemo(
    () => resolveCompanyAssetUrl(company?.isotypePath),
    [company?.isotypePath],
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

  useEffect(() => {
    if (!companyChecked) return;

    if (!contextCompany) {
      setCompany(null);
      resetForm();
      return;
    }

    setCompany(contextCompany);
    setFormValues(mapCompanyToFormValues(contextCompany));
    setFormErrors({});
  }, [companyChecked, contextCompany, resetForm]);

  const loading = companyLoading || !companyChecked;

  const onPickLogo = async (file: File) => {
    clearFeedback();
    setSavingLogo(true);

    try {
      const nextCompany = await uploadCompanyLogo(file);
      setCompany(nextCompany);
      setFormValues(mapCompanyToFormValues(nextCompany));
      await refreshCompany();
      showFeedback(successResponse("Logo actualizado"));
    } catch {
      showFeedback(errorResponse("No se pudo actualizar el logo"));
    } finally {
      setSavingLogo(false);
    }
  };

  const onPickCert = async (file: File) => {
    clearFeedback();
    setSavingCert(true);

    try {
      const nextCompany = await uploadCompanyCert(file);
      setCompany(nextCompany);
      setFormValues(mapCompanyToFormValues(nextCompany));
      await refreshCompany();
      showFeedback(successResponse("Certificado actualizado"));
    } catch {
      showFeedback(errorResponse("No se pudo actualizar el certificado"));
    } finally {
      setSavingCert(false);
    }
  };

  const onPickIsotype = async (file: File) => {
    clearFeedback();
    setSavingIsotype(true);

    try {
      const nextCompany = await uploadCompanyIsotype(file);
      setCompany(nextCompany);
      setFormValues(mapCompanyToFormValues(nextCompany));
      await refreshCompany();
      showFeedback(successResponse("Isotipo actualizado"));
    } catch {
      showFeedback(errorResponse("No se pudo actualizar el isotipo"));
    } finally {
      setSavingIsotype(false);
    }
  };

  const onSubmitCompany = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearFeedback();
    setSavingCompany(true);

    try {
      const normalized = normalizeCompanyFormValues(formValues);
      const validation = validateCompanyFormValues(normalized);
      setFormErrors(validation.errors);

      if (!validation.ok) {
        showFeedback(errorResponse("Revisa los campos obligatorios"));
        return;
      }

      if (!hasCompany) {
        const nextCompany = await createCompany(validation.values);
        setCompany(nextCompany);
        setFormValues(mapCompanyToFormValues(nextCompany));
        await refreshCompany();
        showFeedback(successResponse("Empresa creada"));
      } else {
        const nextCompany = await updateCompany(validation.values);
        setCompany(nextCompany);
        setFormValues(mapCompanyToFormValues(nextCompany));
        await refreshCompany();
        showFeedback(successResponse("Empresa actualizada"));
      }
    } catch {
      showFeedback(errorResponse("No se pudo actualizar la empresa"));
    } finally {
      setSavingCompany(false);
    }
  };

  return (
    <div className="min-h-screen w-full">

      <div className="mx-auto">
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
                  isotypeUrl={isotypeUrl || undefined}
                  certUrl={certUrl || undefined}
                  certLabel={certLabel || undefined}
                  onPickLogo={onPickLogo}
                  onPickIsotype={onPickIsotype}
                  onPickCert={onPickCert}
                  disabled={savingLogo || !hasCompany}
                  isotypeDisabled={savingIsotype || !hasCompany}
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
          companyId={company.companyId}
        />
      )}
    </div>
  );
}

