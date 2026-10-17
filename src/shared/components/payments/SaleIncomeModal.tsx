import { useEffect, useMemo, useState, type ReactNode } from "react";
import { FloatingDatePicker } from "@/shared/components/components/date-picker/FloatingDatePicker";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { OperationImageGallery } from "@/shared/components/components/OperationImageGallery";
import { Modal } from "@/shared/components/modales/Modal";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { errorResponse } from "@/shared/common/utils/response";
import { useFeedbackToast } from "@/shared/hooks/useFeedbackToast";
import { parseDateInputValue, toLocalDateKey } from "@/shared/utils/functionPurchases";
import type { CompanyPaymentAccountType } from "@/features/payments/types/payment-account.types";

export type SaleIncomeModalMode =
  | "create"
  | "edit-pending"
  | "view-posted"
  | "correct-posted"
  | "view-cancelled"
  | "view-reversed"
  | "view-unknown"
  | "reenter";

export type SaleIncomeModalValues = {
  id?: string | null;
  version?: number;
  amount: number | string;
  date: string;
  paymentMethodId: string;
  companyPaymentAccountId: string;
  operationNumber: string;
  note: string;
  reason: string;
  status?: string | null;
  currency?: string | null;
  sourcePaymentId?: string | null;
  postedAt?: string | null;
  postedByUserId?: string | null;
  accountingDate?: string | null;
  voidedAt?: string | null;
  voidedByUserId?: string | null;
  voidReason?: string | null;
  financialReason?: string | null;
};

export type SaleIncomeSelectOption = { value: string; label: string; paymentMethodCode?: string; requiresOperationNumber?: boolean; accountType?: CompanyPaymentAccountType };

type Props = {
  open: boolean;
  mode: SaleIncomeModalMode;
  values: SaleIncomeModalValues | null;
  description?: string;
  evidenceUrl?: string | null;
  evidenceLoading?: boolean;
  canViewEvidence: boolean;
  canUploadEvidence: boolean;
  methodOptions: SaleIncomeSelectOption[];
  bankAccountOptions: SaleIncomeSelectOption[];
  getCompatibleAccounts: (accounts: SaleIncomeSelectOption[], paymentMethodCode?: string | null) => SaleIncomeSelectOption[];
  saving?: boolean;
  submitDisabled?: boolean;
  financialFieldsReadOnly?: boolean;
  submitLabel?: string;
  fieldPrefix?: string;
  operationLabel?: string;
  reasonLabel?: string;
  maxAmount?: number;
  fieldSuffix?: string;
  skipRequiredValidation?: boolean;
  compactEvidenceView?: boolean;
  extraContent?: ReactNode;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit?: (values: SaleIncomeModalValues, file: File | null) => void | Promise<void>;
};

const titles: Record<SaleIncomeModalMode, string> = {
  create: "Agregar pago",
  "edit-pending": "Modificar pago",
  "view-posted": "Detalle del ingreso",
  "correct-posted": "Corregir ingreso contabilizado",
  "view-cancelled": "Detalle del ingreso cancelado",
  "view-reversed": "Detalle del ingreso revertido",
  "view-unknown": "Detalle del ingreso (estado desconocido)",
  reenter: "Reingresar cobro",
};

const readOnlyModes = new Set<SaleIncomeModalMode>(["view-posted", "view-cancelled", "view-reversed", "view-unknown"]);
const requiresReasonModes = new Set<SaleIncomeModalMode>(["correct-posted", "reenter"]);
const dateLabel = (value?: string | null) => value ? new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value)) : "—";

