import { useCallback, useEffect, useMemo, useState, type MouseEvent } from "react";
import { Menu, Pencil, Plus, Timer, Trash2 } from "lucide-react";
import { PageTitle } from "@/components/PageTitle";
import { AlertModal } from "@/components/AlertModal";
import { ActionsPopover } from "@/components/ActionsPopover";
import { Headed } from "@/components/Headed";
import { PageShell } from "@/components/layout/PageShell";
import { StatusPill } from "@/components/StatusTag";
import { DataTable } from "@/components/table/DataTable";
import type { DataTableColumn } from "@/components/table/types";
import {
  DataTableSearchBar,
  DataTableSearchChips,
  type DataTableRecentSearchItem,
  type DataTableSavedSearchItem,
} from "@/components/table/search";
import { IconPaymentMethod } from "@/components/dashboard/icons";
import { SystemButton } from "@/components/SystemButton";
import { errorResponse, successResponse } from "@/common/utils/response";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { useCompany } from "@/hooks/useCompany";
import { ProviderMethodListModal } from "./components/ProviderMethodListModal";
import { ProviderSmartSearchPanel } from "./components/ProviderSmartSearchPanel";
import { SupplierFormModal } from "./components/SupplierFormModal";
import type {
  ProviderSearchFilters,
  ProviderSearchRule,
  ProviderSearchSnapshot,
  ProviderSearchStateResponse,
  Supplier,
} from "@/pages/providers/types/supplier";
import {
  deleteProviderSearchMetric,
  getProviderSearchState,
  listSuppliers,
  saveProviderSearchMetric,
  updateSupplierActive,
} from "@/services/supplierService";
import {
  buildProviderSearchChips,
  buildProviderSmartSearchColumns,
  createEmptyProviderSearchFilters,
  hasProviderSearchCriteria,
  removeProviderSearchKey,
  sanitizeProviderSearchSnapshot,
  upsertProviderSearchRule,
  type ProviderSearchFilterKey,
} from "@/pages/providers/utils/providerSmartSearch";

const PRIMARY = "hsl(var(--primary))";
const DEFAULT_LIMIT = 10;

