import { useEffect, useMemo, useRef, useState } from "react";
import { Banknote, CalendarClock, FileText, ImageIcon, Paperclip, UploadCloud, Wallet, X } from "lucide-react";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { FloatingDatePicker } from "@/shared/components/components/date-picker/FloatingDatePicker";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { SectionHeaderForm } from "@/shared/components/components/SectionHederForm";
import { Payment } from "@/features/purchases/types/purchase";
import {
  CurrencyType,
  CurrencyTypes,
  PaymentType,
  PaymentTypes,
} from "@/features/purchases/types/purchaseEnums";
import {
  money,
  parseDateInputValue,
  toLocalDateKey,
  normalizeMoney,
  parseDecimalInput,
} from "@/shared/utils/functionPurchases";
import { createPayment } from "@/shared/services/paymentService";
import { getAllPaymentMethods } from "@/shared/services/paymentMethodService";
import { useFeedbackToast } from "@/shared/hooks/useFeedbackToast";
import { errorResponse, successResponse } from "@/shared/common/utils/response";
import { Modal } from "@/shared/components/modales/Modal";
import { getPaymentMethodOptions } from "@/features/payments/paymentView";
import type { PaymentMethod } from "@/features/payment-methods/types/paymentMethod";
import { uploadPurchaseAttachment } from "@/shared/services/purchaseAttachmentService";
import { PurchaseAttachmentTypes } from "@/features/purchases/types/purchase-attachment.types";
import { parseApiError } from "@/shared/common/utils/handleApiError";
import { usePermissions } from "@/shared/hooks/usePermissions";
import { useCompany } from "@/shared/hooks/useCompany";
import { CompanyPaymentAccountSelect } from "@/features/payments/components/CompanyPaymentAccountSelect";
import { SchedulePaymentModal } from "@/features/payments/components/SchedulePaymentModal";
import type { CompanyPaymentAccount } from "@/features/payments/types/payment-account.types";

const PRIMARY = "hsl(var(--primary))";

const isCashMethod = (method?: string | null) => (method ?? "").trim().toUpperCase() === PaymentTypes.EFECTIVO;
const isImageFile = (file?: File | null) => Boolean(file?.type.startsWith("image/"));
const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export type PaymentProps = {
  title: string;
  close: () => void;
  className?: string;
  totalToPay?: number;
  totalPaid?: number;
  quotaId?: string;
  poId: string;
  loadPurchases?: () => void;
  loadQuotas?: () => void;
  onSaved?: () => void | Promise<void>;
  open:boolean;
};

type PaymentForm = Omit<Payment, "amount"> & { amount: string };

