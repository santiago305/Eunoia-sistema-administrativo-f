import type { CSSProperties, Dispatch, SetStateAction } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/settings/modal";
import { CurrencyType, CurrencyTypes, PaymentFormTypes, PaymentTypes } from "@/types/purchaseEnums";
import type { CreditQuota, Payment, PurchaseOrder } from "@/types/purchase";

const DEFAULT_PRIMARY = "#21b8a6";

const toDateInputValue = (value?: string | null) => {
  if (!value) return "";
  const match = value.match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : "";
};

const todayIso = () => new Date().toISOString().slice(0, 10);

const tryShowPicker = (input: HTMLInputElement) => {
  try {
    input.showPicker?.();
  } catch {
    // Ignore when the browser blocks programmatic picker opening.
  }
};

const clampQuotas = (creditDays: number, numQuotas: number) => {
  if (creditDays <= 0) return 0;
  const safeNum = Math.max(1, numQuotas);
  return Math.min(safeNum, creditDays);
};

const splitAmount = (total: number, parts: number) => {
  if (parts <= 0) return [];
  const totalCents = Math.round(total * 100);
  const base = Math.floor(totalCents / parts);
  const amounts = Array.from({ length: parts }, () => base);
  const remainder = totalCents - base * parts;
  if (remainder > 0) {
    amounts[parts - 1] += remainder;
  }
  return amounts.map((c) => Number((c / 100).toFixed(2)));
};

