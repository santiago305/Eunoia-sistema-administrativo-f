import { useEffect, useMemo, useState } from "react";
import { Banknote, CalendarClock, CircleHelp, FileText, ImageIcon, Paperclip, UploadCloud, X } from "lucide-react";
import { FloatingDatePicker } from "@/shared/components/components/date-picker/FloatingDatePicker";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { FloatingTextarea } from "@/shared/components/components/FloatingTextarea";
import { MoneyInput } from "@/shared/components/components/MoneyInput";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { Modal } from "@/shared/components/modales/Modal";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { createPayment } from "@/shared/services/paymentService";
import { getAllPaymentMethods } from "@/shared/services/paymentMethodService";
import { uploadPurchaseAttachment } from "@/shared/services/purchaseAttachmentService";
import { errorResponse, successResponse } from "@/shared/common/utils/response";
import { parseApiError } from "@/shared/common/utils/handleApiError";
import { useCompany } from "@/shared/hooks/useCompany";
import { useFeedbackToast } from "@/shared/hooks/useFeedbackToast";
import { usePermissions } from "@/shared/hooks/usePermissions";
import { getPaymentMethodOptions } from "@/features/payments/paymentView";
import { PaymentTypes, type CurrencyType } from "@/features/purchases/types/purchaseEnums";
import type { PaymentMethod } from "@/features/payment-methods/types/paymentMethod";
import { PurchaseAttachmentTypes } from "@/features/purchases/types/purchase-attachment.types";
import { normalizeMoney, parseDateInputValue, parseDecimalInput, toLocalDateKey } from "@/shared/utils/functionPurchases";
import { CompanyPaymentAccountSelect } from "./CompanyPaymentAccountSelect";
import { PurchasePayableSelect } from "./PurchasePayableSelect";
import type { CompanyPaymentAccount } from "../types/payment-account.types";
import type { AccountPayable } from "../types/payable.types";

type PaymentFormMode = "create" | "schedule";

export type PaymentFormInitialPayment = {
  poId?: string | null;
  quotaId?: string | null;
  accountPayableId?: string | null;
  currency?: CurrencyType;
  amount?: number | string | null;
  scheduledAt?: string | null;
};

type Props = {
  open: boolean;
  mode: PaymentFormMode;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
  initialPayment?: PaymentFormInitialPayment | null;
};

type FormErrors = Partial<Record<"poId" | "amount" | "scheduledAt" | "evidence", string>>;

const todayKey = () => toLocalDateKey(new Date());
const tomorrowKey = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return toLocalDateKey(date);
};
const isCashMethod = (method?: string | null) => (method ?? "").trim().toUpperCase() === PaymentTypes.EFECTIVO;
const isImageFile = (file?: File | null) => Boolean(file?.type.startsWith("image/"));
const fileMeta = (file: File) => {
  if (file.size < 1024) return `${file.type || "Archivo"} · ${file.size} B`;
  if (file.size < 1024 * 1024) return `${file.type || "Archivo"} · ${(file.size / 1024).toFixed(1)} KB`;
  return `${file.type || "Archivo"} · ${(file.size / (1024 * 1024)).toFixed(1)} MB`;
};

