import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Search, X } from "lucide-react";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { useCompany } from "@/shared/hooks/useCompany";
import { listSuppliers } from "@/shared/services/supplierService";
import { listUsers } from "@/shared/services/userService";
import { listActiveWarehouses } from "@/shared/services/warehouseServices";
import { getAllPaymentMethods } from "@/shared/services/paymentMethodService";
import { listCompanyPaymentAccountsByCompany } from "@/shared/services/companyPaymentAccountService";
import { getCompanyPaymentAccountDisplay } from "@/features/payments/paymentAccountView";
import type { PurchaseDashboardFilters as PurchaseDashboardFilterValue } from "@/features/purchases/types/purchase-dashboard.types";
import {
  DEFAULT_PURCHASE_DASHBOARD_LIMIT,
  PurchaseDashboardLimitSelect,
  type PurchaseDashboardLimit,
} from "./PurchaseDashboardLimitSelect";

type SelectOption = { value: string; label: string };

type Props = {
  value: PurchaseDashboardFilterValue;
  loading: boolean;
  onChange: (value: PurchaseDashboardFilterValue) => void;
  onApply: () => void;
  onClear: () => void;
};

const purchaseTypeOptions: SelectOption[] = [
  { value: "", label: "Todos los tipos" },
  { value: "INVENTORY", label: "Inventario" },
  { value: "RAW_MATERIAL", label: "Materia prima" },
  { value: "INTERNAL_MATERIAL", label: "Material interno" },
  { value: "FIXED_ASSET", label: "Activo fijo" },
  { value: "SERVICE", label: "Servicio" },
  { value: "SUBSCRIPTION", label: "Suscripción" },
  { value: "MIXED", label: "Mixta" },
];

const paymentStatusOptions: SelectOption[] = [
  { value: "", label: "Todos los pagos" },
  { value: "PENDING", label: "Pendiente" },
  { value: "PARTIAL", label: "Parcial" },
  { value: "PAID", label: "Pagado" },
  { value: "OVERDUE", label: "Vencido" },
  { value: "CANCELLED", label: "Cancelado" },
];

