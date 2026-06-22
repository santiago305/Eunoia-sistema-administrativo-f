import { useEffect, useRef, useState } from "react";
import { Banknote, Paperclip, Wallet } from "lucide-react";
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

const PRIMARY = "hsl(var(--primary))";

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
  const { showFeedback, clearFeedback } = useFeedbackToast();
  const { can } = usePermissions();
  const canUploadPaymentEvidence = can("purchases.attachments.upload");

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
  }, [open, poId, quotaId, totalToPay]);

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
              {canUploadPaymentEvidence ? (
                <label className="sm:col-span-2 flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-dashed border-black/20 bg-slate-50 px-3 text-xs text-black/60">
                  <Paperclip className="h-4 w-4 shrink-0" />
                  <input
                    type="file"
                    className="sr-only"
                    accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.doc,.docx,.xls,.xlsx,.txt"
                    onChange={(event) => setEvidenceFile(event.target.files?.[0] ?? null)}
                    disabled={saving}
                  />
                  <span className="truncate">
                    {evidenceFile ? evidenceFile.name : "Adjuntar voucher o evidencia de pago"}
                  </span>
                </label>
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
    </Modal>
  );
}

