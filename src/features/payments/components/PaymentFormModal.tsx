import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Banknote, CalendarClock, CircleHelp, FileText, ImageIcon, Paperclip, UploadCloud, X } from "lucide-react";
import { FloatingDatePicker } from "@/shared/components/components/date-picker/FloatingDatePicker";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { FloatingTextarea } from "@/shared/components/components/FloatingTextarea";
import { MoneyInput } from "@/shared/components/components/MoneyInput";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { Modal } from "@/shared/components/modales/Modal";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { createPaymentDraft, submitPaymentDraft } from "@/shared/services/paymentService";
import { getPaymentMethodsByCompany } from "@/shared/services/paymentMethodService";
import { uploadPurchaseAttachment } from "@/shared/services/purchaseAttachmentService";
import {
  listSupplierPaymentDestinations,
  type SupplierPaymentDestination,
} from "@/shared/services/supplierService";
import { errorResponse, successResponse } from "@/shared/common/utils/response";
import { parseApiError } from "@/shared/common/utils/handleApiError";
import { useCompany } from "@/shared/hooks/useCompany";
import { useFeedbackToast } from "@/shared/hooks/useFeedbackToast";
import { usePermissions } from "@/shared/hooks/usePermissions";
import { getPaymentMethodOptions } from "@/features/payments/paymentView";
import type { CurrencyType } from "@/features/purchases/types/purchaseEnums";
import type { PaymentMethod } from "@/features/payment-methods/types/paymentMethod";
import { PurchaseAttachmentTypes } from "@/features/purchases/types/purchase-attachment.types";
import { normalizeMoney, parseDateInputValue, parseDecimalInput, toLocalDateKey } from "@/shared/utils/functionPurchases";
import { CompanyPaymentAccountSelect } from "./CompanyPaymentAccountSelect";
import { PurchasePayableSelect } from "./PurchasePayableSelect";
import { PaymentReview } from "./PaymentReview";
import type { CompanyPaymentAccount } from "../types/payment-account.types";
import type { AccountPayable } from "../types/payable.types";

type PaymentFormMode = "create" | "schedule";

