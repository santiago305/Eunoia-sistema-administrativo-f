import { FormEvent, useState } from "react";
import { X } from "lucide-react";
import { SystemButton } from "@/shared/components/components/SystemButton";
import type { CreateRecurringPurchasePayload, RecurringFrequency } from "../../types/recurring-purchase.types";
import type { CurrencyType } from "../../types/purchaseEnums";

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateRecurringPurchasePayload) => Promise<void>;
};

type RecurringPurchaseFormState = {
  supplierId: string;
  name: string;
  description: string;
  frequency: RecurringFrequency;
  purchaseType: "SERVICE" | "SUBSCRIPTION";
  currency: CurrencyType;
  amount: string;
  startDate: string;
};

const today = () => new Date().toISOString().slice(0, 10);

export function RecurringPurchaseFormModal({ open, onClose, onSubmit }: Props) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<RecurringPurchaseFormState>({
    supplierId: "",
    name: "",
    description: "",
    frequency: "MONTHLY" as RecurringFrequency,
    purchaseType: "SUBSCRIPTION" as const,
    currency: "PEN" as CurrencyType,
    amount: "",
    startDate: today(),
  });

  if (!open) return null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSubmit({
        supplierId: form.supplierId.trim(),
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        frequency: form.frequency,
        purchaseType: form.purchaseType,
        currency: form.currency,
        amount: Number(form.amount),
        startDate: form.startDate,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form onSubmit={(event) => void submit(event)} className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-black/10 px-5 py-4">
          <h2 className="text-base font-semibold text-black">Nueva compra recurrente</h2>
          <button type="button" className="grid h-10 w-10 place-items-center rounded-md hover:bg-black/[0.04]" onClick={onClose} aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <label className="space-y-1 text-sm font-medium text-black">
            Proveedor
            <input required value={form.supplierId} onChange={(event) => setForm({ ...form, supplierId: event.target.value })} className="h-11 w-full rounded-md border border-black/15 px-3 text-sm font-normal outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10" />
          </label>
          <label className="space-y-1 text-sm font-medium text-black">
            Nombre
            <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="h-11 w-full rounded-md border border-black/15 px-3 text-sm font-normal outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10" />
          </label>
          <label className="space-y-1 text-sm font-medium text-black">
            Frecuencia
            <select value={form.frequency} onChange={(event) => setForm({ ...form, frequency: event.target.value as RecurringFrequency })} className="h-11 w-full rounded-md border border-black/15 px-3 text-sm font-normal outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10">
              <option value="MONTHLY">Mensual</option>
              <option value="ANNUAL">Anual</option>
            </select>
          </label>
          <label className="space-y-1 text-sm font-medium text-black">
            Tipo
            <select value={form.purchaseType} onChange={(event) => setForm({ ...form, purchaseType: event.target.value as "SERVICE" | "SUBSCRIPTION" })} className="h-11 w-full rounded-md border border-black/15 px-3 text-sm font-normal outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10">
              <option value="SUBSCRIPTION">Suscripcion</option>
              <option value="SERVICE">Servicio</option>
            </select>
          </label>
          <label className="space-y-1 text-sm font-medium text-black">
            Moneda
            <select value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value as CurrencyType })} className="h-11 w-full rounded-md border border-black/15 px-3 text-sm font-normal outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10">
              <option value="PEN">PEN</option>
              <option value="USD">USD</option>
            </select>
          </label>
          <label className="space-y-1 text-sm font-medium text-black">
            Monto
            <input required min="0.01" step="0.01" type="number" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} className="h-11 w-full rounded-md border border-black/15 px-3 text-sm font-normal outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10" />
          </label>
          <label className="space-y-1 text-sm font-medium text-black">
            Inicio
            <input required type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} className="h-11 w-full rounded-md border border-black/15 px-3 text-sm font-normal outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10" />
          </label>
          <label className="space-y-1 text-sm font-medium text-black sm:col-span-2">
            Descripcion
            <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={3} className="w-full rounded-md border border-black/15 px-3 py-2 text-sm font-normal outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10" />
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-black/10 px-5 py-4">
          <SystemButton type="button" variant="outline" onClick={onClose}>Cancelar</SystemButton>
          <SystemButton type="submit" disabled={saving}>{saving ? "Guardando..." : "Crear recurrente"}</SystemButton>
        </div>
      </form>
    </div>
  );
}
