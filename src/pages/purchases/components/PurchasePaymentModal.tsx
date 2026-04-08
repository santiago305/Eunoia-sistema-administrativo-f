import { useEffect, useMemo, useState, type CSSProperties, type Dispatch, type SetStateAction } from "react";
import { Calendar, Plus, Trash2, Wallet } from "lucide-react";
import { Modal } from "@/components/settings/modal";
import { FloatingInput } from "@/components/FloatingInput";
import { FloatingSelect } from "@/components/FloatingSelect";
import { DataTable } from "@/components/table/DataTable";
import type { DataTableColumn } from "@/components/table/types";
import { SystemButton } from "@/components/SystemButton";
import { SectionHeaderForm } from "@/components/SectionHederForm";
import { CurrencyType, CurrencyTypes, PaymentFormTypes, PaymentTypes } from "@/pages/purchases/types/purchaseEnums";
import type { CreditQuota, Payment, PurchaseOrder } from "@/pages/purchases/types/purchase";
import { todayIso, toDateInputValue, clampQuotas, buildQuotas, tryShowPicker, normalizeMoney, parseDecimalInput } from "@/utils/functionPurchases";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { errorResponse } from "@/common/utils/response";
import { getPaymentMethodsBySupplier } from "@/services/paymentMethodService";
import { PaymentMethodPivot } from "@/pages/payment-methods/types/paymentMethod";

const DEFAULT_PRIMARY = "hsl(var(--primary))";

export type PurchasePaymentModalProps = {
  open: boolean;
  onClose: () => void;
  form: PurchaseOrder;
  setForm: Dispatch<SetStateAction<PurchaseOrder>>;
  totalPrice: number;
  ringStyle?: CSSProperties;
  primaryColor?: string;
  currency: CurrencyType;
  formatMoney: (value: number, currency: CurrencyType) => string;
  onSave: () => void;
  saveDisabled: boolean;
  title?: string;
  className?: string;
  isEdit?: boolean
};

