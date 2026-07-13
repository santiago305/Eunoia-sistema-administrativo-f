import { useCallback, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { PageShell } from "@/shared/layouts/PageShell";
import { DataTableSearchBar } from "@/shared/components/table/search";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { PageActionsRow } from "@/shared/components/components/PageActionsRow";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { usePaymentMethods } from "@/shared/hooks/usePaymentMethods";
import { usePermissions } from "@/shared/hooks/usePermissions";
import type { PaymentMethod } from "./types/paymentMethod";
import { PaymentMethodFormModal } from "./components/PaymentMethodFormModal";
import { PaymentMethodsTable } from "./components/PaymentMethodsTable";

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";
type VoucherFilter = "ALL" | "REQUIRED" | "NOT_REQUIRED";

const statusFilterOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: "ALL", label: "Todos los estados" },
  { value: "ACTIVE", label: "Activos" },
  { value: "INACTIVE", label: "Inactivos" },
];

const voucherFilterOptions: Array<{ value: VoucherFilter; label: string }> = [
  { value: "ALL", label: "Todos" },
  { value: "REQUIRED", label: "Voucher obligatorio" },
  { value: "NOT_REQUIRED", label: "Sin voucher obligatorio" },
];

const normalize = (value: unknown) => String(value ?? "").trim().toLowerCase();
const primaryColor = "var(--primary, #111827)";

export default function PaymentMethodsPage() {
  const { can } = usePermissions();
  const canRead = can("payment-methods.read");
  const canManage = can("payment-methods.manage");
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [voucherFilter, setVoucherFilter] = useState<VoucherFilter>("ALL");
  const [formOpen, setFormOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [busyMethodId, setBusyMethodId] = useState<string | null>(null);

  const { items, loading, error, refresh, setActive } = usePaymentMethods({
    page: 1,
    limit: 100,
    name: searchText,
  });

  const filteredItems = useMemo(() => {
    const query = normalize(searchText);

    return items.filter((method) => {
      if (statusFilter === "ACTIVE" && !method.isActive) return false;
      if (statusFilter === "INACTIVE" && method.isActive) return false;
      if (voucherFilter === "REQUIRED" && !method.requiresVoucher) return false;
      if (voucherFilter === "NOT_REQUIRED" && method.requiresVoucher) return false;
      if (!query) return true;

      const searchableText = [
        method.name,
        method.isActive ? "activo" : "inactivo",
        method.requiresVoucher ? "voucher obligatorio" : "sin voucher",
      ].map(normalize).join(" ");

      return searchableText.includes(query);
    });
  }, [items, searchText, statusFilter, voucherFilter]);

  const closeForm = useCallback(() => {
    setFormOpen(false);
    setEditingMethod(null);
  }, []);

  const handleEdit = useCallback((method: PaymentMethod) => {
    setEditingMethod(method);
    setFormOpen(true);
  }, []);

  const handleToggleActive = useCallback(async (method: PaymentMethod) => {
    if (busyMethodId || !canManage) return;
    setBusyMethodId(method.methodId);
    try {
      await setActive(method.methodId, !method.isActive);
    } finally {
      setBusyMethodId(null);
    }
  }, [busyMethodId, canManage, setActive]);

  const toolbarSearchContent = (
    <DataTableSearchBar
      value={searchText}
      onChange={setSearchText}
      onSubmitSearch={() => undefined}
      searchLabel="Buscar metodos de pago"
      searchName="payment-methods-search"
      helperText="Busca por nombre, estado o regla de voucher."
    >
      <div className="space-y-3">
        <FloatingSelect
          label="Estado"
          name="payment-method-status-filter"
          value={statusFilter}
          options={statusFilterOptions}
          onChange={(value) => setStatusFilter(value as StatusFilter)}
        />
        <FloatingSelect
          label="Voucher"
          name="payment-method-voucher-filter"
          value={voucherFilter}
          options={voucherFilterOptions}
          onChange={(value) => setVoucherFilter(value as VoucherFilter)}
        />
      </div>
    </DataTableSearchBar>
  );

  if (!canRead) {
    return (
      <PageShell>
        <div className="rounded-sm border border-border/70 bg-background px-4 py-6 text-sm text-muted-foreground">
          No tienes permiso para ver metodos de pago.
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageActionsRow>
        {canManage ? (
          <SystemButton
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => {
              setEditingMethod(null);
              setFormOpen(true);
            }}
          >
            Nuevo metodo
          </SystemButton>
        ) : null}
      </PageActionsRow>

      {error ? (
        <div className="mb-3 rounded-sm border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </div>
      ) : null}

      <PaymentMethodsTable
        methods={filteredItems}
        loading={loading}
        canManage={canManage}
        busyMethodId={busyMethodId}
        toolbarSearchContent={toolbarSearchContent}
        onEdit={handleEdit}
        onToggleActive={handleToggleActive}
      />

      <PaymentMethodFormModal
        open={formOpen}
        mode={editingMethod ? "edit" : "create"}
        paymentMethodId={editingMethod?.methodId ?? null}
        canManage={canManage}
        primaryColor={primaryColor}
        entityLabel="metodo"
        onClose={closeForm}
        onSaved={refresh}
      />
    </PageShell>
  );
}
