import { Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { sileo } from "sileo";
import { SaleIncomeModal, type SaleIncomeModalValues } from "@/shared/components/payments/SaleIncomeModal";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { getIncomeEvidence, getIncomeEvidenceContent } from "@/shared/services/incomeService";
import { usePermissions } from "@/shared/hooks/usePermissions";
import { toLocalDateKey } from "@/shared/utils/functionPurchases";
import { useSaleOrderPaymentOptions, filterSaleOrderBankAccountOptions, type SaleOrderPaymentSelectOption } from "../useSaleOrderPaymentOptions";
import type { SaleOrderEditorForm, SaleOrderEditorPayment } from "./saleOrderEditorForm";
import { calculateSaleOrderTotals, markAttachmentRemoved } from "./saleOrderEditorForm";
import { SaleOrderEditorSection } from "./SaleOrderEditorSection";
import { CustomerCreditApplyPanel } from "./CustomerCreditApplyPanel";
import { SaleOrderPaymentEvidenceHistory } from "./SaleOrderPaymentEvidenceHistory";

type Props = {
  form: SaleOrderEditorForm;
  setForm: React.Dispatch<React.SetStateAction<SaleOrderEditorForm>>;
  methodOptions?: SaleOrderPaymentSelectOption[];
  bankAccountOptions?: SaleOrderPaymentSelectOption[];
  saleOrderId?: string;
  persistedClientId?: string;
  currency?: string;
  remainingAmount?: number;
  hasUnsavedChanges?: boolean;
  onCreditApplied?: () => void | Promise<void>;
};

type PaymentModalState = { mode: "create" | "edit" | "view"; index: number | null; draft: SaleOrderEditorPayment };
const nextClientKey = () => typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `payment-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const money = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function SaleOrderPaymentCards({ form, setForm, methodOptions: providedMethodOptions, bankAccountOptions: providedBankAccountOptions, saleOrderId, persistedClientId, currency = "PEN", remainingAmount = 0, hasUnsavedChanges = false, onCreditApplied }: Props) {
  const shouldLoadPaymentOptions = providedMethodOptions === undefined || providedBankAccountOptions === undefined;
  const fallbackOptions = useSaleOrderPaymentOptions({ enabled: shouldLoadPaymentOptions });
  const methodOptions = providedMethodOptions ?? fallbackOptions.methodOptions;
  const bankAccountOptions = providedBankAccountOptions ?? fallbackOptions.bankAccountOptions;
  const { can, canAll, canAny } = usePermissions();
  const [modalState, setModalState] = useState<PaymentModalState | null>(null);
  const [evidenceUrl, setEvidenceUrl] = useState<string | null>(null);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const canViewEvidenceHistory = (can("*") || canAll(["income.read", "income.audit.view", "payments.view_evidence"]))
    && (can("*") || canAny(["income.view_all", "income.view_own"]));

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    setEvidenceUrl(null);
    setEvidenceLoading(false);
    if (modalState?.draft.photo) {
      objectUrl = URL.createObjectURL(modalState.draft.photo);
      setEvidenceUrl(objectUrl);
    } else if (can("payments.view_evidence") && modalState?.draft.id && modalState.draft.existingPhotoUrl) {
      const id = modalState.draft.id;
      setEvidenceLoading(true);
      void getIncomeEvidence(id)
        .then((summary) => summary.available || summary.url ? getIncomeEvidenceContent(id) : null)
        .then((url) => {
          if (active) { objectUrl = url; setEvidenceUrl(url); }
          else if (url && typeof URL.revokeObjectURL === "function") URL.revokeObjectURL(url);
        })
        .catch(() => { if (active) setEvidenceUrl(null); })
        .finally(() => { if (active) setEvidenceLoading(false); });
    }
    return () => { active = false; if (objectUrl && typeof URL.revokeObjectURL === "function") URL.revokeObjectURL(objectUrl); };
  }, [can, modalState?.draft.id, modalState?.draft.existingPhotoUrl, modalState?.draft.photo]);

  const openCreatePayment = () => {
    const total = calculateSaleOrderTotals(form.items, form.deliveryCost, form.discount, form.discountType).total;
    const paid = form.payments.reduce((sum, payment) => ["CANCELLED", "REVERSED"].includes(payment.status ?? "") ? sum : sum + Number(payment.amount || 0), 0);
    setModalState({ mode: "create", index: null, draft: { clientKey: nextClientKey(), method: "", paymentMethodId: null, companyPaymentAccountId: null, amount: Math.max(0, Number((total - paid).toFixed(2))), date: toLocalDateKey(new Date()), photo: null } });
  };

  const openEditPayment = (payment: SaleOrderEditorPayment, index: number) => {
    if (["CANCELLED", "REVERSED"].includes(payment.status ?? "")) return;
    setModalState({ mode: payment.id && payment.status !== "PENDING_CONFIRMATION" ? "view" : "edit", index, draft: { ...payment } });
  };

  const availableForDraft = useMemo(() => {
    if (!modalState) return 0;
    const total = calculateSaleOrderTotals(form.items, form.deliveryCost, form.discount, form.discountType).total;
    const paidByOtherPayments = form.payments.reduce((sum, payment, index) => modalState.mode === "edit" && index === modalState.index || ["CANCELLED", "REVERSED"].includes(payment.status ?? "") ? sum : sum + Number(payment.amount || 0), 0);
    return Math.max(0, Number((total - paidByOtherPayments).toFixed(2)));
  }, [form, modalState]);
  const amountError = modalState && Number(modalState.draft.amount || 0) > availableForDraft + 0.01 ? `El monto no puede superar el saldo disponible de ${money.format(availableForDraft)}.` : undefined;

  const saveDraft = (values: SaleIncomeModalValues, file: File | null) => {
    if (!modalState || modalState.mode === "view") return;
    if (!values.amount || !values.paymentMethodId || !values.date || !values.companyPaymentAccountId) {
      sileo.error({ title: "Completa monto, metodo, fecha y cuenta para guardar el pago." });
      return;
    }
    if (Number(values.amount) > availableForDraft + 0.01) {
      sileo.error({ title: `El monto no puede superar el saldo disponible de ${money.format(availableForDraft)}.` });
      return;
    }
    if (!UUID_PATTERN.test(values.paymentMethodId) || !UUID_PATTERN.test(values.companyPaymentAccountId)) {
      sileo.error({ title: "Selecciona un metodo y una cuenta validos del catalogo." });
      return;
    }
    const selectedMethod = methodOptions.find((option) => option.value === values.paymentMethodId);
    const nextDraft: SaleOrderEditorPayment = {
      ...modalState.draft,
      paymentMethodId: values.paymentMethodId,
      method: selectedMethod?.label ?? values.paymentMethodId,
      companyPaymentAccountId: values.companyPaymentAccountId,
      bankAccountId: values.companyPaymentAccountId,
      amount: Math.round((Number(values.amount) + Number.EPSILON) * 100) / 100,
      date: values.date,
      operationNumber: values.operationNumber || null,
      note: values.note || null,
      photo: file ?? modalState.draft.photo ?? null,
    };
    setForm((current) => ({ ...current, payments: modalState.mode === "edit" && modalState.index !== null
      ? current.payments.map((payment, index) => index === modalState.index ? nextDraft : payment)
      : [...current.payments, nextDraft] }));
    setModalState(null);
  };

  const removePayment = (payment: SaleOrderEditorPayment, index: number) => setForm((current) => {
    const next = markAttachmentRemoved(current, payment.existingAttachmentId);
    return { ...next, payments: next.payments.filter((_, itemIndex) => itemIndex !== index) };
  });

  return <SaleOrderEditorSection title="Pagos" actions={<SystemButton type="button" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={openCreatePayment}>Agregar Pago</SystemButton>}>
    <div className="scroll-area max-h-40 space-y-3 overflow-y-auto overflow-x-hidden">
      {form.payments.filter((payment) => !["CANCELLED", "REVERSED"].includes(payment.status ?? "")).map((payment) => ({ payment, index: form.payments.indexOf(payment) })).map(({ payment, index }) => <div key={payment.clientKey} className="flex items-center gap-2 rounded-lg bg-background/80 p-2 shadow-sm">
        <button type="button" className={`flex min-h-12 flex-1 items-center justify-between gap-3 rounded-md px-2 text-left transition-colors ${payment.id && payment.status !== "PENDING_CONFIRMATION" ? "cursor-default" : "hover:bg-muted/60"}`} aria-label={`${payment.date || "Sin fecha"} ${money.format(Number(payment.amount || 0))}`} onClick={() => openEditPayment(payment, index)}>
          <span className="flex min-w-0 items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">{index + 1}</span><span className="min-w-0"><span className="block text-xs font-semibold">{payment.date || "Sin fecha"}</span><span className="block text-[11px] text-muted-foreground">Pago {index + 1}</span></span></span>
          <span className="shrink-0 text-sm font-semibold tabular-nums">{money.format(Number(payment.amount || 0))}</span>
        </button>
        {payment.id ? <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${payment.status === "PENDING_CONFIRMATION" ? "border-amber-200 bg-amber-50 text-amber-700" : payment.status === "CANCELLED" || payment.status === "REVERSED" ? "border-red-200 bg-red-50 text-red-700" : payment.status === "POSTED" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-zinc-300 bg-zinc-50 text-zinc-700"}`}>{payment.status === "PENDING_CONFIRMATION" ? "Por confirmar" : payment.status === "CANCELLED" ? "Cancelado" : payment.status === "REVERSED" ? "Revertido" : payment.status === "POSTED" ? "Contabilizado" : "Estado desconocido"}</span> : <SystemButton type="button" size="sm" variant="ghost" className="text-rose-600 hover:bg-rose-500/10" leftIcon={<Trash2 className="h-4 w-4" />} onClick={() => removePayment(payment, index)}>Quitar</SystemButton>}
      </div>)}
      {!form.payments.length ? <p className="py-3 text-center text-xs text-muted-foreground">No hay pagos registrados.</p> : null}
    </div>
    {saleOrderId && persistedClientId ? <CustomerCreditApplyPanel
      clientId={persistedClientId}
      saleOrderId={saleOrderId}
      currency={currency}
      remainingAmount={remainingAmount}
      hasUnsavedChanges={hasUnsavedChanges}
      onApplied={onCreditApplied}
    /> : null}
    <SaleIncomeModal
      open={Boolean(modalState)}
      mode={modalState?.mode === "view"
        ? modalState.draft.status === "POSTED" ? "view-posted" : "view-unknown"
        : modalState?.mode === "edit" ? "edit-pending" : "create"}
      values={modalState ? { id: modalState.draft.id, version: modalState.draft.version, amount: modalState.draft.amount, date: modalState.draft.date ?? "", paymentMethodId: modalState.draft.paymentMethodId ?? "", companyPaymentAccountId: modalState.draft.companyPaymentAccountId ?? modalState.draft.bankAccountId ?? "", operationNumber: modalState.draft.operationNumber ?? "", note: modalState.draft.note ?? "", reason: "", status: modalState.draft.status } : null}
      evidenceUrl={evidenceUrl} evidenceLoading={evidenceLoading} canViewEvidence={can("payments.view_evidence")} canUploadEvidence={modalState?.mode !== "view" && can("payments.attach_evidence")}
      methodOptions={methodOptions} bankAccountOptions={bankAccountOptions} getCompatibleAccounts={filterSaleOrderBankAccountOptions}
      errorMessage={amountError} maxAmount={availableForDraft} onClose={() => setModalState(null)} onSubmit={saveDraft}
      extraContent={modalState?.draft.id && canViewEvidenceHistory ? <SaleOrderPaymentEvidenceHistory incomeId={modalState.draft.id} /> : null}
      submitLabel="Guardar pago" operationLabel="Operacion" fieldPrefix="payment" fieldSuffix={modalState?.draft.clientKey ?? ""} skipRequiredValidation
    />
  </SaleOrderEditorSection>;
}
