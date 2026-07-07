import { Eye, ImagePlus, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { env } from "@/env";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { ImagePreviewModal } from "@/shared/components/components/ImagePreviewModal";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { FloatingDatePicker } from "@/shared/components/components/date-picker/FloatingDatePicker";
import { useSaleOrderPaymentOptions } from "../useSaleOrderPaymentOptions";
import type {
  SaleOrderEditorForm,
  SaleOrderEditorPayment,
} from "./saleOrderEditorForm";
import {
  calculateSaleOrderTotals,
  markAttachmentRemoved,
} from "./saleOrderEditorForm";
import {
  parseDateInputValue,
  toLocalDateKey,
} from "@/shared/utils/functionPurchases";
import { SaleOrderEditorSection } from "./SaleOrderEditorSection";

type Props = {
  form: SaleOrderEditorForm;
  setForm: React.Dispatch<React.SetStateAction<SaleOrderEditorForm>>;
};

const nextClientKey = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `payment-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const resolveUrl = (value?: string | null) => {
  if (!value) return "";
  if (/^(https?:|blob:|data:)/i.test(value)) return value;
  try {
    return new URL(value, env.apiBaseUrl).toString();
  } catch {
    return value;
  }
};

export function SaleOrderPaymentCards({ form, setForm }: Props) {
  const { methodOptions, bankAccountOptions } =
    useSaleOrderPaymentOptions();
  const [preview, setPreview] = useState<string | null>(null);
  const paymentPhotos = useMemo(
    () =>
      new Map(
        form.payments.map((payment) => [
          payment.clientKey,
          payment.photo
            ? URL.createObjectURL(payment.photo)
            : resolveUrl(payment.existingPhotoUrl),
        ]),
      ),
    [form.payments],
  );
  const updatePayment = (
    index: number,
    patch: Partial<SaleOrderEditorPayment>,
  ) =>
    setForm((current) => ({
      ...current,
      payments: current.payments.map((payment, itemIndex) =>
        itemIndex === index ? { ...payment, ...patch } : payment,
      ),
    }));

  return (
    <SaleOrderEditorSection
      title="Pagos"
      actions={
        <SystemButton
          type="button"
          size="sm"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() =>
            setForm((current) => {
              const total = calculateSaleOrderTotals(
                current.items,
                current.deliveryCost,
                current.discount,
              ).total;
              const paid = current.payments.reduce(
                (sum, payment) => sum + Number(payment.amount || 0),
                0,
              );
              const pending = Math.max(
                0,
                Number((total - paid).toFixed(2)),
              );

              return {
                ...current,
                payments: [
                  ...current.payments,
                  {
                    clientKey: nextClientKey(),
                    method: "",
                    amount: pending,
                    date: toLocalDateKey(new Date()),
                    photo: null,
                  },
                ],
              };
            })
          }
        >
          Agregar Pago
        </SystemButton>
      }
    >
      <div className="space-y-3">
        {form.payments.map((payment, index) => {
          const imageUrl = paymentPhotos.get(payment.clientKey) ?? "";
          return (
            <article
              key={payment.clientKey}
              className="overflow-hidden rounded-lg bg-background/80 shadow-sm"
            >
              <div className="flex items-center justify-between gap-2 bg-muted/50 px-2.5 py-1.5">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                    {index + 1}
                  </span>
                  <span className="text-xs font-semibold">
                    Pago {index + 1}
                  </span>
                </div>
                <span className="rounded-full bg-background/80 px-2 py-1 text-xs font-semibold tabular-nums">
                  <FloatingInput
                    label="Monto"
                    className="h-11 text-[14px] font-semibold tabular-nums"
                    name={`payment-amount-${payment.clientKey}`}
                    type="number"
                    min={0}
                    step="0.01"
                    value={String(payment.amount)}
                    onChange={(event) =>
                      updatePayment(index, {
                        amount: Math.max(
                          0,
                          Number(event.target.value || 0),
                        ),
                      })
                    }
                  />
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2 px-2 sm:grid-cols-5 space-y-2">
                <FloatingDatePicker
                  label="Fecha"
                  className="h-9 text-xs"
                  name={`payment-date-${payment.clientKey}`}
                  value={parseDateInputValue(payment.date)}
                  onChange={(date) =>
                    updatePayment(index, {
                      date: date ? toLocalDateKey(date) : "",
                    })
                  }
                />
                <FloatingSelect
                  label="Método"
                  className="h-9 text-xs"
                  name={`payment-method-${payment.clientKey}`}
                  value={payment.method}
                  options={methodOptions}
                  onChange={(method) => updatePayment(index, { method })}
                />
                <FloatingSelect
                  label="Cuenta"
                  className="h-9 text-xs"
                  name={`payment-account-${payment.clientKey}`}
                  value={payment.bankAccountId ?? ""}
                  options={bankAccountOptions}
                  onChange={(bankAccountId) =>
                    updatePayment(index, {
                      bankAccountId: bankAccountId || null,
                    })
                  }
                />
                <FloatingInput
                  label="Operación"
                  className="h-9 text-xs"
                  name={`payment-operation-${payment.clientKey}`}
                  value={payment.operationNumber ?? ""}
                  onChange={(event) =>
                    updatePayment(index, {
                      operationNumber: event.target.value,
                    })
                  }
                />
                <FloatingInput
                  label="Descripción"
                  className="h-9 text-xs"
                  name={`payment-note-${payment.clientKey}`}
                  value={payment.note ?? ""}
                  onChange={(event) =>
                    updatePayment(index, { note: event.target.value })
                  }
                />
              </div>
              <div className="flex flex-wrap justify-end gap-1.5 px-2.5 pb-2.5">
                <label className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-lg bg-muted/70 px-3 text-xs font-medium transition-colors hover:bg-muted">
                  <ImagePlus className="h-4 w-4" />
                  {imageUrl ? "Reemplazar foto" : "Añadir foto"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(event) =>
                      updatePayment(index, {
                        photo: event.target.files?.[0] ?? null,
                      })
                    }
                  />
                </label>
                {imageUrl ? (
                  <SystemButton
                    type="button"
                    size="sm"
                    variant="ghost"
                    leftIcon={<Eye className="h-4 w-4" />}
                    onClick={() => setPreview(imageUrl)}
                  >
                    Ver
                  </SystemButton>
                ) : null}
                <SystemButton
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-rose-600 hover:bg-rose-500/10"
                  leftIcon={<Trash2 className="h-4 w-4" />}
                  onClick={() =>
                    setForm((current) => {
                      const next = markAttachmentRemoved(
                        current,
                        payment.existingAttachmentId,
                      );
                      return {
                        ...next,
                        payments: next.payments.filter(
                          (_, itemIndex) => itemIndex !== index,
                        ),
                      };
                    })
                  }
                >
                  Quitar
                </SystemButton>
              </div>
            </article>
          );
        })}
        {!form.payments.length ? (
          <p className="py-3 text-center text-xs text-muted-foreground">
            No hay pagos registrados.
          </p>
        ) : null}
      </div>

      <ImagePreviewModal
        open={Boolean(preview)}
        images={preview ? [preview] : []}
        currentIndex={0}
        onClose={() => setPreview(null)}
        altPrefix="Comprobante de pago"
      />
    </SaleOrderEditorSection>
  );
}