export function PaymentFormModal({
  open,
  mode,
  onClose,
  onSaved,
  initialPayment,
}: Props) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[] | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<CompanyPaymentAccount | null>(null);
  const [poId, setPoId] = useState("");
  const [quotaId, setQuotaId] = useState("");
  const [accountPayableId, setAccountPayableId] = useState("");
  const [method, setMethod] = useState("");
  const [currency, setCurrency] = useState<CurrencyType>("PEN");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayKey());
  const [scheduledAt, setScheduledAt] = useState("");
  const [operationNumber, setOperationNumber] = useState("");
  const [note, setNote] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidencePreviewUrl, setEvidencePreviewUrl] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const { can } = usePermissions();
  const { company } = useCompany();
  const { showFeedback } = useFeedbackToast();
  const canAttachEvidence = can("payments.attach_evidence");

  const methodOptions = useMemo(() => getPaymentMethodOptions(paymentMethods), [paymentMethods]);
  const selectedMethod = useMemo(
    () => paymentMethods?.find((item) => item.name === method) ?? null,
    [method, paymentMethods],
  );
  const selectedPaymentMethodId = useMemo(
    () => selectedMethod?.methodId ?? (selectedMethod as { id?: string } | null)?.id ?? null,
    [selectedMethod],
  );
  const showAccountSelect = !isCashMethod(method);
  const selectedMethodRequiresVoucher = showAccountSelect && (selectedMethod?.requiresVoucher ?? false);
  const showEvidenceUploader = showAccountSelect && (canAttachEvidence || selectedMethodRequiresVoucher);
  const title = mode === "schedule" ? "Programar pago" : "Registrar pago";
  const submitLabel = mode === "schedule" ? "Programar pago" : "Guardar pago";

  useEffect(() => {
    if (!open) return;

    setPoId(initialPayment?.poId ?? "");
    setQuotaId(initialPayment?.quotaId ?? "");
    setAccountPayableId(initialPayment?.accountPayableId ?? "");
    setCurrency(initialPayment?.currency ?? "PEN");
    setAmount(initialPayment?.amount === null || initialPayment?.amount === undefined ? "" : String(initialPayment.amount));
    setDate(todayKey());
    setScheduledAt(mode === "schedule" ? initialPayment?.scheduledAt ?? tomorrowKey() : initialPayment?.scheduledAt ?? "");
    setOperationNumber("");
    setNote("");
    setSelectedAccount(null);
    setEvidenceFile(null);
    setErrors({});
  }, [initialPayment, mode, open]);

  useEffect(() => {
    if (!open) return;

    let alive = true;
    getAllPaymentMethods()
      .then((records) => {
        if (!alive) return;
        setPaymentMethods(records);
        const active = records.find((item) => item.isActive);
        setMethod((current) => current || active?.name || PaymentTypes.EFECTIVO);
      })
      .catch(() => {
        if (!alive) return;
        setPaymentMethods(null);
        setMethod((current) => current || PaymentTypes.EFECTIVO);
      });

    return () => {
      alive = false;
    };
  }, [open]);

  useEffect(() => {
    if (!showAccountSelect) {
      setSelectedAccount(null);
    }
  }, [showAccountSelect]);

  useEffect(() => {
    if (!showEvidenceUploader) {
      setEvidenceFile(null);
    }
  }, [showEvidenceUploader]);

  useEffect(() => {
    if (!evidenceFile || !isImageFile(evidenceFile)) {
      setEvidencePreviewUrl(null);
      return;
    }

    const nextUrl = URL.createObjectURL(evidenceFile);
    setEvidencePreviewUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [evidenceFile]);

  const validate = () => {
    const nextErrors: FormErrors = {};
    const amountNumber = normalizeMoney(parseDecimalInput(amount));
    if (!poId.trim()) nextErrors.poId = "Ingresa la compra asociada.";
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) nextErrors.amount = "Ingresa un monto valido.";
    if (mode === "schedule") {
      if (!scheduledAt) {
        nextErrors.scheduledAt = "Selecciona una fecha programada.";
      } else if (scheduledAt <= todayKey()) {
        nextErrors.scheduledAt = "Selecciona una fecha futura.";
      }
    }
    if (selectedMethodRequiresVoucher && !evidenceFile) {
      nextErrors.evidence = "Adjunta la evidencia requerida por el metodo.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const applyPayable = (payable: AccountPayable | null) => {
    if (!payable) return;
    setPoId(payable.purchaseId);
    setQuotaId(payable.quotaId ?? "");
    setAccountPayableId(payable.accountPayableId);
    setCurrency(payable.currency);
    setAmount(String(payable.amountPending));
  };

  const handleSave = async () => {
    if (saving || !validate()) return;

    const amountNumber = normalizeMoney(parseDecimalInput(amount));
    setSaving(true);
    try {
      const response = await createPayment({
        method,
        date,
        operationNumber: operationNumber.trim() || undefined,
        currency,
        amount: amountNumber,
        note: note.trim() || undefined,
        poId: poId.trim(),
        quotaId: quotaId.trim() || undefined,
        accountPayableId: accountPayableId.trim() || undefined,
        paymentMethodId: selectedPaymentMethodId,
        companyPaymentAccountId: showAccountSelect ? selectedAccount?.id ?? null : null,
        bankName: showAccountSelect ? selectedAccount?.bankName ?? null : null,
        cardLastFour: showAccountSelect ? selectedAccount?.cardLastFour ?? selectedAccount?.accountLastFour ?? null : null,
        operationCode: operationNumber.trim() || undefined,
        scheduledAt: mode === "schedule" ? scheduledAt : undefined,
        isPartial: initialPayment?.amount ? amountNumber < normalizeMoney(Number(initialPayment.amount)) : undefined,
      });

      if (response.type !== "success") {
        showFeedback(errorResponse(response.message || "No se pudo guardar el pago."));
        return;
      }

      if (evidenceFile && response.paymentId) {
        await uploadPurchaseAttachment({
          purchaseId: poId.trim(),
          paymentId: response.paymentId,
          type: PurchaseAttachmentTypes.PAYMENT_PROOF,
          file: evidenceFile,
          note: "Evidencia cargada al registrar el pago.",
        });
      }

      showFeedback(successResponse(response.message || "Pago guardado correctamente."));
      await onSaved();
      onClose();
    } catch (error) {
      showFeedback(errorResponse(parseApiError(error, "No se pudo guardar el pago.")));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      className="w-full max-w-3xl"
      preventClose={saving}
      footer={
        <div className="flex justify-end gap-2">
          <SystemButton variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </SystemButton>
          <SystemButton
            leftIcon={mode === "schedule" ? <CalendarClock className="h-4 w-4" /> : <Banknote className="h-4 w-4" />}
            onClick={() => void handleSave()}
            loading={saving}
          >
            {submitLabel}
          </SystemButton>
        </div>
      }
    >
      <div className="mb-4 flex items-start justify-between gap-3 rounded-sm border border-border bg-muted/25 px-3 py-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {mode === "schedule" ? "Programacion de salida de dinero" : "Registro de salida de dinero"}
          </p>
          <p className="text-xs text-muted-foreground">
            {mode === "schedule"
              ? "Crea un pago futuro; no confirma desembolso hasta su aprobacion o ejecucion."
              : "Crea un pago asociado a una compra o cuenta por pagar y puede adjuntar comprobante."}
          </p>
        </div>
        <TooltipProvider delayDuration={120}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Ayuda del formulario de pagos"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-border bg-background text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <CircleHelp className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs rounded-sm px-3 py-2 text-xs">
              Compra y cuenta por pagar enlazan el pago con la obligacion. Monto define el desembolso parcial o total. Metodo y cuenta de empresa indican desde donde sale el dinero. Fecha de pago registra el movimiento; fecha programada agenda una salida futura. Comprobante se exige cuando el metodo requiere voucher.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {!initialPayment?.poId ? (
          <div className="sm:col-span-2">
            <PurchasePayableSelect
              value={accountPayableId}
              disabled={saving}
              onChange={applyPayable}
            />
          </div>
        ) : null}
        <FloatingInput
          label="Compra"
          name="payment-po-id"
          value={poId}
          error={errors.poId}
          onChange={(event) => setPoId(event.target.value)}
          disabled={Boolean(initialPayment?.poId)}
        />
        <MoneyInput
          label="Monto"
          name="payment-amount"
          currency={currency}
          value={amount}
          error={errors.amount}
          min={0}
          step="0.01"
          onChange={(event) => setAmount(event.target.value)}
        />
        <FloatingDatePicker
          label="Fecha de pago"
          name="payment-date"
          value={parseDateInputValue(date)}
          onChange={(nextDate) => setDate(nextDate ? toLocalDateKey(nextDate) : "")}
        />
        {mode === "schedule" ? (
          <FloatingDatePicker
            label="Fecha programada"
            name="payment-scheduled-at"
            value={parseDateInputValue(scheduledAt)}
            onChange={(nextDate) => setScheduledAt(nextDate ? toLocalDateKey(nextDate) : "")}
            error={errors.scheduledAt}
            disablePast
          />
        ) : (
          <FloatingSelect
            label="Moneda"
            name="payment-currency"
            value={currency}
            onChange={(value) => setCurrency(value as CurrencyType)}
            options={[
              { value: "PEN", label: "PEN (S/)" },
              { value: "USD", label: "USD ($)" },
            ]}
            searchable={false}
          />
        )}
        <FloatingSelect
          label="Metodo"
          name="payment-method"
          value={method}
          onChange={setMethod}
          options={methodOptions}
          searchable={false}
        />
        <FloatingInput
          label="Numero de operacion"
          name="payment-operation-number"
          value={operationNumber}
          onChange={(event) => setOperationNumber(event.target.value)}
        />
        {showAccountSelect ? (
          <div className="sm:col-span-2">
            <CompanyPaymentAccountSelect
              companyId={company?.companyId}
              value={selectedAccount?.id ?? ""}
              onChange={setSelectedAccount}
              disabled={saving}
            />
          </div>
        ) : null}
        <FloatingInput
          label="Cuenta por pagar"
          name="payment-account-payable-id"
          value={accountPayableId}
          onChange={(event) => setAccountPayableId(event.target.value)}
          disabled={Boolean(initialPayment?.accountPayableId)}
        />
        <FloatingInput
          label="Cuota"
          name="payment-quota-id"
          value={quotaId}
          onChange={(event) => setQuotaId(event.target.value)}
          disabled={Boolean(initialPayment?.quotaId)}
        />
        <div className="sm:col-span-2">
          <FloatingTextarea
            label="Nota"
            name="payment-note"
            value={note}
            rows={3}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>
        {showEvidenceUploader ? (
          <div className="sm:col-span-2 space-y-2">
            <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-4 text-center text-xs text-muted-foreground transition hover:border-primary/50 hover:bg-primary/5">
              <input
                aria-label="Subir comprobante"
                type="file"
                className="sr-only"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.doc,.docx,.xls,.xlsx,.txt"
                disabled={saving}
                onChange={(event) => setEvidenceFile(event.target.files?.[0] ?? null)}
              />
              <UploadCloud className="h-5 w-5" />
              <span className="font-semibold text-foreground">
                Comprobante de pago{selectedMethodRequiresVoucher ? " *" : ""}
              </span>
              <span>Arrastra el archivo o selecciona uno desde tu equipo.</span>
            </label>
            {errors.evidence ? <p className="text-xs text-red-600">{errors.evidence}</p> : null}
            {evidenceFile ? (
              <div className="flex gap-3 rounded-lg border border-border bg-background p-2">
                <div className="flex h-16 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
                  {evidencePreviewUrl ? (
                    <img src={evidencePreviewUrl} alt="Previsualizacion del comprobante" className="h-full w-full object-cover" />
                  ) : (
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1 py-1">
                  <div className="flex items-center gap-1 text-xs font-semibold text-foreground">
                    {evidencePreviewUrl ? <ImageIcon className="h-3.5 w-3.5" /> : <Paperclip className="h-3.5 w-3.5" />}
                    <span className="truncate">{evidenceFile.name}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">{fileMeta(evidenceFile)}</p>
                </div>
                <SystemButton type="button" variant="ghost" size="icon" onClick={() => setEvidenceFile(null)} disabled={saving}>
                  <X className="h-4 w-4" />
                </SystemButton>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