export default function Providers() {
  const { showFlash, clearFlash } = useFlashMessage();
  const { hasCompany } = useCompany();
  const companyActionDisabled = !hasCompany;
  const companyActionTitle = hasCompany ? undefined : "Primero registra la empresa.";

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchState, setSearchState] = useState<ProviderSearchStateResponse | null>(null);
  const [savingMetric, setSavingMetric] = useState(false);

  const [serverPagination, setServerPagination] = useState({
    total: 0,
    page: 1,
    limit: DEFAULT_LIMIT,
    totalPages: 1,
    hasPrev: false,
    hasNext: false,
  });

  const [paginationState, setPaginationState] = useState({
    pageIndex: 0,
    pageSize: DEFAULT_LIMIT,
  });
  const [searchText, setSearchText] = useState("");
  const [appliedSearchText, setAppliedSearchText] = useState("");
  const [searchFilters, setSearchFilters] = useState<ProviderSearchFilters>(() =>
    createEmptyProviderSearchFilters(),
  );

  const [openCreate, setOpenCreate] = useState(false);
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
  const [toggleSupplierId, setToggleSupplierId] = useState<string | null>(null);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [methodSupplierId, setMethodSupplierId] = useState<string | null>(null);

  const page = paginationState.pageIndex + 1;

  const draftSnapshot = useMemo(
    () =>
      sanitizeProviderSearchSnapshot({
        q: searchText,
        filters: searchFilters,
      }),
    [searchFilters, searchText],
  );

  const executedSnapshot = useMemo(
    () =>
      sanitizeProviderSearchSnapshot({
        q: appliedSearchText,
        filters: searchFilters,
      }),
    [appliedSearchText, searchFilters],
  );

  const loadSearchState = useCallback(async () => {
    try {
      const response = await getProviderSearchState();
      setSearchState(response);
    } catch {
      showFlash(errorResponse("Error al cargar el estado del buscador inteligente"));
    }
  }, [showFlash]);

  const submitSearch = useCallback(() => {
    setAppliedSearchText(searchText.trim());
    setPaginationState((prev) => ({
      ...prev,
      pageIndex: 0,
    }));
  }, [searchText]);

  const getSupplierDisplayName = useCallback((supplier: Supplier) => {
    const fullName = [supplier.name, supplier.lastName].filter(Boolean).join(" ").trim();
    return fullName || supplier.tradeName || "-";
  }, []);

  const loadSuppliers = useCallback(async () => {
    clearFlash();
    setLoading(true);

    try {
      const res = await listSuppliers({
        page,
        limit: paginationState.pageSize,
        q: executedSnapshot.q,
        filters: executedSnapshot.filters.length ? executedSnapshot.filters : undefined,
      });

      const items = res.items ?? [];
      const nextTotal = res.total ?? 0;
      const nextPage = res.page ?? page;
      const nextLimit = res.limit ?? paginationState.pageSize;
      const nextTotalPages = Math.max(1, Math.ceil(nextTotal / nextLimit));

      setSuppliers(items);
      setServerPagination({
        total: nextTotal,
        page: nextPage,
        limit: nextLimit,
        totalPages: nextTotalPages,
        hasPrev: nextPage > 1,
        hasNext: nextPage < nextTotalPages,
      });

      if (hasProviderSearchCriteria(executedSnapshot)) {
        void loadSearchState();
      }
    } catch {
      setSuppliers([]);
      setServerPagination({
        total: 0,
        page: 1,
        limit: paginationState.pageSize,
        totalPages: 1,
        hasPrev: false,
        hasNext: false,
      });
      showFlash(errorResponse("Error al listar proveedores"));
    } finally {
      setLoading(false);
    }
  }, [clearFlash, executedSnapshot, loadSearchState, page, paginationState.pageSize, showFlash]);

  useEffect(() => {
    void loadSuppliers();
  }, [loadSuppliers]);

  useEffect(() => {
    void loadSearchState();
  }, [loadSearchState]);

  const startCreate = useCallback(() => {
    setEditingSupplierId(null);
    setOpenCreate(true);
  }, []);

  const openEdit = useCallback((supplierId: string) => {
    setOpenCreate(false);
    setEditingSupplierId(supplierId);
  }, []);

  const supplierPendingToggle = useMemo(
    () =>
      toggleSupplierId
        ? suppliers.find(({ supplierId }) => supplierId === toggleSupplierId) ?? null
        : null,
    [suppliers, toggleSupplierId],
  );

  const confirmToggleActive = useCallback(async () => {
    if (!supplierPendingToggle || togglingStatus) return;

    const nextActiveState = !supplierPendingToggle.isActive;

    try {
      setTogglingStatus(true);
      await updateSupplierActive(supplierPendingToggle.supplierId, { isActive: nextActiveState });
      setSuppliers((prev) =>
        prev.map((supplier) =>
          supplier.supplierId === supplierPendingToggle.supplierId
            ? {
                ...supplier,
                isActive: nextActiveState,
              }
            : supplier,
        ),
      );
      setToggleSupplierId(null);
      showFlash(successResponse(nextActiveState ? "Proveedor reactivado" : "Proveedor desactivado"));
    } catch {
      showFlash(errorResponse("Error al cambiar estado"));
    } finally {
      setTogglingStatus(false);
    }
  }, [showFlash, supplierPendingToggle, togglingStatus]);

  const handleCreateSaved = useCallback(() => {
    if (paginationState.pageIndex === 0) {
      void loadSuppliers();
      return;
    }

    setPaginationState((prev) => ({
      ...prev,
      pageIndex: 0,
    }));
  }, [loadSuppliers, paginationState.pageIndex]);

  const handleEditSaved = useCallback(() => {
    void loadSuppliers();
  }, [loadSuppliers]);

  const columns = useMemo<DataTableColumn<Supplier>[]>(
    () => [
      {
        id: "documentNumber",
        header: "Documento",
        cell: (row) => <span className="text-black/60 text-xs">{row.documentNumber ?? "-"}</span>,
        className: "text-black/60",
        visible: false,
      },
      {
        id: "supplier",
        header: "Proveedor",
        cell: (row) => <span className="text-black/70">{getSupplierDisplayName(row)}</span>,
        className: "text-black/70",
        cardTitle: true,
      },
      {
        id: "email",
        header: "Correo",
        cell: (row) => <span className="text-black/70">{row.email ?? "-"}</span>,
        className: "text-black/70",
      },
      {
        id: "phone",
        header: "Telefono",
        cell: (row) => <span className="text-black/70">{row.phone ?? "-"}</span>,
        className: "text-black/70",
      },
      {
        id: "address",
        header: "Direccion",
        cell: (row) => <span className="text-black/70">{row.address ?? "-"}</span>,
        className: "text-black/70",
        showInCards: false,
        visible: false,
      },
      {
        id: "leadTimeDays",
        header: "T. Espera",
        cell: (row) => (
          <div className="flex items-center justify-center gap-2 text-black/70">
            {row.leadTimeDays ?? "-"}
            <Timer className="h-4 w-4" />
          </div>
        ),
        headerClassName: "text-center [&>div]:justify-center",
        className: "text-center text-black/70",
        showInCards: false,
      },
      {
        id: "status",
        header: "Estado",
        cell: (row) => <StatusPill active={row.isActive} PRIMARY={PRIMARY} />,
        headerClassName: "text-center [&>div]:justify-center",
        className: "text-center",
        sortAccessor: (row) => row.isActive,
      },
      {
        id: "actions",
        header: "ACCIONES",
        cell: (row) => (
          <ActionsPopover
            actions={[
              {
                id: "edit",
                label: "Detalles",
                icon: <Pencil className="h-4 w-4 text-black/60" />,
                onClick: () => openEdit(row.supplierId),
                disabled: companyActionDisabled,
              },
              {
                id: "methods",
                label: "Metodos de pago",
                icon: <IconPaymentMethod />,
                onClick: () => setMethodSupplierId(row.supplierId),
                disabled: companyActionDisabled,
              },
              {
                id: "toggle",
                label: row.isActive ? "Desactivar" : "Reactivar",
                icon: <Trash2 className="h-4 w-4" />,
                danger: row.isActive,
                className: row.isActive
                  ? "text-rose-700 hover:bg-rose-50"
                  : "text-cyan-700 hover:bg-cyan-50",
                onClick: () => setToggleSupplierId(row.supplierId),
                disabled: companyActionDisabled,
              },
            ]}
            columns={1}
            compact
            showLabels
            triggerIcon={<Menu className="h-4 w-4" />}
            popoverClassName="min-w-35"
            popoverBodyClassName="p-2"
            renderAction={(action, helpers) => (
              <button
                key={action.id}
                type="button"
                onClick={(e: MouseEvent<HTMLButtonElement>) => {
                  e.stopPropagation();
                  helpers.onAction(action);
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[11px] text-black/80 hover:bg-black/[0.03] ${action.className ?? ""}`}
                disabled={action.disabled}
              >
                {action.icon}
                {action.label}
              </button>
            )}
          />
        ),
        className: "text-center",
        headerClassName: "text-center [&>div]:justify-center",
        showInCards: false,
        sortable: false,
        hideable: false,
      },
    ],
    [companyActionDisabled, getSupplierDisplayName, openEdit],
  );

  const smartSearchColumns = useMemo(
    () => buildProviderSmartSearchColumns(searchState),
    [searchState],
  );

  const recentSearches = useMemo<DataTableRecentSearchItem<ProviderSearchSnapshot>[]>(
    () =>
      (searchState?.recent ?? []).map((item) => ({
        id: item.recentId,
        label: item.label,
        snapshot: item.snapshot,
      })),
    [searchState],
  );

  const savedMetrics = useMemo<DataTableSavedSearchItem<ProviderSearchSnapshot>[]>(
    () =>
      (searchState?.saved ?? []).map((metric) => ({
        id: metric.metricId,
        name: metric.name,
        label: metric.label,
        snapshot: metric.snapshot,
      })),
    [searchState],
  );

  const searchChips = useMemo(
    () => buildProviderSearchChips(executedSnapshot, searchState),
    [executedSnapshot, searchState],
  );

  const applySmartSnapshot = useCallback((snapshot: ProviderSearchSnapshot) => {
    const normalized = sanitizeProviderSearchSnapshot(snapshot);
    setSearchText(normalized.q ?? "");
    setAppliedSearchText(normalized.q ?? "");
    setSearchFilters(normalized.filters);
    setPaginationState((prev) => ({
      ...prev,
      pageIndex: 0,
    }));
  }, []);

  const handleApplySearchRule = useCallback((rule: ProviderSearchRule) => {
    setSearchFilters((current) => {
      const next = upsertProviderSearchRule(
        sanitizeProviderSearchSnapshot({ q: searchText, filters: current }),
        rule,
      );
      return next.filters;
    });
    setPaginationState((prev) => ({
      ...prev,
      pageIndex: 0,
    }));
  }, [searchText]);

  const handleRemoveSearchRule = useCallback((fieldId: ProviderSearchFilterKey) => {
    setSearchFilters((current) => {
      const next = removeProviderSearchKey(
        sanitizeProviderSearchSnapshot({ q: searchText, filters: current }),
        fieldId,
      );
      return next.filters;
    });
    setPaginationState((prev) => ({
      ...prev,
      pageIndex: 0,
    }));
  }, [searchText]);

  const handleRemoveChip = useCallback((key: "q" | ProviderSearchFilterKey) => {
    const nextSnapshot = removeProviderSearchKey(
      sanitizeProviderSearchSnapshot({ q: appliedSearchText, filters: searchFilters }),
      key,
    );
    setSearchText(nextSnapshot.q ?? "");
    setAppliedSearchText(nextSnapshot.q ?? "");
    setSearchFilters(nextSnapshot.filters);
    setPaginationState((prev) => ({
      ...prev,
      pageIndex: 0,
    }));
  }, [appliedSearchText, searchFilters]);

  const handleSaveMetric = useCallback(async (name: string) => {
    const snapshot = sanitizeProviderSearchSnapshot({
      q: appliedSearchText,
      filters: searchFilters,
    });
    if (!hasProviderSearchCriteria(snapshot)) return false;

    setSavingMetric(true);
    try {
      const response = await saveProviderSearchMetric(name, snapshot);
      if (response.type === "success") {
        showFlash(successResponse(response.message));
        await loadSearchState();
        return true;
      }

      showFlash(errorResponse(response.message));
      return false;
    } catch {
      showFlash(errorResponse("Error al guardar la metrica"));
      return false;
    } finally {
      setSavingMetric(false);
    }
  }, [appliedSearchText, loadSearchState, searchFilters, showFlash]);

  const handleDeleteMetric = useCallback(async (metricId: string) => {
    try {
      const response = await deleteProviderSearchMetric(metricId);
      if (response.type === "success") {
        showFlash(successResponse(response.message));
        await loadSearchState();
      } else {
        showFlash(errorResponse(response.message));
      }
    } catch {
      showFlash(errorResponse("Error al eliminar la metrica"));
    }
  }, [loadSearchState, showFlash]);

  const safePage = serverPagination.page;
  const effectiveLimit = serverPagination.limit;

  return (
    <PageShell>
      <PageTitle title="Proveedores" />
      <div className="flex items-center justify-between">
        <Headed title="Proveedores" size="lg" />
        <SystemButton
          size="sm"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={startCreate}
          style={{
            backgroundColor: PRIMARY,
            borderColor: `color-mix(in srgb, ${PRIMARY} 20%, transparent)`,
            boxShadow: "0 10px 25px -15px rgba(0,0,0,0.4)",
          }}
          disabled={companyActionDisabled}
          title={companyActionTitle}
        >
          Crear proveedor
        </SystemButton>
      </div>

      <DataTableSearchChips
        chips={searchChips}
        onRemove={(chip) => handleRemoveChip(chip.removeKey)}
      />

      <DataTable
        tableId="providers-table"
        data={suppliers}
        columns={columns}
        rowKey="supplierId"
        loading={loading}
        emptyMessage="No hay proveedores con los filtros actuales."
        selectableColumns
        hoverable={false}
        animated={false}
        toolbarSearchContent={
          <DataTableSearchBar
            value={searchText}
            onChange={setSearchText}
            onSubmitSearch={submitSearch}
            searchLabel="Busca tu proveedor"
            searchName="provider-smart-search"
            canSaveMetric={hasProviderSearchCriteria(executedSnapshot)}
            saveLoading={savingMetric}
            onSaveMetric={handleSaveMetric}
          >
            <ProviderSmartSearchPanel
              recent={recentSearches}
              saved={savedMetrics}
              columns={smartSearchColumns}
              snapshot={draftSnapshot}
              searchState={searchState}
              filterQuery={searchText}
              onApplySnapshot={applySmartSnapshot}
              onApplyRule={handleApplySearchRule}
              onRemoveRule={handleRemoveSearchRule}
              onDeleteMetric={handleDeleteMetric}
            />
          </DataTableSearchBar>
        }
        pagination={{
          page: safePage,
          limit: effectiveLimit,
          total: serverPagination.total,
        }}
        onPageChange={(nextPage) => {
          setPaginationState((prev) => ({ ...prev, pageIndex: Math.max(0, nextPage - 1) }));
        }}
        tableClassName="text-[10px]"
      />

      <SupplierFormModal
        open={openCreate}
        mode="create"
        onClose={() => setOpenCreate(false)}
        onSaved={handleCreateSaved}
        primaryColor={PRIMARY}
      />

      <SupplierFormModal
        open={Boolean(editingSupplierId)}
        mode="edit"
        supplierId={editingSupplierId}
        onClose={() => setEditingSupplierId(null)}
        onSaved={handleEditSaved}
        primaryColor={PRIMARY}
      />

      <AlertModal
        open={Boolean(toggleSupplierId)}
        type={supplierPendingToggle?.isActive ? "warning" : "restore"}
        title={supplierPendingToggle?.isActive ? "Desactivar proveedor" : "Reactivar proveedor"}
        message={
          supplierPendingToggle?.isActive
            ? "Estas por desactivar este proveedor. Hazlo solo si estas seguro."
            : "Estas por reactivar este proveedor. Hazlo solo si estas seguro."
        }
        confirmText={supplierPendingToggle?.isActive ? "Desactivar" : "Reactivar"}
        loading={togglingStatus}
        onClose={() => setToggleSupplierId(null)}
        onConfirm={() => {
          void confirmToggleActive();
        }}
      />

      {methodSupplierId && (
        <ProviderMethodListModal
          title="Metodos de pago del proveedor"
          supplierId={methodSupplierId}
          close={() => setMethodSupplierId(null)}
          className="w-[600px] max-h-[600px]"
        />
      )}
    </PageShell>
  );
}