export function PurchasePaymentModal({
  onClose,
  form,
  setForm,
  totalPrice,
  primaryColor,
  currency,
  formatMoney,
  onSave,
  saveDisabled,
  title = "Agregar Pago",
  className = "max-w-[800px] ",
  isEdit
}: PurchasePaymentModalProps) {

  const accent = primaryColor ?? DEFAULT_PRIMARY;

  const showCredit = form.paymentForm === PaymentFormTypes.CREDITO;
  const totalPaid = (form.payments ?? []).reduce((acc, p) => acc + (p.amount ?? 0), 0);
  const pendingAmount = Math.max(0, totalPrice - totalPaid);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodPivot[]>([]);;
  const { showFlash, clearFlash } = useFlashMessage();


  const addPayment = (amount?: number) => {
    setForm((prev) => ({
      ...prev,
      payments: [
        ...(prev.payments ?? []),
        {
          method: PaymentTypes.EFECTIVO,
          date: todayIso(),
          operationNumber: "",
          currency: prev.currency,
          amount: Math.max(0, amount ?? 0),
          note: "",
        },
      ],
    }));
  };

  const loadSupplierMethods = async (id:string) => {
    clearFlash()
    try {
      const data = await getPaymentMethodsBySupplier(id);
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
      showFlash(errorResponse("No se pudieron cargar los metodos de pago."));
    }
  };

  useEffect(()=> {
    void loadSupplierMethods(form.supplierId);
  }, [])

  const updatePayment = (index: number, patch: Partial<Payment>) => {
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

  const updateQuota = (index: number, patch: Partial<CreditQuota>) => {
    setForm((prev) => ({
      ...prev,
      quotas: (prev.quotas ?? []).map((quota, i) => (i === index ? { ...quota, ...patch } : quota)),
    }));
  };

  const removeQuota = (index: number) => {
    setForm((prev) => {
      const quotas = (prev.quotas ?? []).filter((_, i) => i !== index);
      return { ...prev, quotas, numQuotas: quotas.length };
    });
  };

  const paymentFormOptions = [
    { value: PaymentFormTypes.CONTADO, label: "Contado" },
    { value: PaymentFormTypes.CREDITO, label: "Credito" },
  ];

  const currencyOptions = [
    { value: CurrencyTypes.PEN, label: "PEN (S/)" },
    { value: CurrencyTypes.USD, label: "USD ($)" },
  ];

  const methodOptions = useMemo(
    () =>
      (paymentMethods ?? []).map((m) => {
        const label = `${m.name} ${m.number ? `- ${m.number}` : ""}`.trim();
        return {
          value: label,
          label,
        };
      }),
    [paymentMethods],
  );

  type QuotaRow = CreditQuota & {
    id: string;
    rowIndex: number;
  };

  const quotaRows = useMemo<QuotaRow[]>(
    () =>
      (form.quotas ?? []).map((quota, index) => ({
        ...quota,
        id: quota.quotaId ?? `quota-${index}`,
        rowIndex: index,
      })),
    [form.quotas],
  );

  const quotaColumns = useMemo<DataTableColumn<QuotaRow>[]>(
    () => [
      {
        id: "expirationDate",
        header: "Fecha de pago",
        cell: (row) => (
          <FloatingInput
            label="Fecha"
            name={`quota-date-${row.rowIndex}`}
            type="date"
            value={toDateInputValue(row.expirationDate)}
            onClick={(e) => tryShowPicker(e.currentTarget)}
            onChange={(e) => updateQuota(row.rowIndex, { expirationDate: e.target.value })}
            className="h-9 text-xs"
          />
        ),
        hideable: false,
      },
      {
        id: "totalToPay",
        header: "Total a pagar",
        cell: (row) => (
          <FloatingInput
            label="Total"
            name={`quota-total-${row.rowIndex}`}
            type="number"
            min={0}
            value={row.totalToPay}
            onChange={(e) => updateQuota(row.rowIndex, { totalToPay: Number(e.target.value || 0) })}
            className="h-9 text-xs"
          />
        ),
        hideable: false,
      },
      {
        id: "actions",
        header: "Acciones",
        cell: (row) => (
          <div className="flex justify-end">
            <SystemButton
              variant="danger"
              size="icon"
              className="h-9 w-9"
              onClick={() => removeQuota(row.rowIndex)}
              title="Eliminar cuota"
            >
              <Trash2 className="h-4 w-4" />
            </SystemButton>
          </div>
        ),
        className: "text-right",
        headerClassName: "text-right",
        hideable: false,
      },
    ],
    [updateQuota, removeQuota],
  );

  return (
    <Modal onClose={onClose} title={title} className={className}>
      <div className="space-y-4">
        <FloatingSelect
          label="Forma de pago"
          name="payment-form"
          value={form.paymentForm}
          onChange={(value) => {
            const next = value as PurchaseOrder["paymentForm"];
            setForm((prev) => {
              if (next !== PaymentFormTypes.CREDITO) {
                return {
                  ...prev,
                  paymentForm: next,
                  creditDays: 0,
                  numQuotas: 0,
                  quotas: [],
                };
              }
              const baseDate = toDateInputValue(prev.dateIssue) || todayIso();
              const creditDays = Math.max(0, prev.creditDays ?? 0);
              const numQuotas = clampQuotas(creditDays, prev.numQuotas ?? 0);
              return {
                ...prev,
                paymentForm: next,
                creditDays,
                numQuotas,
                payments: [],
                quotas: buildQuotas(baseDate, creditDays, numQuotas, totalPrice),
              };
            });
          }}
          options={paymentFormOptions}
          searchable={false}
        />

        {showCredit && (
          <div className="grid grid-cols-2 gap-3">
            <FloatingInput
              label="Dias de credito"
              name="credit-days"
              type="number"
              min={0}
              value={form.creditDays ?? 0}
              onChange={(e) => {
                const creditDays = Math.max(0, Number(e.target.value || 0));
                setForm((prev) => {
                  const baseDate = toDateInputValue(prev.dateIssue) || todayIso();
                  const nextNum = clampQuotas(creditDays, prev.numQuotas ?? 0);
                  return {
                    ...prev,
                    creditDays,
                    numQuotas: nextNum,
                    quotas: buildQuotas(baseDate, creditDays, nextNum, totalPrice),
                  };
                });
              }}
            />
            <FloatingInput
              label="Numero de cuotas"
              name="credit-quotas"
              type="number"
              min={0}
              value={form.numQuotas ?? 0}
              onChange={(e) => {
                const rawNum = Math.max(0, Number(e.target.value || 0));
                setForm((prev) => {
                  const creditDays = Math.max(0, prev.creditDays ?? 0);
                  const nextNum = clampQuotas(creditDays, rawNum);
                  const baseDate = toDateInputValue(prev.dateIssue) || todayIso();
                  return {
                    ...prev,
                    numQuotas: nextNum,
                    quotas: buildQuotas(baseDate, creditDays, nextNum, totalPrice),
                  };
                });
              }}
            />
          </div>
        )}

        {!showCredit && (
          <div className="rounded-3xl border border-black/10 bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <SectionHeaderForm icon={Wallet} title="Pagos" />
              <SystemButton
                leftIcon={<Plus className="h-4 w-4" />}
                style={{
                  backgroundColor: accent,
                  borderColor: `color-mix(in srgb, ${accent} 20%, transparent)`,
                }}
                onClick={() => addPayment(pendingAmount)}
              >
                Agregar
              </SystemButton>
            </div>

            {(form.payments ?? []).length === 0 && <div className="text-xs text-black/60">Aun no agregas pagos.</div>}

            {(form.payments ?? []).map((payment, index) => {
              const otherPaid = totalPaid - (payment.amount ?? 0);
              const maxForPayment = Math.max(0, totalPrice - otherPaid);
              return (
                <div key={`payment-${index}`} className="rounded-xl border border-black/10 p-3 space-y-2">
                  <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_50px] gap-2">
                    <FloatingSelect
                      label="Metodo"
                      name={`payment-method-${index}`}
                      value={payment.method}
                      onChange={(value) => updatePayment(index, { method: value as Payment["method"] })}
                      options={methodOptions}
                      searchable={false}
                      className="h-9 text-xs"
                    />
                    <FloatingInput
                      label="Fecha"
                      name={`payment-date-${index}`}
                      type="date"
                      value={toDateInputValue(payment.date)}
                      onClick={(e) => tryShowPicker(e.currentTarget)}
                      onChange={(e) => updatePayment(index, { date: e.target.value })}
                      className="h-9 text-xs"
                    />

                    <FloatingSelect
                      label="Moneda"
                      name={`payment-currency-${index}`}
                      value={payment.currency}
                      onChange={(value) => updatePayment(index, { currency: value as CurrencyType })}
                      options={currencyOptions}
                      searchable={false}
                      disabled
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
                        const next = normalizeMoney(parseDecimalInput(e.target.value ));
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
                  <div className="grid grid-cols-2 gap-2">
                    <FloatingInput
                      label="Numero de operacion"
                      name={`payment-operation-${index}`}
                      value={payment.operationNumber ?? ""}
                      onChange={(e) => updatePayment(index, { operationNumber: e.target.value })}
                      className="h-9 text-xs"
                    />
                    <FloatingInput
                      label="Nota"
                      name={`payment-note-${index}`}
                      value={payment.note ?? ""}
                      onChange={(e) => updatePayment(index, { note: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {showCredit && (
          <div className="rounded-3xl border border-black/10 bg-white p-4 space-y-3">
            <SectionHeaderForm icon={Calendar} title="Cuotas" />

            <DataTable
              tableId="purchase-quotas-editor"
              data={quotaRows}
              columns={quotaColumns}
              rowKey="id"
              emptyMessage="Aun no agregas cuotas."
              hoverable={false}
              animated={false}
              className="max-h-[230px] overflow-auto"
            />
          </div>
        )}

        <div className="rounded-xl border border-black/10 bg-black/[0.02] px-3 py-2 text-md font-semibold space-y-1">
          <div className="flex items-center justify-between">
            <span>Total pagado</span>
            <span className="font-semibold">{formatMoney(totalPaid, currency)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Pendiente</span>
            <span className="font-semibold">{formatMoney(pendingAmount, currency)}</span>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <SystemButton variant="outline" onClick={onClose}>
            Cerrar
          </SystemButton>
          <SystemButton
            style={{ backgroundColor: accent, borderColor: `color-mix(in srgb, ${accent} 20%, transparent)` }}
            disabled={saveDisabled}
            onClick={onSave}
          >
            {isEdit ? "Actualizar Comprobante" : "Generar Comprobante"}
          </SystemButton>
        </div>
      </div>
    </Modal>
  );
}