export function PaymentModal({
  title,
  close,
  className,
  totalToPay = 0,
  totalPaid = 0,
  quotaId,
  poId,
  loadPurchases,
  loadQuotas,
  onSaved,
  open,
}: PaymentProps) {
  const [form, setForm] = useState<PaymentForm>({
    method: PaymentTypes.EFECTIVO,
    date: new Date().toISOString(),
    operationNumber: "",
    currency: CurrencyTypes.PEN,
    amount: String(normalizeMoney(totalToPay)),
    note: "",
    quotaId: null,
    poId: "",
  });

  const previousOpenRef = useRef(open);
  const [saving, setSaving] = useState(false);
  const [paymentMethodRecords, setPaymentMethodRecords] = useState<PaymentMethod[] | null>(null);
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidencePreviewUrl, setEvidencePreviewUrl] = useState<string | null>(null);
  const [selectedPaymentAccount, setSelectedPaymentAccount] = useState<CompanyPaymentAccount | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const { showFeedback, clearFeedback } = useFeedbackToast();
  const { can } = usePermissions();
  const { company } = useCompany();
  const canUploadPaymentEvidence = can("payments.attach_evidence");
  const showAccountSelect = !isCashMethod(form.method);
  const showEvidenceUploader = canUploadPaymentEvidence && showAccountSelect;

  const evidenceMeta = useMemo(() => {
    if (!evidenceFile) return null;
    return `${evidenceFile.type || "Archivo"} · ${formatFileSize(evidenceFile.size)}`;
  }, [evidenceFile]);

  const setNextEvidenceFile = (file?: File | null) => {
    setEvidenceFile(file ?? null);
  };

  useEffect(() => {
    const wasOpen = previousOpenRef.current;
    previousOpenRef.current = open;

    if (!open || wasOpen) return;

    setForm((prev) => ({
      ...prev,
        method: PaymentTypes.EFECTIVO,
      date: new Date().toISOString(),
      operationNumber: "",
      currency: CurrencyTypes.PEN,
      amount: String(normalizeMoney(totalToPay)),
      note: "",
      quotaId: quotaId ?? null,
        poId,
      }));
    setEvidenceFile(null);
    setEvidencePreviewUrl(null);
    setSelectedPaymentAccount(null);
  }, [open, poId, quotaId, totalToPay]);

  useEffect(() => {
    if (!evidenceFile || !isImageFile(evidenceFile)) {
      setEvidencePreviewUrl(null);
      return;
    }

    const nextUrl = URL.createObjectURL(evidenceFile);
    setEvidencePreviewUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [evidenceFile]);

  useEffect(() => {
    if (showAccountSelect) return;
    setSelectedPaymentAccount(null);
  }, [showAccountSelect]);

  useEffect(() => {
    if (showEvidenceUploader) return;
    setEvidenceFile(null);
  }, [showEvidenceUploader]);

  useEffect(() => {
    if (!open) return;

    let alive = true;
    getAllPaymentMethods()
      .then((records) => {
        if (alive) setPaymentMethodRecords(records);
      })
      .catch(() => {
        if (alive) setPaymentMethodRecords(null);
      });

    return () => {
      alive = false;
    };
  }, [open]);

  const paymentMethodOptions = getPaymentMethodOptions(paymentMethodRecords);

  const currencyOptions = [
    { value: CurrencyTypes.PEN, label: "PEN (S/)" },
    { value: CurrencyTypes.USD, label: "USD ($)" },
  ];

  const handleSave = async () => {
    if (saving) return;

    const amountNumber = normalizeMoney(parseDecimalInput(form.amount));
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      showFeedback(errorResponse("Ingresa un monto válido"));
      return;
    }

    setSaving(true);
    clearFeedback();

    try {
      const res = await createPayment({
        ...form,
        amount: amountNumber,
        quotaId: quotaId ?? null,
        poId,
        companyPaymentAccountId: showAccountSelect ? selectedPaymentAccount?.id ?? null : null,
        bankName: showAccountSelect ? selectedPaymentAccount?.bankName ?? null : null,
        cardLastFour: showAccountSelect ? selectedPaymentAccount?.cardLastFour ?? selectedPaymentAccount?.accountLastFour ?? null : null,
        operationCode: form.operationNumber ?? null,
        isPartial: amountNumber < normalizeMoney(totalToPay),
      });

      if (res.type === "success") {
        if (evidenceFile && res.paymentId) {
          await uploadPurchaseAttachment({
            purchaseId: poId,
            paymentId: res.paymentId,
            type: PurchaseAttachmentTypes.PAYMENT_PROOF,
            file: evidenceFile,
            note: "Evidencia cargada al registrar el pago.",
          });
        }
        showFeedback(successResponse("Pago guardado con exito"));

        if (loadPurchases) {
          loadPurchases();
        }

        if (loadQuotas) {
          loadQuotas();
        }
        await onSaved?.();
      } else {
        showFeedback(errorResponse("Error al guardar pago"));
      }

      close();
    } catch (error) {
      showFeedback(errorResponse(parseApiError(error, "Error al guardar pago")));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={close} title={title} className={className}>
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-sm border border-black/10 bg-emerald-50/70 p-4">
            <p className="text-xs text-black/60">Total Pagado</p>
            <div className="mt-1 text-xl font-semibold text-emerald-700 tabular-nums">
              {money(totalPaid, form.currency)}
            </div>
          </div>

          <div className="rounded-sm border border-black/10 bg-rose-50/70 p-4">
            <p className="text-xs text-black/60">Total Pendiente</p>
            <div className="mt-1 text-xl font-semibold text-rose-700 tabular-nums">
              {money(totalToPay, form.currency)}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <SectionHeaderForm icon={Wallet} title="Registrar pago" />

          <div className="grid grid-cols-1 lg:grid-cols-[0.7fr_1fr] gap-4">
            <FloatingInput
              label="Monto"
              name="amount"
              type="number"
              min={0}
              step="0.01"
              value={form.amount}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  amount: e.target.value,
                }))
              }
              onBlur={() => {
                const num = parseDecimalInput(form.amount);
                if (!Number.isFinite(num)) {
                  setForm((prev) => ({ ...prev, amount: "" }));
                  return;
                }

                const clamped = Math.max(0, Math.min(normalizeMoney(num), normalizeMoney(totalToPay)));
                setForm((prev) => ({
                  ...prev,
                  amount: String(clamped),
                }));
              }}
              className="h-14 text-lg"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FloatingDatePicker
                label="Fecha de pago"
                name="payment-date"
                value={parseDateInputValue(form.date)}
                onChange={(date) =>
                  setForm((prev) => ({
                    ...prev,
                    date: date ? toLocalDateKey(date) : "",
                  }))
                }
              />

              <FloatingSelect
                label="Metodo"
                name="payment-method"
                value={form.method}
                onChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    method: value as PaymentType,
                  }))
                }
                options={paymentMethodOptions}
                searchable={false}
              />

              {showAccountSelect ? (
                <div className="sm:col-span-2">
                  <CompanyPaymentAccountSelect
                    companyId={company?.companyId}
                    value={selectedPaymentAccount?.id ?? ""}
                    disabled={saving}
                    onChange={setSelectedPaymentAccount}
                  />
                </div>
              ) : null}

              <FloatingSelect
                label="Moneda"
                name="payment-currency"
                value={form.currency}
                onChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    currency: value as CurrencyType,
                  }))
                }
                options={currencyOptions}
                searchable={false}
                disabled
              />

              <FloatingInput
                label="Número de operación"
                name="operationNumber"
                value={form.operationNumber ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    operationNumber: e.target.value,
                  }))
                }
              />

              <div className="sm:col-span-2">
                <FloatingInput
                  label="Nota"
                  name="payment-note"
                  value={form.note ?? ""}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      note: e.target.value,
                    }))
                  }
                  />
              </div>
              <div className="sm:col-span-2 flex min-h-11 flex-col gap-2 rounded-md border border-black/10 bg-slate-50 px-3 py-2 text-xs text-black/65 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  {form.scheduledAt ? `Programado para ${form.scheduledAt}` : "Registrar como pago inmediato"}
                </span>
                <SystemButton
                  size="sm"
                  variant="ghost"
                  leftIcon={<CalendarClock className="h-4 w-4" />}
                  disabled={saving}
                  onClick={() => setScheduleOpen(true)}
                >
                  Programar
                </SystemButton>
              </div>
              {showEvidenceUploader ? (
                <div className="sm:col-span-2 space-y-2">
                  <label
                    className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-black/20 bg-slate-50 px-3 py-4 text-center text-xs text-black/60 transition hover:border-primary/40 hover:bg-primary/5"
                    onDragOver={(event) => {
                      event.preventDefault();
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      if (saving) return;
                      setNextEvidenceFile(event.dataTransfer.files?.[0]);
                    }}
                  >
                    <input
                      aria-label="Foto/comprobante de pago"
                      type="file"
                      className="sr-only"
                      accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.doc,.docx,.xls,.xlsx,.txt"
                      onChange={(event) => setNextEvidenceFile(event.target.files?.[0])}
                      disabled={saving}
                    />
                    <UploadCloud className="h-5 w-5 text-black/45" />
                    <span className="font-semibold text-black/70">Foto/comprobante de pago</span>
                    <span className="text-black/45">Arrastra el voucher o haz click para seleccionar</span>
                  </label>

                  {evidenceFile ? (
                    <div className="flex gap-3 rounded-md border border-black/10 bg-white p-2">
                      <div className="flex h-20 w-24 shrink-0 items-center justify-center overflow-hidden rounded border border-black/10 bg-black/[0.03]">
                        {evidencePreviewUrl ? (
                          <img
                            src={evidencePreviewUrl}
                            alt="Previsualizacion del comprobante de pago"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <FileText className="h-6 w-6 text-black/45" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 py-1">
                        <div className="flex items-center gap-1 text-xs font-semibold text-black/75">
                          {evidencePreviewUrl ? <ImageIcon className="h-3.5 w-3.5" /> : <Paperclip className="h-3.5 w-3.5" />}
                          <span className="truncate">{evidenceFile.name}</span>
                        </div>
                        {evidenceMeta ? <p className="mt-1 text-[11px] text-black/45">{evidenceMeta}</p> : null}
                      </div>
                      <SystemButton
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => setNextEvidenceFile(null)}
                        title="Quitar comprobante"
                        disabled={saving}
                      >
                        <X className="h-4 w-4" />
                      </SystemButton>
                    </div>
                  ) : null}
                </div>
              ) : null}
              <div className="sm:col-span-2">
                <SystemButton
                  leftIcon={<Banknote className="h-5 w-5" />}
                  className="w-full h-11"
                  style={{
                    backgroundColor: PRIMARY,
                    borderColor: `color-mix(in srgb, ${PRIMARY} 20%, transparent)`,
                  }}
                  onClick={handleSave}
                  disabled={saving || totalToPay === 0}
                >
                  {saving ? "Guardando..." : "Agregar pago"}
                </SystemButton>
              </div>
            </div>
          </div>
        </div>
      </div>
      <SchedulePaymentModal
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        onSchedule={(scheduledAt) => {
          setForm((prev) => ({ ...prev, scheduledAt }));
          setScheduleOpen(false);
        }}
      />
    </Modal>
  );
}

