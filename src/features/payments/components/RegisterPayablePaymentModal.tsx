import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { createPayment } from "@/shared/services/paymentService";
import { getAllPaymentMethods } from "@/shared/services/paymentMethodService";
import type { PaymentMethod } from "@/features/payment-methods/types/paymentMethod";
import { getPaymentMethodOptions } from "@/features/payments/paymentView";
import type { AccountPayable } from "../types/payable.types";

type Props = {
  payable: AccountPayable | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
};

const today = () => new Date().toISOString().slice(0, 10);

export function RegisterPayablePaymentModal({ payable, open, onClose, onSaved }: Props) {
  const [methodRecords, setMethodRecords] = useState<PaymentMethod[] | null>(null);
  const [method, setMethod] = useState("");
  const [date, setDate] = useState(today());
  const [amount, setAmount] = useState("");
  const [operationNumber, setOperationNumber] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    getAllPaymentMethods().then(setMethodRecords).catch(() => setMethodRecords(null));
  }, [open]);

  const methodOptions = useMemo(() => getPaymentMethodOptions(methodRecords), [methodRecords]);

  useEffect(() => {
    if (!open || !payable) return;
    setAmount(String(payable.amountPending ?? ""));
    setDate(today());
    setOperationNumber("");
    setNote("");
    setMethod((prev) => prev || methodOptions[0]?.value || "");
  }, [methodOptions, open, payable]);

  if (!open || !payable) return null;

  const handleSubmit = async () => {
    const numericAmount = Number(amount);
    if (!method || !Number.isFinite(numericAmount) || numericAmount <= 0) return;
    setSaving(true);
    try {
      await createPayment({
        method,
        date,
        operationNumber: operationNumber.trim() || undefined,
        currency: payable.currency,
        amount: numericAmount,
        note: note.trim() || undefined,
        poId: payable.purchaseId,
        quotaId: payable.quotaId ?? undefined,
        accountPayableId: payable.accountPayableId,
      });
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-black">Registrar pago</h2>
            <p className="text-xs text-black/60">{payable.description ?? payable.accountPayableId}</p>
          </div>
          <SystemButton variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar">
            <X className="h-4 w-4" />
          </SystemButton>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-medium text-black/70">
            Metodo
            <select
              value={method}
              onChange={(event) => setMethod(event.target.value)}
              className="h-10 rounded-lg border border-black/15 bg-white px-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
            >
              {methodOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-black/70">
            Fecha
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="h-10 rounded-lg border border-black/15 px-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-black/70">
            Monto
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="h-10 rounded-lg border border-black/15 px-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-black/70">
            Operacion
            <input
              value={operationNumber}
              onChange={(event) => setOperationNumber(event.target.value)}
              className="h-10 rounded-lg border border-black/15 px-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
            />
          </label>
          <label className="sm:col-span-2 flex flex-col gap-1 text-xs font-medium text-black/70">
            Nota
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="min-h-20 rounded-lg border border-black/15 px-3 py-2 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
            />
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <SystemButton variant="ghost" onClick={onClose}>Cancelar</SystemButton>
          <SystemButton onClick={() => void handleSubmit()} loading={saving}>Guardar</SystemButton>
        </div>
      </div>
    </div>
  );
}

