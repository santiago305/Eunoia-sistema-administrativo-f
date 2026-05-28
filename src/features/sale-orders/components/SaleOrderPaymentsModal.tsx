import { useCallback, useEffect, useMemo, useState, type CSSProperties, type Dispatch, type SetStateAction } from "react";
import { Bike, Plus, Trash2 } from "lucide-react";
import { Modal } from "@/shared/components/settings/modal";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { FloatingDatePicker } from "@/shared/components/components/date-picker/FloatingDatePicker";
import { SystemButton } from "@/shared/components/components/SystemButton";
import type { CreateSaleOrderDto, SaleOrderPaymentInput } from "@/features/sale-orders/types/saleOrder";
import { normalizeMoney, parseDateInputValue, parseDecimalInput, toLocalDateKey } from "@/shared/utils/functionPurchases";
import { useFeedbackToast } from "@/shared/hooks/useFeedbackToast";
import { errorResponse } from "@/shared/common/utils/response";
import { getPaymentMethodsByCompany } from "@/shared/services/paymentMethodService";
import type { PaymentMethodPivot } from "@/features/payment-methods/types/paymentMethod";
import { useCompany } from "@/shared/hooks/useCompany";
import { PaymentTypes } from "@/features/purchases/types/purchaseEnums";
import { cn } from "@/shared/lib/utils";
import { listBankAccountsByCompany } from "@/shared/services/bankAccountService";

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
  const { company } = useCompany();
  const companyId = company?.companyId ?? "";

  const accent = primaryColor ?? DEFAULT_PRIMARY;
  const { showFeedback, clearFeedback } = useFeedbackToast();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodPivot[]>([]);
  const [bankAccountOptions, setBankAccountOptions] = useState<Array<{ value: string; label: string }>>([]);

  const totalPrice = useMemo(
    () => (form.items ?? []).reduce((acc, item) => acc + (item.total ?? 0), 0) + (form.deliveryCost ?? 0),
    [form.deliveryCost, form.items],
  );

  const totalPaid = useMemo(
    () => (form.payments ?? []).reduce((acc, payment) => acc + (payment.amount ?? 0), 0),
    [form.payments],
  );

  const deliveryCostTotal = form.deliveryCost ?? 0;
  const deliveryPaid = useMemo(
    () =>
      (form.payments ?? []).reduce((acc, payment) => acc + (isDeliveryPayment(payment) ? (payment.amount ?? 0) : 0), 0),
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

  const loadCompanyMethods = useCallback(
    async (id: string) => {
      clearFeedback();
      try {
        const data = await getPaymentMethodsByCompany(id);
        const normalized = (data ?? []).map((m) => ({
          ...m,
          name: (m.name ?? "").trim().toUpperCase(),
        }));

        normalized.sort((a, b) => {
          const aIsCash = a.name === "EFECTIVO";
          const bIsCash = b.name === "EFECTIVO";
          if (aIsCash && !bIsCash) return -1;
          if (!aIsCash && bIsCash) return 1;
          return a.name.localeCompare(b.name, "es");
        });

        setPaymentMethods(normalized ?? []);
      } catch {
        showFeedback(errorResponse("No se pudieron cargar los metodos de pago."));
      }
    },
    [clearFeedback, showFeedback],
  );

  useEffect(() => {
    if (!companyId) {
      setPaymentMethods([]);
      return;
    }

    void loadCompanyMethods(companyId);
  }, [companyId, loadCompanyMethods]);

  const loadCompanyBankAccounts = useCallback(
    async (id: string) => {
      clearFeedback();
      try {
        const accounts = await listBankAccountsByCompany(id);
        setBankAccountOptions(
          (accounts ?? []).map((b) => ({
            value: b.id,
            label: `${b.name}${b.number ? ` (${b.number})` : ""}`.trim(),
          })),
        );
      } catch {
        showFeedback(errorResponse("No se pudieron cargar las cuentas bancarias."));
        setBankAccountOptions([]);
      }
    },
    [clearFeedback, showFeedback],
  );

  useEffect(() => {
    if (!companyId) {
      setBankAccountOptions([]);
      return;
    }
    void loadCompanyBankAccounts(companyId);
  }, [companyId, loadCompanyBankAccounts]);

  const methodOptions = useMemo(() => {
    const fromApi = (paymentMethods ?? []).map((m) => {
      const label = `${m.name} ${m.number ? `- ${m.number}` : ""}`.trim();
      return { value: label, label };
    });

    if (fromApi.length > 0) return fromApi;

    return [
      { value: PaymentTypes.EFECTIVO, label: "EFECTIVO" },
      { value: PaymentTypes.TRANSFERENCIA, label: "TRANSFERENCIA" },
      { value: PaymentTypes.TARJETA, label: "TARJETA" },
      { value: PaymentTypes.DEPOSITO, label: "DEPÓSITO" },
      { value: PaymentTypes.PLIN, label: "PLIN" },
      { value: PaymentTypes.YAPE, label: "YAPE" },
    ];
  }, [paymentMethods]);

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
            <div className="flex grid-cols-2 gap-2 justify-end">
            <SystemButton
              variant="motion"
              leftIcon={<Bike className="h-4 w-4" />}
              disabled={fullyPaid || deliveryPending <= 0}
              title={"Pagar envío"}
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
              title={"Agregar pago"}
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
              <div
                key={`payment-${index}`}
                className={cn(
                  "rounded-xl border border-black/10 p-3 space-y-2",
                  deliveryTag ? "bg-amber-50/40 border-amber-200/60" : "",
                )}
              >
                <div className="grid grid-cols-[1.5fr_1fr_50px] gap-2">
                  <FloatingDatePicker
                    label="Fecha"
                    name={`payment-date-${index}`}
                    value={parseDateInputValue(payment.date)}
                    onChange={(date) => updatePayment(index, { date: date ? toLocalDateKey(date) : undefined })}
                    className="h-9 text-xs"
                  />
                  <FloatingInput
                    label="Monto"
                    name={`payment-amount-${index}`}
                    type="number"
                    min={0}
                    max={maxForPayment}
                    value={String(payment.amount ?? "")}
                    onChange={(e) => {
                      const next = normalizeMoney(parseDecimalInput(e.target.value));
                      updatePayment(index, { amount: Math.min(Math.max(0, next), maxForPayment) });
                    }}
                    className="h-9 text-xs"
                  />
                  <div className="flex justify-end">
                    <SystemButton
                      variant="danger"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => removePayment(index)}
                      title="Eliminar pago"
                    >
                      <Trash2 className="h-4 w-4" />
                    </SystemButton>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <FloatingSelect
                    label="Metodo"
                    name={`payment-method-${index}`}
                    value={payment.method}
                    onChange={(value) => updatePayment(index, { method: value })}
                    options={methodOptions}
                    searchable={false}
                    className="h-9 text-xs"
                  />
                  <FloatingSelect
                    label="Cuenta"
                    name={`payment-bank-account-${index}`}
                    value={payment.bankAccountId ?? ""}
                    onChange={(value) => updatePayment(index, { bankAccountId: value || undefined })}
                    options={bankAccountOptions}
                    searchable
                    searchPlaceholder="Buscar cuenta..."
                    emptyMessage="Sin cuentas"
                    className="h-9 text-xs"
                  />
                  <FloatingInput
                    label="Numero de operacion"
                    name={`payment-operation-${index}`}
                    value={payment.operationNumber ?? ""}
                    onChange={(e) => updatePayment(index, { operationNumber: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
                <FloatingInput
                  label="Nota"
                  name={`payment-note-${index}`}
                  value={payment.note ?? ""}
                  onChange={(e) => updatePayment(index, { note: e.target.value })}
                  className="h-9 text-xs"
                />
                {deliveryTag ? <div className="text-[11px] font-semibold text-amber-700">Pago de envío</div> : null}
              </div>
            );
          })}
        </div>

        <div className="rounded-sm border border-black/10 bg-black/[0.02] px-3 py-2 text-sm font-semibold space-y-1">
          <div className="flex items-center justify-between">
            <span>Total</span>
            <span className="font-semibold">{formatMoney(totalPrice)}</span>
          </div>
          {deliveryCostTotal > 0 ? (
            <div>
              <div className="flex items-center justify-between">
                <span>Costo de envío</span>
                <span className="font-semibold">
                   {formatMoney(deliveryCostTotal)}
                </span>
              </div>
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