export type PaymentFormInitialPayment = {
  poId?: string | null;
  quotaId?: string | null;
  accountPayableId?: string | null;
  supplierId?: string | null;
  supplierPaymentDestinationId?: string | null;
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

type FormErrors = Partial<Record<"poId" | "amount" | "scheduledAt" | "evidence" | "method" | "account" | "destination" | "operationNumber", string>>;

const todayKey = () => toLocalDateKey(new Date());
const tomorrowKey = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return toLocalDateKey(date);
};
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
  const [paymentMethodsError, setPaymentMethodsError] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<CompanyPaymentAccount | null>(null);
  const [poId, setPoId] = useState("");
  const [quotaId, setQuotaId] = useState("");
  const [accountPayableId, setAccountPayableId] = useState("");
  const [selectedPayable, setSelectedPayable] = useState<AccountPayable | null>(null);
  const [supplierDestinations, setSupplierDestinations] = useState<SupplierPaymentDestination[]>([]);
  const [supplierPaymentDestinationId, setSupplierPaymentDestinationId] = useState("");
  const [loadingDestinations, setLoadingDestinations] = useState(false);
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
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const { can } = usePermissions();
  const { company } = useCompany();
  const { showFeedback } = useFeedbackToast();
  const canAttachEvidence = can("payments.attach_evidence");

  const methodOptions = useMemo(
    () => getPaymentMethodOptions(paymentMethods, { fallbackToDefaults: false }),
    [paymentMethods],
  );
  const selectedMethod = useMemo(
    () => paymentMethods?.find((item) => item.name === method) ?? null,
    [method, paymentMethods],
  );
  const selectedPaymentMethodId = useMemo(
    () => selectedMethod?.methodId ?? (selectedMethod as { id?: string } | null)?.id ?? null,
    [selectedMethod],
  );
  const showAccountSelect = selectedMethod?.requiresSourceAccount ?? true;
  const selectedMethodRequiresVoucher = selectedMethod?.requiresVoucher ?? false;
  const showEvidenceUploader = canAttachEvidence || selectedMethodRequiresVoucher;
  const title = mode === "schedule" ? "Programar pago" : "Registrar pago";
  const submitLabel = mode === "schedule" ? "Programar pago" : "Guardar pago";

  useEffect(() => {
    if (!open) return;

    setPoId(initialPayment?.poId ?? "");
    setQuotaId(initialPayment?.quotaId ?? "");
    setAccountPayableId(initialPayment?.accountPayableId ?? "");
    setSelectedPayable(null);
    setSupplierPaymentDestinationId(initialPayment?.supplierPaymentDestinationId ?? "");
    setCurrency(initialPayment?.currency ?? "PEN");
    setAmount(initialPayment?.amount === null || initialPayment?.amount === undefined ? "" : String(initialPayment.amount));
    setDate(todayKey());
    setScheduledAt(mode === "schedule" ? initialPayment?.scheduledAt ?? tomorrowKey() : initialPayment?.scheduledAt ?? "");
    setOperationNumber("");
    setNote("");
    setMethod("");
    setSelectedAccount(null);
    setEvidenceFile(null);
    setErrors({});
  }, [initialPayment, mode, open]);

  const supplierId = selectedPayable?.supplierId ?? initialPayment?.supplierId ?? null;

  useEffect(() => {
    if (!open || !selectedMethod?.requiresDestination || !supplierId || !selectedPaymentMethodId) {
      setSupplierDestinations([]);
      if (!selectedMethod?.requiresDestination) setSupplierPaymentDestinationId("");
      return;
    }

    let alive = true;
    setLoadingDestinations(true);
    listSupplierPaymentDestinations(supplierId)
      .then((records) => {
        if (!alive) return;
        const compatible = records.filter((item) =>
          item.isActive
          && !item.requiresManualReview
          && item.currency === currency
          && item.methodId === selectedPaymentMethodId,
        );
        setSupplierDestinations(compatible);
        setSupplierPaymentDestinationId((current) => {
          if (compatible.some((item) => item.supplierPaymentDestinationId === current)) return current;
          return compatible.find((item) => item.isDefault)?.supplierPaymentDestinationId
            ?? (compatible.length === 1 ? compatible[0].supplierPaymentDestinationId : "");
        });
      })
      .catch(() => {
        if (alive) setSupplierDestinations([]);
      })
      .finally(() => {
        if (alive) setLoadingDestinations(false);
      });

    return () => {
      alive = false;
    };
  }, [currency, open, selectedMethod?.requiresDestination, selectedPaymentMethodId, supplierId]);

  useEffect(() => {
    if (!open || !company?.companyId) return;

    let alive = true;
    setPaymentMethods(null);
    setPaymentMethodsError(null);
    getPaymentMethodsByCompany(company.companyId)
      .then((records) => {
        if (!alive) return;
        const available = records.filter((item) => item.isActive && item.enabled !== false);
        setPaymentMethods(available);
        setMethod((current) =>
          available.some((item) => item.name === current)
            ? current
            : available[0]?.name ?? "",
        );
      })
      .catch(() => {
        if (!alive) return;
        setPaymentMethods([]);
        setMethod("");
        setPaymentMethodsError("No se pudieron cargar los métodos habilitados de la empresa.");
      });

    return () => {
      alive = false;
    };
  }, [company?.companyId, open]);

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
    if (!poId.trim()) nextErrors.poId = "Selecciona una cuenta por pagar.";
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) nextErrors.amount = "Ingresa un monto valido.";
    if (!selectedMethod) {
      nextErrors.method = paymentMethods?.length === 0
        ? "La empresa no tiene métodos de pago habilitados."
        : "Selecciona un método de pago.";
    }
    if (selectedPayable && amountNumber > Number(selectedPayable.amountPending) + 0.01) {
      nextErrors.amount = "El monto supera el saldo pendiente.";
    }
    if (showAccountSelect && !selectedAccount) nextErrors.account = "Selecciona la cuenta de origen.";
    if (selectedMethod?.requiresDestination && !supplierPaymentDestinationId) {
      nextErrors.destination = supplierId
        ? "Selecciona un destino confirmado del proveedor."
        : "La cuenta por pagar no tiene un proveedor asociado.";
    }
    if (selectedMethod?.requiresOperationReference && !operationNumber.trim()) {
      nextErrors.operationNumber = "Ingresa la referencia exigida por el metodo.";
    }
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
    if (Object.keys(nextErrors).length > 0) {
      requestAnimationFrame(() => errorSummaryRef.current?.focus());
    }
    return Object.keys(nextErrors).length === 0;
  };

  const applyPayable = (payable: AccountPayable | null) => {
    if (!payable) {
      setSelectedPayable(null);
      return;
    }
    setSelectedPayable(payable);
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
      const payload = {
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
        supplierPaymentDestinationId: selectedMethod?.requiresDestination ? supplierPaymentDestinationId : undefined,
        companyPaymentAccountId: showAccountSelect ? selectedAccount?.id ?? null : null,
        bankName: showAccountSelect ? selectedAccount?.bankName ?? null : null,
        cardLastFour: showAccountSelect ? selectedAccount?.cardLastFour ?? selectedAccount?.accountLastFour ?? null : null,
        operationCode: operationNumber.trim() || undefined,
        scheduledAt: mode === "schedule" ? scheduledAt : undefined,
        isPartial: initialPayment?.amount ? amountNumber < normalizeMoney(Number(initialPayment.amount)) : undefined,
      };
      const response = await createPaymentDraft({ ...payload, scheduledAt: mode === "schedule" ? scheduledAt : undefined });

      if (response.type !== "success") {
        showFeedback(errorResponse(response.message || "No se pudo guardar el pago."));
        return;
      }

      if (response.paymentId) {
        if (evidenceFile) {
          await uploadPurchaseAttachment({
            purchaseId: poId.trim(),
            paymentId: response.paymentId,
            type: PurchaseAttachmentTypes.PAYMENT_PROOF,
            file: evidenceFile,
            note: "Evidencia cargada al registrar el pago.",
          });
        }
        const submitted = await submitPaymentDraft(response.paymentId);
        if (submitted.type !== "success") {
          showFeedback(errorResponse(submitted.message || "No se pudo enviar el pago."));
          return;
        }
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
            disabled={paymentMethods === null || paymentMethods.length === 0}
            loading={saving}
          >
            {submitLabel}
          </SystemButton>
        </div>
      }
    >
      {Object.keys(errors).length > 0 ? (
        <div ref={errorSummaryRef} tabIndex={-1} role="alert" aria-labelledby="payment-form-errors" className="mb-4 rounded-sm border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800 focus:outline-none focus:ring-2 focus:ring-rose-500">
          <p id="payment-form-errors" className="flex items-center gap-2 font-semibold"><AlertCircle className="h-4 w-4" /> Revisa los campos marcados</p>
          <p className="mt-1 text-xs">El pago no se registró hasta corregir estos datos.</p>
        </div>
      ) : null}
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
        {selectedPayable ? (
          <div className="sm:col-span-2 grid gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm sm:grid-cols-4" aria-live="polite">
            <div><p className="text-[11px] uppercase text-muted-foreground">Obligación</p><p className="font-semibold">{selectedPayable.description || "Compra"}</p></div>
            <div><p className="text-[11px] uppercase text-muted-foreground">Moneda</p><p className="font-semibold">{selectedPayable.currency}</p></div>
            <div><p className="text-[11px] uppercase text-muted-foreground">Saldo actual</p><p className="font-semibold">{selectedPayable.currency} {Number(selectedPayable.amountPending).toFixed(2)}</p></div>
            <div><p className="text-[11px] uppercase text-muted-foreground">Saldo posterior</p><p className="font-semibold">{selectedPayable.currency} {Math.max(0, Number(selectedPayable.amountPending) - normalizeMoney(parseDecimalInput(amount))).toFixed(2)}</p></div>
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
          onChange={(nextMethod) => {
            setMethod(nextMethod);
            setSelectedAccount(null);
            setSupplierPaymentDestinationId("");
          }}
          options={methodOptions}
          placeholder={paymentMethods === null ? "Cargando métodos..." : "Selecciona un método"}
          disabled={saving || paymentMethods === null || paymentMethods.length === 0}
          error={errors.method}
          searchable={false}
        />
        {paymentMethods !== null && paymentMethods.length === 0 ? (
          <div className="sm:col-span-2 rounded-sm border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900" role="status">
            {paymentMethodsError ?? "La empresa no tiene métodos de pago habilitados. Configúralos desde Empresa antes de registrar un pago."}
          </div>
        ) : null}
        <FloatingInput
          label="Numero de operacion"
          name="payment-operation-number"
          value={operationNumber}
          error={errors.operationNumber}
          onChange={(event) => setOperationNumber(event.target.value)}
        />
        {showAccountSelect ? (
          <div className="sm:col-span-2">
            <CompanyPaymentAccountSelect
              companyId={company?.companyId}
              value={selectedAccount?.id ?? ""}
              onChange={setSelectedAccount}
              disabled={saving}
              usage="OUTFLOW"
              currency={currency}
              paymentMethodCode={selectedMethod?.code}
            />
          </div>
        ) : null}
        {errors.account ? <p className="sm:col-span-2 text-xs text-rose-700">{errors.account}</p> : null}
        {selectedMethod?.requiresDestination ? (
          <div className="sm:col-span-2">
            <FloatingSelect
              label="Destino del proveedor"
              name="payment-supplier-destination"
              value={supplierPaymentDestinationId}
              onChange={setSupplierPaymentDestinationId}
              options={supplierDestinations.map((item) => ({
                value: item.supplierPaymentDestinationId,
                label: item.maskedLabel || item.name,
              }))}
              placeholder={loadingDestinations ? "Cargando destinos..." : "Selecciona un destino confirmado"}
              disabled={saving || loadingDestinations || !supplierId}
              searchable={supplierDestinations.length > 6}
            />
            {errors.destination ? <p role="alert" className="mt-1 text-xs text-rose-700">{errors.destination}</p> : null}
            {!loadingDestinations && supplierId && supplierDestinations.length === 0 ? (
              <p className="mt-1 text-xs text-amber-700">
                El proveedor no tiene destinos activos y confirmados compatibles con este metodo y moneda.
              </p>
            ) : null}
          </div>
        ) : null}
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
        <div className="sm:col-span-2">
          <PaymentReview
            payment={{
              source: "PAYMENTS",
              mode: mode === "schedule" ? "SCHEDULED" : "IMMEDIATE",
              currency,
              amount: normalizeMoney(parseDecimalInput(amount)) || 0,
              paymentMethodId: selectedPaymentMethodId ?? "",
              companyPaymentAccountId: selectedAccount?.id ?? null,
              supplierPaymentDestinationId: supplierPaymentDestinationId || null,
              operationNumber: operationNumber || null,
            }}
            methodLabel={selectedMethod?.name ?? method}
            accountLabel={selectedAccount?.maskedLabel || selectedAccount?.name}
            destinationLabel={supplierDestinations.find((item) => item.supplierPaymentDestinationId === supplierPaymentDestinationId)?.maskedLabel}
            evidenceName={evidenceFile?.name}
          />
        </div>
      </div>
    </Modal>
  );
}
