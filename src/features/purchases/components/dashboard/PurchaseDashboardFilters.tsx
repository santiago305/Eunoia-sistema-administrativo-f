import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Search, SlidersHorizontal, X } from "lucide-react";
import { FloatingDateRangePicker } from "@/shared/components/components/date-picker/FloatingDateRangePicker";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { parseStoredDate, toLocalDateKey } from "@/shared/components/table/search/smartSearchUtils";
import { useCompany } from "@/shared/hooks/useCompany";
import { listSuppliers } from "@/shared/services/supplierService";
import { listUsers } from "@/shared/services/userService";
import { listActiveWarehouses } from "@/shared/services/warehouseServices";
import { getAllPaymentMethods } from "@/shared/services/paymentMethodService";
import { listCompanyPaymentAccountsByCompany } from "@/shared/services/companyPaymentAccountService";
import { getCompanyPaymentAccountDisplay } from "@/features/payments/paymentAccountView";
import type {
  DataTableSavedSearchItem,
} from "@/shared/components/table/search";
import type {
  PurchaseDashboardFilterField,
  PurchaseDashboardFilters as PurchaseDashboardFilterValue,
  PurchaseDashboardSavedFilterCatalogs,
  PurchaseDashboardSavedFilterRule,
  PurchaseDashboardSavedFilterSnapshot,
} from "@/features/purchases/types/purchase-dashboard.types";
import { PurchaseDashboardSmartFilterPanel } from "@/features/purchases/components/dashboard/PurchaseDashboardSmartFilterPanel";
import {
  buildPurchaseDashboardFilterLabel,
  dashboardFiltersToSnapshot,
  hasPurchaseDashboardFilterCriteria,
  sanitizePurchaseDashboardFilterSnapshot,
  snapshotToDashboardFilters,
} from "@/features/purchases/utils/purchaseDashboardSmartFilters";

type SelectOption = { value: string; label: string };

type Props = {
  value: PurchaseDashboardFilterValue;
  loading: boolean;
  savedMetrics?: DataTableSavedSearchItem<PurchaseDashboardSavedFilterSnapshot>[];
  canSaveMetric?: boolean;
  saveLoading?: boolean;
  onChange: (value: PurchaseDashboardFilterValue) => void;
  onRefresh?: () => void;
  onApply: () => void;
  onClear: () => void;
  onApplySavedSnapshot?: (snapshot: PurchaseDashboardSavedFilterSnapshot) => void;
  onSaveMetric?: () => void;
  onDeleteMetric?: (metricId: string) => void;
};

const purchaseTypeOptions: SelectOption[] = [
  { value: "INVENTORY", label: "Inventario" },
  { value: "RAW_MATERIAL", label: "Materia prima" },
  { value: "INTERNAL_MATERIAL", label: "Material interno" },
  { value: "FIXED_ASSET", label: "Activo fijo" },
  { value: "SERVICE", label: "Servicio" },
  { value: "SUBSCRIPTION", label: "Suscripción" },
  { value: "MIXED", label: "Mixta" },
];

const paymentStatusOptions: SelectOption[] = [
  { value: "PENDING", label: "Pendiente" },
  { value: "PARTIAL", label: "Parcial" },
  { value: "PAID", label: "Pagado" },
  { value: "OVERDUE", label: "Vencido" },
  { value: "CANCELLED", label: "Cancelado" },
];