export function PurchaseDashboardFilters({ value, loading, onChange, onApply, onClear }: Props) {
  const { company } = useCompany();
  const [supplierOptions, setSupplierOptions] = useState<SelectOption[]>([]);
  const [userOptions, setUserOptions] = useState<SelectOption[]>([]);
  const [warehouseOptions, setWarehouseOptions] = useState<SelectOption[]>([]);
  const [paymentMethodOptions, setPaymentMethodOptions] = useState<SelectOption[]>([]);
  const [companyAccountOptions, setCompanyAccountOptions] = useState<SelectOption[]>([]);

  useEffect(() => {
    let alive = true;

    listSuppliers({ page: 1, limit: 100, isActive: "true" })
      .then((response) => {
        if (!alive) return;
        setSupplierOptions((response.items ?? []).map((supplier) => ({
          value: supplier.supplierId,
          label: supplierLabel(supplier),
        })));
      })
      .catch(() => {
        if (alive) setSupplierOptions([]);
      });

    listUsers({ status: "active", page: 1 })
      .then((response) => {
        if (!alive) return;
        setUserOptions((response.items ?? []).map((user) => ({
          value: user.id,
          label: user.email ? `${user.name} · ${user.email}` : user.name,
        })));
      })
      .catch(() => {
        if (alive) setUserOptions([]);
      });

    listActiveWarehouses({ page: 1, limit: 100 })
      .then((response) => {
        if (!alive) return;
        setWarehouseOptions((response.items ?? []).map((warehouse) => ({
          value: warehouse.warehouseId,
          label: warehouse.name,
        })));
      })
      .catch(() => {
        if (alive) setWarehouseOptions([]);
      });

    getAllPaymentMethods()
      .then((items) => {
        if (!alive) return;
        setPaymentMethodOptions((items ?? [])
          .filter((item) => item.isActive)
          .map((item) => ({ value: item.methodId, label: item.name })));
      })
      .catch(() => {
        if (alive) setPaymentMethodOptions([]);
      });

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!company?.companyId) {
      setCompanyAccountOptions([]);
      return;
    }

    let alive = true;
    listCompanyPaymentAccountsByCompany(company.companyId)
      .then((items) => {
        if (!alive) return;
        setCompanyAccountOptions((items ?? [])
          .filter((item) => item.isActive)
          .map((item) => ({ value: item.id, label: getCompanyPaymentAccountDisplay(item) })));
      })
      .catch(() => {
        if (alive) setCompanyAccountOptions([]);
      });

    return () => {
      alive = false;
    };
  }, [company?.companyId]);

  const supplierSelectOptions = useMemo(() => withAllOption("Todos los proveedores", supplierOptions), [supplierOptions]);
  const userSelectOptions = useMemo(() => withAllOption("Todos los usuarios", userOptions), [userOptions]);
  const warehouseSelectOptions = useMemo(() => withAllOption("Todos los almacenes", warehouseOptions), [warehouseOptions]);
  const paymentMethodSelectOptions = useMemo(
    () => withAllOption("Todos los métodos", paymentMethodOptions),
    [paymentMethodOptions],
  );
  const companyAccountSelectOptions = useMemo(
    () => withAllOption("Todas las cuentas", companyAccountOptions),
    [companyAccountOptions],
  );

  const update = (key: keyof PurchaseDashboardFilterValue, nextValue: string | number) => {
    onChange({
      ...value,
      [key]: nextValue || undefined,
    });
  };

  return (
    <section className="rounded-md border border-black/10 bg-white p-4" aria-label="Filtros del dashboard">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Field label="Desde">
          <input
            type="date"
            value={value.from ?? ""}
            onChange={(event) => update("from", event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Hasta">
          <input
            type="date"
            value={value.to ?? ""}
            onChange={(event) => update("to", event.target.value)}
            className={inputClass}
          />
        </Field>
        <FloatingSelect
          label="Tipo de compra"
          name="purchase-dashboard-purchase-type"
          value={value.purchaseType ?? ""}
          onChange={(next) => update("purchaseType", next)}
          options={purchaseTypeOptions}
        />
        <FloatingSelect
          label="Estado de pago"
          name="purchase-dashboard-payment-status"
          value={value.paymentStatus ?? ""}
          onChange={(next) => update("paymentStatus", next)}
          options={paymentStatusOptions}
        />
        <PurchaseDashboardLimitSelect
          value={value.limit ?? DEFAULT_PURCHASE_DASHBOARD_LIMIT}
          onChange={(next: PurchaseDashboardLimit) => update("limit", next)}
          disabled={loading}
        />
        <FloatingSelect
          label="Proveedor"
          name="purchase-dashboard-supplier"
          value={value.supplierId ?? ""}
          onChange={(next) => update("supplierId", next)}
          options={supplierSelectOptions}
          searchable
          searchPlaceholder="Buscar proveedor"
        />
        <FloatingSelect
          label="Usuario"
          name="purchase-dashboard-user"
          value={value.userId ?? ""}
          onChange={(next) => update("userId", next)}
          options={userSelectOptions}
          searchable
          searchPlaceholder="Buscar usuario"
        />
        <FloatingSelect
          label="Almacén"
          name="purchase-dashboard-warehouse"
          value={value.warehouseId ?? ""}
          onChange={(next) => update("warehouseId", next)}
          options={warehouseSelectOptions}
          searchable
          searchPlaceholder="Buscar almacén"
        />
        <FloatingSelect
          label="Método de pago"
          name="purchase-dashboard-payment-method"
          value={value.paymentMethodId ?? ""}
          onChange={(next) => update("paymentMethodId", next)}
          options={paymentMethodSelectOptions}
          searchable
          searchPlaceholder="Buscar método"
        />
        <FloatingSelect
          label="Cuenta o tarjeta"
          name="purchase-dashboard-company-account"
          value={value.companyPaymentAccountId ?? ""}
          onChange={(next) => update("companyPaymentAccountId", next)}
          options={companyAccountSelectOptions}
          searchable
          searchPlaceholder="Buscar cuenta"
          disabled={!company?.companyId}
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <SystemButton size="sm" leftIcon={<Search className="h-4 w-4" />} onClick={onApply} disabled={loading}>
          Aplicar filtros
        </SystemButton>
        <SystemButton size="sm" variant="outline" leftIcon={<X className="h-4 w-4" />} onClick={onClear} disabled={loading}>
          Limpiar
        </SystemButton>
      </div>
    </section>
  );
}

const inputClass =
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/30";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-medium text-black/65">{label}</span>
      {children}
    </label>
  );
}

function withAllOption(label: string, options: SelectOption[]) {
  return [{ value: "", label }, ...options];
}

function supplierLabel(supplier: { supplierId: string; name?: string | null; lastName?: string | null; tradeName?: string | null; documentNumber?: string | null }) {
  const fullName = [supplier.name, supplier.lastName].filter(Boolean).join(" ").trim();
  const display = (supplier.tradeName || fullName || supplier.supplierId).trim();
  return supplier.documentNumber ? `${display} (${supplier.documentNumber})` : display;
}
