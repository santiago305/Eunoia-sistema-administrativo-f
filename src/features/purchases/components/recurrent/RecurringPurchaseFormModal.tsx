import { FormEvent, useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { FloatingTextarea } from "@/shared/components/components/FloatingTextarea";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { Modal } from "@/shared/components/modales/Modal";
import { SupplierFormModal } from "@/features/providers/components/SupplierFormModal";
import { listSuppliers } from "@/shared/services/supplierService";
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

type SupplierSelectOption = {
  value: string;
  label: string;
};

const today = () => new Date().toISOString().slice(0, 10);

const frequencyOptions = [
  { value: "MONTHLY", label: "Mensual" },
  { value: "ANNUAL", label: "Anual" },
];

const purchaseTypeOptions = [
  { value: "SUBSCRIPTION", label: "Suscripcion" },
  { value: "SERVICE", label: "Servicio" },
];

const currencyOptions = [
  { value: "PEN", label: "PEN" },
  { value: "USD", label: "USD" },
];

export function RecurringPurchaseFormModal({ open, onClose, onSubmit }: Props) {
  const [saving, setSaving] = useState(false);
  const [supplierOptions, setSupplierOptions] = useState<SupplierSelectOption[]>([]);
  const [supplierQuery, setSupplierQuery] = useState("");
  const [openCreateSupplier, setOpenCreateSupplier] = useState(false);
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

  const loadSuppliers = useCallback(async (query = "") => {
    try {
      const response = await listSuppliers({
        page: 1,
        limit: 100,
        q: query.trim() || undefined,
      });

      setSupplierOptions(
        (response.items ?? []).map((supplier) => {
          const fullName = [supplier.name, supplier.lastName].filter(Boolean).join(" ").trim();
          const display = (fullName || supplier.tradeName || "").trim();
          const document = supplier.documentNumber ? ` (${supplier.documentNumber})` : "";

          return {
            value: supplier.supplierId,
            label: `${display}${document}`.trim() || supplier.supplierId,
          };
        }),
      );
    } catch {
      setSupplierOptions([]);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void loadSuppliers(supplierQuery);
  }, [loadSuppliers, open, supplierQuery]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.supplierId.trim()) return;

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
    <Modal
      open={open}
      onClose={onClose}
      title="Nueva compra recurrente"
      className="w-full max-w-2xl"
      bodyClassName="p-0"
      footer={
        <div className="flex justify-end gap-2">
          <SystemButton type="button" variant="outline" onClick={onClose}>
            Cancelar
          </SystemButton>
          <SystemButton type="submit" form="recurring-purchase-form" disabled={saving}>
            {saving ? "Guardando..." : "Crear recurrente"}
          </SystemButton>
        </div>
      }
    >
      <form id="recurring-purchase-form" onSubmit={(event) => void submit(event)}>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <FloatingSelect
              label="Proveedor"
              name="supplierId"
              value={form.supplierId}
              options={supplierOptions}
              onChange={(value) => setForm({ ...form, supplierId: value })}
              searchable
              searchPlaceholder="Buscar proveedor..."
              emptyMessage="Sin proveedores"
              onSearchChange={setSupplierQuery}
            />
            <SystemButton
              type="button"
              size="icon"
              className="h-10 w-10"
              title="Agregar proveedor"
              onClick={() => setOpenCreateSupplier(true)}
            >
              <Plus className="h-4 w-4" />
            </SystemButton>
          </div>
          <FloatingInput
            required
            label="Nombre"
            name="name"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
          <FloatingSelect
            label="Frecuencia"
            name="frequency"
            value={form.frequency}
            options={frequencyOptions}
            onChange={(value) => setForm({ ...form, frequency: value as RecurringFrequency })}
          />
          <FloatingSelect
            label="Tipo"
            name="purchaseType"
            value={form.purchaseType}
            options={purchaseTypeOptions}
            onChange={(value) => setForm({ ...form, purchaseType: value as "SERVICE" | "SUBSCRIPTION" })}
          />
          <FloatingSelect
            label="Moneda"
            name="currency"
            value={form.currency}
            options={currencyOptions}
            onChange={(value) => setForm({ ...form, currency: value as CurrencyType })}
          />
          <FloatingInput
            required
            min="0.01"
            step="0.01"
            type="number"
            label="Monto"
            name="amount"
            value={form.amount}
            onChange={(event) => setForm({ ...form, amount: event.target.value })}
          />
          <FloatingInput
            required
            type="date"
            label="Inicio"
            name="startDate"
            value={form.startDate}
            onChange={(event) => setForm({ ...form, startDate: event.target.value })}
          />
          <div className="sm:col-span-2">
            <FloatingTextarea
              label="Descripcion"
              name="description"
              value={form.description}
              rows={3}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </div>
        </div>
      </form>
      <SupplierFormModal
        open={openCreateSupplier}
        mode="create"
        onClose={() => setOpenCreateSupplier(false)}
        onSaved={() => {
          void loadSuppliers(supplierQuery);
        }}
      />
    </Modal>
  );
}