export function PurchaseDashboardFilters({
  value,
  loading,
  savedMetrics = [],
  canSaveMetric = false,
  saveLoading = false,
  onChange,
  onRefresh,
  onApply,
  onClear,
  onApplySavedSnapshot,
  onSaveMetric,
  onDeleteMetric,
}: Props) {
  const { company } = useCompany();
  const [supplierOptions, setSupplierOptions] = useState<SelectOption[]>([]);
  const [userOptions, setUserOptions] = useState<SelectOption[]>([]);
  const [warehouseOptions, setWarehouseOptions] = useState<SelectOption[]>([]);
  const [paymentMethodOptions, setPaymentMethodOptions] = useState<SelectOption[]>([]);
  const [companyAccountOptions, setCompanyAccountOptions] = useState<SelectOption[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);

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

  const catalogs = useMemo<PurchaseDashboardSavedFilterCatalogs>(() => ({
    purchaseTypes: toSearchOptions(purchaseTypeOptions),
    paymentStatuses: toSearchOptions(paymentStatusOptions),
    suppliers: toSearchOptions(supplierOptions),
    users: toSearchOptions(userOptions),
    warehouses: toSearchOptions(warehouseOptions),
    paymentMethods: toSearchOptions(paymentMethodOptions),
    companyPaymentAccounts: toSearchOptions(companyAccountOptions),
  }), [
    companyAccountOptions,
    paymentMethodOptions,
    supplierOptions,
    userOptions,
    warehouseOptions,
  ]);

  const snapshot = useMemo(() => dashboardFiltersToSnapshot(value), [value]);
  const hasActiveFilters = hasPurchaseDashboardFilterCriteria(snapshot);
  const activeFilterLabel = useMemo(
    () => buildPurchaseDashboardFilterLabel(snapshot, catalogs),
    [catalogs, snapshot],
  );

  const updateDateRange = (range: { startDate: Date | null; endDate: Date | null }) => {
    const { from: _from, to: _to, ...rest } = value;
    const from = range.startDate ? toLocalDateKey(range.startDate) : undefined;
    const to = range.endDate ? toLocalDateKey(range.endDate) : undefined;

    onChange({
      ...rest,
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    });
  };

  const applyDraftSnapshot = (nextSnapshot: PurchaseDashboardSavedFilterSnapshot) => {
    onChange(withPreservedLimit(value, snapshotToDashboardFilters(nextSnapshot)));
  };

  const applySavedSnapshot = (nextSnapshot: PurchaseDashboardSavedFilterSnapshot) => {
    if (onApplySavedSnapshot) {
      onApplySavedSnapshot(nextSnapshot);
      return;
    }

    applyDraftSnapshot(nextSnapshot);
  };

  const applyRule = (rule: PurchaseDashboardSavedFilterRule) => {
    const nextSnapshot = sanitizePurchaseDashboardFilterSnapshot({
      ...snapshot,
      filters: [
        ...snapshot.filters.filter((currentRule) => currentRule.field !== rule.field),
        rule,
      ],
    });

    applyDraftSnapshot(nextSnapshot);
  };

  const removeRule = (fieldId: PurchaseDashboardFilterField) => {
    const nextSnapshot = sanitizePurchaseDashboardFilterSnapshot({
      ...snapshot,
      filters: snapshot.filters.filter((rule) => rule.field !== fieldId),
    });

    applyDraftSnapshot(nextSnapshot);
  };

  const handleApply = () => {
    onApply();
    setFiltersOpen(false);
  };

  const handleClear = () => {
    onClear();
    setFiltersOpen(false);
  };

  return (
    <section className="flex flex-nowrap items-center gap-2" aria-label="Filtros del dashboard">
      {onRefresh ? (
        <SystemButton
          size="icon"
          variant="outline"
          className="shrink-0 border-border bg-background text-foreground hover:bg-black/[0.03] focus-visible:ring-primary/20"
          aria-label="Actualizar dashboard de compras"
          title="Actualizar dashboard de compras"
          onClick={onRefresh}
          disabled={loading}
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
        </SystemButton>
      ) : null}

      <FloatingDateRangePicker
        label="Desde / Hasta"
        name="purchase-dashboard-date-range"
        startDate={parseStoredDate(value.from)}
        endDate={parseStoredDate(value.to)}
        onChange={updateDateRange}
        disabled={loading}
        iconOnly
        containerClassName="w-10 shrink-0"
      />
      <div className="relative">
        <SystemButton
          size="icon"
          variant="outline"
          aria-label="Filtros del dashboard de compras"
          title="Filtros del dashboard de compras"
          onClick={() => setFiltersOpen((current) => !current)}
          disabled={loading}
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
        </SystemButton>

        {filtersOpen ? (
          <div className="absolute left-0 top-full z-30 mt-2 w-[min(28rem,calc(100vw-2rem))] rounded-md border border-black/10 bg-white p-3 shadow-lg">
            <PurchaseDashboardSmartFilterPanel
              snapshot={snapshot}
              saved={savedMetrics}
              catalogs={catalogs}
              onApplySnapshot={applySavedSnapshot}
              onApplyRule={applyRule}
              onRemoveRule={removeRule}
              onDeleteMetric={onDeleteMetric}
            />
            <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-black/10 pt-3">
              <SystemButton size="sm" leftIcon={<Search className="h-4 w-4" />} onClick={handleApply} disabled={loading}>
                Aplicar filtros
              </SystemButton>
              {onSaveMetric ? (
                <SystemButton
                  size="sm"
                  variant="outline"
                  onClick={onSaveMetric}
                  disabled={loading || saveLoading || !canSaveMetric}
                >
                  {saveLoading ? "Guardando..." : "Guardar filtro"}
                </SystemButton>
              ) : null}
              <SystemButton size="sm" variant="outline" leftIcon={<X className="h-4 w-4" />} onClick={handleClear} disabled={loading}>
                Limpiar
              </SystemButton>
            </div>
          </div>
        ) : null}
      </div>

      {hasActiveFilters ? (
        <span className="min-w-0 max-w-full truncate rounded-md border border-black/10 px-3 py-2 text-xs text-black/65">
          {activeFilterLabel}
        </span>
      ) : null}
    </section>
  );
}

function toSearchOptions(options: SelectOption[]) {
  return options.map((option) => ({ id: option.value, label: option.label }));
}

function withPreservedLimit(
  current: PurchaseDashboardFilterValue,
  next: PurchaseDashboardFilterValue,
) {
  return {
    ...(current.limit ? { limit: current.limit } : {}),
    ...next,
  };
}

function supplierLabel(supplier: { supplierId: string; name?: string | null; lastName?: string | null; tradeName?: string | null; documentNumber?: string | null }) {
  const fullName = [supplier.name, supplier.lastName].filter(Boolean).join(" ").trim();
  const display = (supplier.tradeName || fullName || supplier.supplierId).trim();
  return supplier.documentNumber ? `${display} (${supplier.documentNumber})` : display;
}