export function SaleIncomeModal({
  open, mode, values, description, evidenceUrl = null, evidenceLoading = false, canViewEvidence,
  canUploadEvidence, methodOptions, bankAccountOptions, getCompatibleAccounts,
  saving = false, submitDisabled = false, financialFieldsReadOnly = false, submitLabel, fieldPrefix = "sale-income", fieldSuffix = "", skipRequiredValidation = false, operationLabel = "Número de operación", reasonLabel = "Motivo", maxAmount, compactEvidenceView = false, extraContent, errorMessage, onClose, onSubmit,
}: Props) {
  const { showFeedback } = useFeedbackToast();
  const [draft, setDraft] = useState<SaleIncomeModalValues | null>(values);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const readOnly = readOnlyModes.has(mode);
  const editable = !readOnly;

  useEffect(() => {
    if (!open) return;
    setDraft(values ? { ...values } : null);
    setFile(null);
    setFileError(null);
    // Reset only when the selected record/version changes; `values` is rebuilt inline by some parents.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- including the object would erase local edits on parent renders.
  }, [open, mode, values?.id, values?.version]);

  useEffect(() => {
    if (!file || typeof URL.createObjectURL !== "function") { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => { if (typeof URL.revokeObjectURL === "function") URL.revokeObjectURL(url); };
  }, [file]);

  const method = methodOptions.find((option) => option.value === draft?.paymentMethodId);
  const account = bankAccountOptions.find((option) => option.value === draft?.companyPaymentAccountId);
  const compatibleAccounts = useMemo(() => getCompatibleAccounts(bankAccountOptions, method?.paymentMethodCode), [bankAccountOptions, getCompatibleAccounts, method?.paymentMethodCode]);
  const images = previewUrl ? [previewUrl] : evidenceUrl ? [evidenceUrl] : [];
  const showFields = !(compactEvidenceView && readOnly && images.length > 0);
  const fieldsAreReadOnly = readOnly || financialFieldsReadOnly;
  const amountError = maxAmount !== undefined && Number(draft?.amount) > maxAmount + 0.01
    ? `El monto no puede superar el saldo disponible de ${new Intl.NumberFormat("es-PE", { style: "currency", currency: draft?.currency || "PEN", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(maxAmount)}.`
    : undefined;
  const field = (name: string) => `${fieldPrefix}-${name}${fieldSuffix ? `-${fieldSuffix}` : ""}`;
  const set = (patch: Partial<SaleIncomeModalValues>) => setDraft((current) => current ? { ...current, ...patch } : current);
  const normalizeAmountOnBlur = () => {
    setDraft((current) => {
      if (!current) return current;
      const rawAmount = String(current.amount ?? "").trim();
      if (!rawAmount) return { ...current, amount: "" };
      const amount = Number(rawAmount);
      return Number.isFinite(amount) ? { ...current, amount: amount.toFixed(2) } : current;
    });
  };

  const handleFile = (candidate?: File | null) => {
    setFileError(null);
    if (!candidate) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(candidate.type)) {
      setFileError("Solo se permiten imágenes JPG, PNG o WEBP.");
      return;
    }
    if (candidate.size > 15 * 1024 * 1024) {
      setFileError("La imagen supera el límite de 15 MB.");
      return;
    }
    setFile(candidate);
  };

  const submit = async () => {
    if (!draft || !onSubmit || saving) return;
    const amount = Number(draft.amount);
    if (!skipRequiredValidation && (!Number.isFinite(amount) || amount <= 0 || !draft.date || !draft.paymentMethodId || !draft.companyPaymentAccountId)) {
      showFeedback(errorResponse("Completa monto, fecha, método y cuenta receptora."));
      return;
    }
    if (method?.requiresOperationNumber && !draft.operationNumber.trim()) {
      showFeedback(errorResponse("Ingresa el número de operación."));
      return;
    }
    if (requiresReasonModes.has(mode) && draft.reason.trim().length < 5) {
      showFeedback(errorResponse("Ingresa un motivo de al menos 5 caracteres."));
      return;
    }
    await onSubmit({ ...draft, amount: Math.round((amount + Number.EPSILON) * 100) / 100, reason: draft.reason.trim() }, file);
  };

  const statusLabel = mode === "view-unknown" ? "Estado desconocido"
    : draft?.status === "PENDING_CONFIRMATION" ? "Por confirmar"
    : draft?.status === "POSTED" ? "Contabilizado"
      : draft?.status === "CANCELLED" ? "Cancelado"
      : draft?.status === "REVERSED" ? "Revertido" : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={titles[mode]}
      description={description ?? (draft?.currency ? `Moneda ${draft.currency}` : undefined)}
      className="w-full max-w-3xl"
      preventClose={saving}
      footer={<div className="flex justify-end gap-2"><SystemButton variant="ghost" onClick={onClose} disabled={saving}>Cerrar</SystemButton>{editable && onSubmit ? <SystemButton onClick={() => void submit()} loading={saving} disabled={saving || submitDisabled}>{submitLabel ?? (mode === "correct-posted" ? "Corregir ingreso" : mode === "reenter" ? "Crear ingreso por confirmar" : mode === "create" ? "Guardar pago" : "Guardar cambios")}</SystemButton> : null}</div>}
    >
      {draft ? <div className={`grid gap-4 ${showFields ? "md:grid-cols-[minmax(0,1fr)_240px]" : ""}`}>
        {showFields ? <div className="grid content-start gap-4 sm:grid-cols-2">
          <FloatingInput label="Monto" name={field("amount")} type="number" inputMode="decimal" min="0.01" step="0.01" value={typeof draft.amount === "number" ? draft.amount.toFixed(2) : draft.amount} requiredIndicator={!fieldsAreReadOnly} error={amountError} readOnly={fieldsAreReadOnly} disabled={saving} onChange={(event) => set({ amount: event.target.value })} onBlur={normalizeAmountOnBlur} />
          {fieldsAreReadOnly
            ? <FloatingInput label="Fecha de pago" name={field("date")} value={dateLabel(draft.date)} readOnly disabled={saving} />
            : <FloatingDatePicker label="Fecha de pago" name={field("date")} value={parseDateInputValue(draft.date)} requiredIndicator disabled={saving} onChange={(value) => set({ date: value ? toLocalDateKey(value) : "" })} />}
          {fieldsAreReadOnly
            ? <FloatingInput label="Método de cobro" name={field("method")} value={method?.label ?? "—"} readOnly disabled={saving} />
            : <FloatingSelect label="Método de cobro" name="sale-income-method" value={draft.paymentMethodId} options={methodOptions} requiredIndicator searchable disabled={saving} onChange={(paymentMethodId) => {
            const selected = methodOptions.find((option) => option.value === paymentMethodId);
            const compatible = getCompatibleAccounts(bankAccountOptions, selected?.paymentMethodCode);
            set({ paymentMethodId, ...(!compatible.some((option) => option.value === draft.companyPaymentAccountId) ? { companyPaymentAccountId: "" } : {}) });
          }} />}
          {fieldsAreReadOnly
            ? <FloatingInput label="Cuenta receptora" name={field("account")} value={account?.label ?? "—"} readOnly disabled={saving} />
            : <FloatingSelect label="Cuenta receptora" name="sale-income-account" value={draft.companyPaymentAccountId} options={compatibleAccounts} requiredIndicator searchable disabled={saving} onChange={(companyPaymentAccountId) => set({ companyPaymentAccountId })} />}
          <FloatingInput label={operationLabel} name={field("operation")} value={draft.operationNumber ?? ""} requiredIndicator={!fieldsAreReadOnly && Boolean(method?.requiresOperationNumber)} readOnly={fieldsAreReadOnly} disabled={saving} onChange={(event) => set({ operationNumber: event.target.value })} />
          <FloatingInput label="Descripción" name="sale-income-note" value={draft.note ?? ""} readOnly={fieldsAreReadOnly} disabled={saving} onChange={(event) => set({ note: event.target.value })} />
          {requiresReasonModes.has(mode) ? <label className="grid gap-1 text-sm sm:col-span-2"><span className="font-medium">{reasonLabel} <span aria-hidden="true">*</span></span><textarea aria-label={reasonLabel} className="min-h-20 rounded-md border border-border bg-background p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-60" maxLength={500} value={draft.reason} disabled={saving || financialFieldsReadOnly} onChange={(event) => set({ reason: event.target.value })} /><span className="text-xs text-muted-foreground">El motivo quedará en el historial financiero.</span></label> : null}
          {readOnly ? <dl className="grid gap-x-4 gap-y-2 rounded-md border border-border bg-muted/20 p-3 text-sm sm:col-span-2 sm:grid-cols-2">
            {statusLabel ? <div><dt className="text-xs text-muted-foreground">Estado</dt><dd className="font-medium">{statusLabel}</dd></div> : null}
            <div><dt className="text-xs text-muted-foreground">Fecha contable</dt><dd className="font-medium">{dateLabel(draft.accountingDate)}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Contabilizado</dt><dd className="font-medium">{dateLabel(draft.postedAt)}</dd></div>
            {draft.financialReason || draft.voidReason ? <div className="sm:col-span-2"><dt className="text-xs text-muted-foreground">Motivo</dt><dd className="break-words font-medium">{draft.financialReason || draft.voidReason}</dd></div> : null}
          </dl> : null}
          {errorMessage ? <p className="text-sm text-destructive sm:col-span-2" role="alert">{errorMessage}</p> : null}
        </div> : null}
        <div className="space-y-2">
          {evidenceLoading ? <div className="flex h-36 items-center justify-center rounded-md border border-border bg-muted/30 text-sm text-muted-foreground" role="status">Cargando evidencia…</div> : <OperationImageGallery images={images} altPrefix="Evidencia del pago" emptyMessage={canViewEvidence ? "Este pago no tiene evidencia." : "No tienes permiso para consultar la evidencia."} canUpload={editable && canUploadEvidence} onUpload={handleFile} />}
          {file ? <div className="flex items-center justify-between gap-2"><p className="truncate text-xs text-foreground" title={file.name}>Nueva evidencia: {file.name}</p><button type="button" className="min-h-11 rounded-md px-2 text-xs font-medium text-muted-foreground underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40" onClick={() => setFile(null)} disabled={saving}>Cancelar cambio</button></div> : null}
          {fileError ? <p className="text-xs text-destructive" role="alert">{fileError}</p> : null}
          {readOnly && !canViewEvidence ? <p className="text-xs text-muted-foreground">La consulta de imagen requiere permiso.</p> : null}
          {readOnly && draft.postedByUserId ? <p className="text-xs text-muted-foreground">Usuario contabilizador: {draft.postedByUserId}</p> : null}
          {readOnly && draft.voidedByUserId ? <p className="text-xs text-muted-foreground">Usuario de cierre: {draft.voidedByUserId}</p> : null}
        </div>
      </div> : null}
      {draft ? extraContent : null}
    </Modal>
  );
}
