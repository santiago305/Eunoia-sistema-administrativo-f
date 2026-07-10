import { useCallback, useMemo, type CSSProperties, type Dispatch, type SetStateAction } from "react";
import { Bike, Plus } from "lucide-react";
import { Modal } from "@/shared/components/settings/modal";
import { SystemButton } from "@/shared/components/components/SystemButton";
import type { CreateSaleOrderDto, SaleOrderPaymentInput } from "@/features/sale-orders/types/saleOrder";
import { toLocalDateKey } from "@/shared/utils/functionPurchases";
import { cn } from "@/shared/lib/utils";
import { useSaleOrderPaymentOptions } from "@/features/sale-orders/components/useSaleOrderPaymentOptions";
import { SaleOrderPaymentEditor } from "@/features/sale-orders/components/SaleOrderPaymentEditor";

const DEFAULT_PRIMARY = "hsl(var(--primary))";
const DELIVERY_PAYMENT_NOTE_PREFIX = "ENVIO";

const isDeliveryPayment = (payment: Pick<SaleOrderPaymentInput, "note">) =>
  String(payment.note ?? "")
    .trim()
    .toUpperCase()
    .startsWith(DELIVERY_PAYMENT_NOTE_PREFIX);

export type SaleOrderPaymentsModalProps = {
  open: boolean;
  onClose: () => void;
  form: CreateSaleOrderDto;
  setForm: Dispatch<SetStateAction<CreateSaleOrderDto>>;
  onSave: () => Promise<boolean>;
  saveDisabled: boolean;
  ringStyle?: CSSProperties;
  primaryColor?: string;
  title?: string;
  className?: string;
};