const addDaysToIsoDateFrom = (baseIso: string, days?: number | null) => {
  if (!baseIso) return "";
  if (days === null || days === undefined) return baseIso;
  const date = new Date(`${baseIso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const buildQuotas = (baseDateIso: string, creditDays: number, numQuotas: number, total: number): CreditQuota[] => {
  const safeNum = clampQuotas(creditDays, numQuotas);
  if (safeNum <= 0 || creditDays <= 0) return [];
  const amounts = splitAmount(total, safeNum);
  const quotas: CreditQuota[] = [];
  for (let i = 1; i <= safeNum; i += 1) {
    const dayOffset = i === safeNum ? creditDays : Math.floor((creditDays * i) / safeNum);
    quotas.push({
      number: i,
      expirationDate: addDaysToIsoDateFrom(baseDateIso, dayOffset),
      totalToPay: amounts[i - 1] ?? 0,
      totalPaid: 0,
    });
  }
  return quotas;
};

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
};

export function PurchasePaymentModal({
  open,
  onClose,
  form,
  setForm,
  totalPrice,
  ringStyle,
  primaryColor,
  currency,
  formatMoney,
  onSave,
  saveDisabled,
  title = "Agregar Pago",
  className = "max-w-[800px]",
}: PurchasePaymentModalProps) {
  if (!open) return null;

  const accent = primaryColor ?? DEFAULT_PRIMARY;
  const computedRingStyle = (ringStyle ?? ({ "--tw-ring-color": `${accent}33` } as CSSProperties)) as CSSProperties;

  const showCredit = form.paymentForm === PaymentFormTypes.CREDITO;
  const totalPaid = (form.payments ?? []).reduce((acc, p) => acc + (p.amount ?? 0), 0);
  const pendingAmount = Math.max(0, totalPrice - totalPaid);

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

  return (
    <Modal onClose={onClose} title={title} className={className}>
      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs text-black/60">Forma de pago</label>
          <select
            className="h-10 w-full appearance-none rounded-xl border border-black/10 bg-white px-3 text-sm outline-none focus:ring-2"
            style={computedRingStyle}
            value={form.paymentForm}
            onChange={(e) => {
              const next = e.target.value as PurchaseOrder["paymentForm"];
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
          >
            <option value={PaymentFormTypes.CONTADO}>Contado</option>
            <option value={PaymentFormTypes.CREDITO}>Credito</option>
          </select>
        </div>

        {showCredit && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-black/60">Dias de credito</label>
              <input
                type="number"
                min={0}
                className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none focus:ring-2"
                style={computedRingStyle}
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
            </div>
            <div className="space-y-1">
              <label className="text-xs text-black/60">Numero de cuotas</label>
              <input
                type="number"
                min={0}
                className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none focus:ring-2"
                style={computedRingStyle}
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
          </div>
        )}

        {!showCredit && (
          <div className="rounded-3xl border border-black/10 bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold">Pagos</p>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs text-white focus:outline-none focus:ring-2"
                style={{ backgroundColor: accent, borderColor: `${accent}33` }}
                onClick={() => addPayment(pendingAmount)}
              >
                <Plus className="h-4 w-4" />
                Agregar
              </button>
            </div>

            {(form.payments ?? []).length === 0 && <div className="text-xs text-black/60">Aun no agregas pagos.</div>}

            {(form.payments ?? []).map((payment, index) => {
              const otherPaid = totalPaid - (payment.amount ?? 0);
              const maxForPayment = Math.max(0, totalPrice - otherPaid);
              return (
                <div key={`payment-${index}`} className="rounded-xl border border-black/10 p-3 space-y-2">
                  <div className="grid grid-cols-[1fr_1fr_1fr_1fr_50px] gap-2">
                    <select
                      className="h-10 w-full appearance-none rounded-xl border border-black/10 bg-white px-3 text-xs outline-none focus:ring-2"
                      style={computedRingStyle}
                      value={payment.method}
                      onChange={(e) => updatePayment(index, { method: e.target.value as Payment["method"] })}
                    >
                      {Object.values(PaymentTypes).map((method) => (
                        <option key={method} value={method}>
                          {method}
                        </option>
                      ))}
                    </select>
                    <input
                      type="date"
                      className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-xs outline-none focus:ring-2"
                      style={computedRingStyle}
                      value={toDateInputValue(payment.date)}
                      onClick={(e) => tryShowPicker(e.currentTarget)}
                      onChange={(e) => updatePayment(index, { date: e.target.value })}
                    />

                    <select
                      className="h-10 w-full appearance-none rounded-xl border border-black/10 bg-white px-3 text-xs outline-none focus:ring-2"
                      style={computedRingStyle}
                      value={payment.currency}
                      onChange={(e) => updatePayment(index, { currency: e.target.value as CurrencyType })}
                    >
                      <option value={CurrencyTypes.PEN}>PEN (S/)</option>
                      <option value={CurrencyTypes.USD}>USD ($)</option>
                    </select>
                    <input
                      type="number"
                      min={0}
                      max={maxForPayment}
                      className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-xs outline-none focus:ring-2"
                      style={computedRingStyle}
                      value={payment.amount}
                      onChange={(e) => {
                        const next = Number(e.target.value || 0);
                        updatePayment(index, { amount: Math.min(Math.max(0, next), maxForPayment) });
                      }}
                      placeholder="Monto"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-xl border border-black/10 px-3 py-2 text-xs text-rose-600"
                        onClick={() => removePayment(index)}
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-xs outline-none focus:ring-2"
                      style={computedRingStyle}
                      value={payment.note ?? ""}
                      onChange={(e) => updatePayment(index, { note: e.target.value })}
                      placeholder="Número de operación"
                    />
                    <input
                      className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-xs outline-none focus:ring-2"
                      style={computedRingStyle}
                      value={payment.note ?? ""}
                      onChange={(e) => updatePayment(index, { note: e.target.value })}
                      placeholder="Nota"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {showCredit && (
          <div className="rounded-3xl border border-black/10 bg-white p-4 space-y-3">
            {(form.quotas ?? []).length === 0 && <div className="text-xs text-black/60">Aun no agregas cuotas.</div>}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-white">
                  <tr className="border-b border-black/10 text-xs text-black/60">
                    <th className="py-3 px-5 text-left">Fecha de pago</th>
                    <th className="py-3 px-5 text-left">Total a pagar</th>
                    <th className="py-3 px-5 text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {(form.quotas ?? []).map((quota, index) => (
                    <tr key={`quota-${index}`}>
                      <td className="py-2 px-5">
                        <input
                          type="date"
                          className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-xs outline-none focus:ring-2"
                          style={computedRingStyle}
                          value={toDateInputValue(quota.expirationDate)}
                          onClick={(e) => tryShowPicker(e.currentTarget)}
                          onChange={(e) => updateQuota(index, { expirationDate: e.target.value })}
                        />
                      </td>
                      <td className="py-2 px-5">
                        <input
                          type="number"
                          min={0}
                          className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-xs outline-none focus:ring-2"
                          style={computedRingStyle}
                          value={quota.totalToPay}
                          onChange={(e) => updateQuota(index, { totalToPay: Number(e.target.value || 0) })}
                          placeholder="Total a pagar"
                        />
                      </td>
                      <td className="py-2 px-5">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-xl border border-black/10 px-3 py-2 text-xs text-rose-600"
                            onClick={() => removeQuota(index)}
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
          <button className="rounded-xl border border-black/10 px-4 py-2 text-sm" onClick={onClose}>
            Cerrar
          </button>
          <button
            type="button"
            className="rounded-xl border px-4 py-2 text-sm text-white disabled:opacity-40"
            style={{ backgroundColor: accent, borderColor: `${accent}33` }}
            disabled={saveDisabled}
            onClick={onSave}
          >
            Generar Comprobante
          </button>
        </div>
      </div>
    </Modal>
  );
}