export function SaleOrderPaymentsModal({
  onClose,
  form,
  setForm,
  onSave,
  saveDisabled,
  primaryColor,
  title = "Agregar Pago",
  className = "max-w-[800px] ",
}: SaleOrderPaymentsModalProps) {
  const accent = primaryColor ?? DEFAULT_PRIMARY;
  const { methodOptions, bankAccountOptions } = useSaleOrderPaymentOptions();

  const totalPrice = useMemo(() => {
    const subTotal = (form.items ?? []).reduce((acc, item) => acc + Number(item.total ?? 0), 0);
    const deliveryCost = Math.max(0, Number(form.deliveryCost ?? 0));
    const discount = Math.max(0, Number(form.discount ?? 0));

    return Math.max(0, subTotal + deliveryCost - discount);
  }, [form.deliveryCost, form.discount, form.items]);

  const totalPaid = useMemo(() => (form.payments ?? []).reduce((acc, payment) => acc + (payment.amount ?? 0), 0), [form.payments]);

  const deliveryCostTotal = form.deliveryCost ?? 0;
  const deliveryPaid = useMemo(
    () => (form.payments ?? []).reduce((acc, payment) => acc + (isDeliveryPayment(payment) ? (payment.amount ?? 0) : 0), 0),
    [form.payments],
  );
  const deliveryPending = Math.max(0, deliveryCostTotal - deliveryPaid);

  const pendingAmount = Math.max(0, totalPrice - totalPaid);
  const fullyPaid = pendingAmount <= 0;

  const formatMoney = useCallback((value: number) => {
    try {
      return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(value);
    } catch {
      return `S/ ${value.toFixed(2)}`;
    }
  }, []);

  const addPayment = (amount?: number) => {
    if (fullyPaid) return;

    setForm((prev) => ({
      ...prev,
      payments: [
        ...(prev.payments ?? []),
        {
          method: "",
          bankAccountId: (prev.payments ?? []).find((p) => p.bankAccountId)?.bankAccountId,
          date: toLocalDateKey(new Date()),
          operationNumber: "",
          amount: Math.max(0, amount ?? 0),
          note: "",
        },
      ],
    }));
  };

  const addDeliveryPayment = (amount?: number) => {
    if (fullyPaid) return;
    const safeAmount = Math.max(0, amount ?? 0);
    if (safeAmount <= 0) return;

    setForm((prev) => ({
      ...prev,
      payments: [
        ...(prev.payments ?? []),
        {
          method: "",
          bankAccountId: (prev.payments ?? []).find((p) => p.bankAccountId)?.bankAccountId,
          date: toLocalDateKey(new Date()),
          operationNumber: "",
          amount: safeAmount,
          note: DELIVERY_PAYMENT_NOTE_PREFIX,
        },
      ],
    }));
  };

  const updatePayment = (index: number, patch: Partial<SaleOrderPaymentInput>) => {
    setForm((prev) => ({
      ...prev,
      payments: (prev.payments ?? []).map((payment, i) => (i === index ? { ...payment, ...patch } : payment)),
    }));
  };

  const removePayment = (index: number) => {
    setForm((prev) => ({
      ...prev,
      payments: (prev.payments ?? []).filter((_, i) => i !== index),
    }));
  };

  const handleSave = useCallback(async () => {
    const ok = await onSave();
    if (ok) onClose();
  }, [onClose, onSave]);

  return (
    <Modal onClose={onClose} title={title} className={`${className} w-150`}>
      <div className="space-y-4">
        <div className="space-y-3">
          <div className="flex grid-cols-2 justify-end gap-2">
            <SystemButton
              variant="motion"
              leftIcon={<Bike className="h-4 w-4" />}
              disabled={fullyPaid || deliveryPending <= 0}
              title="Pagar envío"
              onClick={() => addDeliveryPayment(deliveryPending)}
            >
              Tarifa
            </SystemButton>
            <SystemButton
              leftIcon={<Plus className="h-4 w-4" />}
              style={{
                backgroundColor: accent,
                borderColor: `color-mix(in srgb, ${accent} 20%, transparent)`,
              }}
              title="Agregar pago"
              disabled={fullyPaid}
              onClick={() => addPayment(pendingAmount)}
            >
              Agregar
            </SystemButton>
          </div>

          {(form.payments ?? []).map((payment, index) => {
            const otherPaid = totalPaid - (payment.amount ?? 0);
            const maxForPayment = Math.max(0, totalPrice - otherPaid);
            const deliveryTag = isDeliveryPayment(payment);

            return (
              <div key={`payment-${index}`} className="space-y-2">
                <SaleOrderPaymentEditor
                  payment={payment}
                  maxAmount={maxForPayment}
                  methodOptions={methodOptions}
                  bankAccountOptions={bankAccountOptions}
                  className={cn(deliveryTag ? "bg-amber-50/40 border-amber-200/60" : "")}
                  onChange={(patch) => updatePayment(index, patch)}
                  onRemove={() => removePayment(index)}
                />
                {deliveryTag ? <div className="text-[11px] font-semibold text-amber-700">Pago de envío</div> : null}
              </div>
            );
          })}
        </div>

        <div className="space-y-1 rounded-sm border border-black/10 bg-black/[0.02] px-3 py-2 text-sm font-semibold">
          <div className="flex items-center justify-between">
            <span>Total</span>
            <span className="font-semibold">{formatMoney(totalPrice)}</span>
          </div>
          {deliveryCostTotal > 0 ? (
            <div className="flex items-center justify-between">
              <span>Costo de envío</span>
              <span className="font-semibold">{formatMoney(deliveryCostTotal)}</span>
            </div>
          ) : null}
          <div className="flex items-center justify-between">
            <span>Pagado</span>
            <span className="font-semibold">{formatMoney(totalPaid)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Pendiente</span>
            <span className="font-semibold">{formatMoney(pendingAmount)}</span>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <SystemButton variant="outline" onClick={onClose}>
            Cerrar
          </SystemButton>
          <SystemButton
            style={{ backgroundColor: accent, borderColor: `color-mix(in srgb, ${accent} 20%, transparent)` }}
            disabled={saveDisabled}
            onClick={handleSave}
          >
            Crear pedido
          </SystemButton>
        </div>
      </div>
    </Modal>
  );
}

