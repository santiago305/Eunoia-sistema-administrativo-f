import { startTransition, useCallback, useEffect, useMemo, useState, useRef, type MouseEvent } from "react";
import { Boxes, Menu, Pencil, Plus, Trash2 } from "lucide-react";
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
import { SystemButton } from "@/components/SystemButton";
import { errorResponse, successResponse } from "@/common/utils/response";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { useCompany } from "@/hooks/useCompany";
import { WarehouseFormModal } from "@/pages/warehouse/components/WarehouseFormModal";
import { WarehouseLocationsModal } from "./components/LocationModal";
import { WarehouseStockModal } from "./components/WarehouseStockModal";
import { WarehouseSmartSearchPanel } from "./components/WarehouseSmartSearchPanel";
import type {
  Warehouse,
  WarehouseSearchCatalogs,
  WarehouseSearchFilters,
  WarehouseSearchRule,
  WarehouseSearchSnapshot,
  WarehouseSearchStateResponse,
} from "@/pages/warehouse/types/warehouse";
import {
  deleteWarehouseSearchMetric,
  getWarehouseSearchState,
  listWarehouses,
  saveWarehouseSearchMetric,
  updateWarehouseActive,
} from "@/services/warehouseServices";
import {
  listUbigeoDepartments,
  listUbigeoDistricts,
  listUbigeoProvinces,
} from "@/services/ubigeoService";
import {
  applyWarehouseSearchRuleWithDependencies,
  buildWarehouseSearchChips,
  buildWarehouseSmartSearchColumns,
  createEmptyWarehouseSearchFilters,
  getWarehouseSearchRuleValues,
  hasWarehouseSearchCriteria,
  removeWarehouseSearchKeyWithDependencies,
  sanitizeWarehouseSearchSnapshot,
  type WarehouseSearchFilterKey,
} from "@/pages/warehouse/utils/warehouseSmartSearch";
import { WarehouseSearchFields } from "@/pages/warehouse/types/warehouse";

const PRIMARY = "hsl(var(--primary))";
const DEFAULT_LIMIT = 10;

const EMPTY_WAREHOUSE_SEARCH_CATALOGS: WarehouseSearchCatalogs = {
  departments: [],
  provinces: [],
  districts: [],
  activeStates: [],
};

function toSearchOptions(items: Array<{ id: string; name: string }>) {
  return items.map((item) => ({
    id: item.id,
    label: item.name,
  }));
}

export default function Warehouses() {
  const { showFlash, clearFlash } = useFlashMessage();
  const showFlashRef = useRef(showFlash);
  useEffect(() => { showFlashRef.current = showFlash; }, [showFlash]);
  const { hasCompany } = useCompany();
  const companyActionDisabled = !hasCompany;
  const companyActionTitle = hasCompany ? undefined : "Primero registra la empresa.";

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchState, setSearchState] = useState<WarehouseSearchStateResponse | null>(null);
  const [savingMetric, setSavingMetric] = useState(false);
  const [ubigeoCatalogs, setUbigeoCatalogs] = useState<
    Pick<WarehouseSearchCatalogs, "departments" | "provinces" | "districts">
  >({
    departments: [],
    provinces: [],
    districts: [],
  });

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
  const [searchFilters, setSearchFilters] = useState<WarehouseSearchFilters>(() =>
    createEmptyWarehouseSearchFilters(),
  );

  const [openCreate, setOpenCreate] = useState(false);
  const [editingWarehouseId, setEditingWarehouseId] = useState<string | null>(null);
  const [deletingWarehouseId, setDeletingWarehouseId] = useState<string | null>(null);
  const [openLocationsWarehouseId, setOpenLocationsWarehouseId] = useState<string | null>(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState<{
    warehouseId: string;
    name: string;
  } | null>(null);
  const [stockWarehouse, setStockWarehouse] = useState<{
    warehouseId: string;
    name: string;
  } | null>(null);

  const page = paginationState.pageIndex + 1;

  const draftSnapshot = useMemo(
    () =>
      sanitizeWarehouseSearchSnapshot({
        q: searchText,
        filters: searchFilters,
      }),
    [searchFilters, searchText],
  );

  const executedSnapshot = useMemo(
    () =>
      sanitizeWarehouseSearchSnapshot({
        q: appliedSearchText,
        filters: searchFilters,
      }),
    [appliedSearchText, searchFilters],
  );

  const selectedDepartmentIds = useMemo(
    () => getWarehouseSearchRuleValues(draftSnapshot, WarehouseSearchFields.DEPARTMENT),
    [draftSnapshot],
  );

  const selectedProvinceIds = useMemo(
    () => getWarehouseSearchRuleValues(draftSnapshot, WarehouseSearchFields.PROVINCE),
    [draftSnapshot],
  );

  const searchCatalogs = useMemo<WarehouseSearchCatalogs>(
    () => ({
      departments: ubigeoCatalogs.departments,
      provinces: ubigeoCatalogs.provinces,
      districts: ubigeoCatalogs.districts,
      activeStates: searchState?.catalogs.activeStates ?? EMPTY_WAREHOUSE_SEARCH_CATALOGS.activeStates,
    }),
    [
      searchState?.catalogs.activeStates,
      ubigeoCatalogs.departments,
      ubigeoCatalogs.districts,
      ubigeoCatalogs.provinces,
    ],
  );

  const loadSearchState = useCallback(async () => {
    try {
      const response = await getWarehouseSearchState();
      setSearchState(response);
    } catch {
      showFlashRef.current(errorResponse("Error al cargar el estado del buscador inteligente"));
    }
  }, []);

  const submitSearch = useCallback(() => {
    startTransition(() => {
      setAppliedSearchText(searchText.trim());
      setPaginationState((prev) => ({
        ...prev,
        pageIndex: 0,
      }));
    });
  }, [searchText]);

  const handleSearchTextChange = useCallback((value: string) => {
    startTransition(() => {
      setSearchText(value);
    });
  }, []);

  const loadWarehouses = useCallback(async () => {
    clearFlash();
    setLoading(true);

    try {
      const res = await listWarehouses({
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

      setWarehouses(items);
      setServerPagination({
        total: nextTotal,
        page: nextPage,
        limit: nextLimit,
        totalPages: nextTotalPages,
        hasPrev: nextPage > 1,
        hasNext: nextPage < nextTotalPages,
      });

      if (hasWarehouseSearchCriteria(executedSnapshot)) {
        void loadSearchState();
      }
    } catch {
      setWarehouses([]);
      setServerPagination({
        total: 0,
        page: 1,
        limit: paginationState.pageSize,
        totalPages: 1,
        hasPrev: false,
        hasNext: false,
      });
      showFlashRef.current(errorResponse("Error al listar almacenes"));
    } finally {
      setLoading(false);
    }
  }, [executedSnapshot, loadSearchState, page, paginationState.pageSize]);

  useEffect(() => {
    void loadWarehouses();
  }, [loadWarehouses]);

  useEffect(() => {
    void loadSearchState();
  }, [loadSearchState]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await listUbigeoDepartments();
        if (!cancelled) {
          setUbigeoCatalogs((current) => ({
            ...current,
            departments: toSearchOptions(response),
          }));
        }
      } catch {
        if (!cancelled) {
          showFlashRef.current(errorResponse("Error al cargar departamentos"));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!selectedDepartmentIds.length) {
      setUbigeoCatalogs((current) =>
        current.provinces.length || current.districts.length
          ? {
              ...current,
              provinces: [],
              districts: [],
            }
          : current,
      );
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      try {
        const response = await listUbigeoProvinces({ departmentIds: selectedDepartmentIds });
        if (!cancelled) {
          setUbigeoCatalogs((current) => ({
            ...current,
            provinces: toSearchOptions(response),
          }));
        }
      } catch {
        if (!cancelled) {
          showFlashRef.current(errorResponse("Error al cargar provincias"));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedDepartmentIds]);

  useEffect(() => {
    let cancelled = false;

    if (!selectedProvinceIds.length) {
      setUbigeoCatalogs((current) =>
        current.districts.length
          ? {
              ...current,
              districts: [],
            }
          : current,
      );
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      try {
        const response = await listUbigeoDistricts({ provinceIds: selectedProvinceIds });
        if (!cancelled) {
          setUbigeoCatalogs((current) => ({
            ...current,
            districts: toSearchOptions(response),
          }));
        }
      } catch {
        if (!cancelled) {
          showFlashRef.current(errorResponse("Error al cargar distritos"));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedProvinceIds]);

  const sortedWarehouses = useMemo(
    () =>
      [...warehouses].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      ),
    [warehouses],
  );

  const startCreate = useCallback(() => {
    setEditingWarehouseId(null);
    setOpenCreate(true);
  }, []);

  const openLocationsModal = useCallback((warehouse: { warehouseId: string; name: string }) => {
    setSelectedWarehouse(warehouse);
    setOpenLocationsWarehouseId(warehouse.warehouseId);
  }, []);

  const closeLocationsModal = useCallback(() => {
    setOpenLocationsWarehouseId(null);
    setSelectedWarehouse(null);
  }, []);

  const openStockModal = useCallback((warehouse: { warehouseId: string; name: string }) => {
    setStockWarehouse(warehouse);
  }, []);

  const closeStockModal = useCallback(() => {
    setStockWarehouse(null);
  }, []);

  const startEdit = useCallback((warehouseId: string) => {
    setOpenCreate(false);
    setEditingWarehouseId(warehouseId);
  }, []);

  const closeFormModal = useCallback(() => {
    setOpenCreate(false);
    setEditingWarehouseId(null);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deletingWarehouseId) return;

    const warehouseToToggle = warehouses.find(
      ({ warehouseId }) => warehouseId === deletingWarehouseId,
    );

    if (!warehouseToToggle) {
      setDeletingWarehouseId(null);
      return;
    }

    try {
      await updateWarehouseActive(deletingWarehouseId, {
        isActive: !warehouseToToggle.isActive,
      });
      setWarehouses((prev) =>
        prev.map((warehouse) =>
          warehouse.warehouseId === deletingWarehouseId
            ? {
                ...warehouse,
                isActive: !warehouseToToggle.isActive,
              }
            : warehouse,
        ),
      );
      showFlash(
        successResponse(!warehouseToToggle.isActive ? "Almacen restaurado" : "Almacen desactivado"),
      );
    } catch {
      showFlash(errorResponse("Error al cambiar estado del almacen"));
    } finally {
      setDeletingWarehouseId(null);
    }
  }, [deletingWarehouseId, warehouses, showFlash]);

  const warehousePendingToggle = useMemo(
    () =>
      deletingWarehouseId
        ? warehouses.find(({ warehouseId }) => warehouseId === deletingWarehouseId) ?? null
        : null,
    [deletingWarehouseId, warehouses],
  );

  const formatDate = useCallback((value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleString("es-PE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }, []);

  const columns = useMemo<DataTableColumn<Warehouse>[]>(
    () => [
      {
        id: "name",
        header: "Almacen",
        accessorKey: "name",
        cell: (row) => <span className="font-medium text-black">{row.name}</span>,
        className: "text-black/70",
        cardTitle: true,
      },
      {
        id: "department",
        header: "Departamento",
        accessorKey: "department",
        className: "text-black/70",
        sortable: false,
      },
      {
        id: "province",
        header: "Provincia",
        accessorKey: "province",
        className: "text-black/70",
        sortable: false,
      },
      {
        id: "district",
        header: "Distrito",
        accessorKey: "district",
        className: "text-black/70",
        sortable: false,
      },
      {
        id: "address",
        header: "Direccion",
        cell: (row) => <span className="text-black/70">{row.address ?? "-"}</span>,
        className: "text-black/70",
        visible: false,
        hideable: true,
        sortable: false,
      },
      {
        id: "status",
        header: "Estado",
        cell: (row) => <StatusPill active={row.isActive} PRIMARY={PRIMARY} />,
        sortAccessor: (row) => row.isActive,
      },
      {
        id: "createdAt",
        header: "Creado",
        cell: (row) => <span className="text-black/60 text-xs">{formatDate(row.createdAt)}</span>,
        visible: false,
        hideable: true,
        sortable: false,
      },
      {
        id: "actions",
        header: "ACCIONES",
        stopRowClick: true,
        cell: (row) => (
          <ActionsPopover
            actions={[
              {
                id: "locations",
                label: "Ver ubicaciones",
                icon: <Boxes className="h-4 w-4 text-black/60" />,
                onClick: () =>
                  openLocationsModal({
                    warehouseId: row.warehouseId,
                    name: row.name,
                  }),
                disabled: companyActionDisabled,
              },
              {
                id: "edit",
                label: "Detalles",
                icon: <Pencil className="h-4 w-4 text-black/60" />,
                onClick: () => startEdit(row.warehouseId),
                disabled: companyActionDisabled,
              },
              {
                id: "toggle",
                label: row.isActive ? "Desactivar" : "Restaurar",
                icon: <Trash2 className="h-4 w-4" />,
                danger: row.isActive,
                className: row.isActive
                  ? "text-rose-700 hover:bg-rose-50"
                  : "text-cyan-700 hover:bg-cyan-50",
                onClick: () => setDeletingWarehouseId(row.warehouseId),
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
        hideable: false,
        sortable: false,
      },
    ],
    [companyActionDisabled, formatDate, openLocationsModal, startEdit],
  );

  const smartSearchColumns = useMemo(
    () => buildWarehouseSmartSearchColumns(searchCatalogs),
    [searchCatalogs],
  );

  const recentSearches = useMemo<DataTableRecentSearchItem<WarehouseSearchSnapshot>[]>(
    () =>
      (searchState?.recent ?? []).map((item) => ({
        id: item.recentId,
        label: item.label,
        snapshot: item.snapshot,
      })),
    [searchState],
  );

  const savedMetrics = useMemo<DataTableSavedSearchItem<WarehouseSearchSnapshot>[]>(
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
    () => buildWarehouseSearchChips(executedSnapshot, searchCatalogs),
    [executedSnapshot, searchCatalogs],
  );

  const applySmartSnapshot = useCallback((snapshot: WarehouseSearchSnapshot) => {
    const normalized = sanitizeWarehouseSearchSnapshot(snapshot);
    startTransition(() => {
      setSearchText(normalized.q ?? "");
      setAppliedSearchText(normalized.q ?? "");
      setSearchFilters(normalized.filters);
      setPaginationState((prev) => ({
        ...prev,
        pageIndex: 0,
      }));
    });
  }, []);

  const handleApplySearchRule = useCallback((rule: WarehouseSearchRule) => {
    startTransition(() => {
      setSearchFilters((current) => {
        const next = applyWarehouseSearchRuleWithDependencies(
          sanitizeWarehouseSearchSnapshot({ q: searchText, filters: current }),
          rule,
        );
        return next.filters;
      });
      setPaginationState((prev) => ({
        ...prev,
        pageIndex: 0,
      }));
    });
  }, [searchText]);

  const handleRemoveSearchRule = useCallback((fieldId: WarehouseSearchFilterKey) => {
    startTransition(() => {
      setSearchFilters((current) => {
        const next = removeWarehouseSearchKeyWithDependencies(
          sanitizeWarehouseSearchSnapshot({ q: searchText, filters: current }),
          fieldId,
        );
        return next.filters;
      });
      setPaginationState((prev) => ({
        ...prev,
        pageIndex: 0,
      }));
    });
  }, [searchText]);

  const handleRemoveChip = useCallback((key: "q" | WarehouseSearchFilterKey) => {
    const nextSnapshot = removeWarehouseSearchKeyWithDependencies(
      sanitizeWarehouseSearchSnapshot({ q: appliedSearchText, filters: searchFilters }),
      key,
    );
    startTransition(() => {
      setSearchText(nextSnapshot.q ?? "");
      setAppliedSearchText(nextSnapshot.q ?? "");
      setSearchFilters(nextSnapshot.filters);
      setPaginationState((prev) => ({
        ...prev,
        pageIndex: 0,
      }));
    });
  }, [appliedSearchText, searchFilters]);

  const handlePageChange = useCallback((nextPage: number) => {
    startTransition(() => {
      setPaginationState((prev) => ({ ...prev, pageIndex: Math.max(0, nextPage - 1) }));
    });
  }, []);

  const handleSaveMetric = useCallback(async (name: string) => {
    const snapshot = sanitizeWarehouseSearchSnapshot({
      q: appliedSearchText,
      filters: searchFilters,
    });
    if (!hasWarehouseSearchCriteria(snapshot)) return false;

    setSavingMetric(true);
    try {
      const response = await saveWarehouseSearchMetric(name, snapshot);
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
      const response = await deleteWarehouseSearchMetric(metricId);
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

  const handleSavedWarehouse = useCallback(() => {
    if (paginationState.pageIndex === 0) {
      void loadWarehouses();
      return;
    }

    setPaginationState((prev) => ({
      ...prev,
      pageIndex: 0,
    }));
  }, [loadWarehouses, paginationState.pageIndex]);

  const safePage = serverPagination.page;
  const effectiveLimit = serverPagination.limit;

  return (
    <PageShell>
      <PageTitle title="Almacenes" />
      <div className="flex items-center justify-between">
        <Headed title="Almacenes" size="lg" />
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
          Crear almacen
        </SystemButton>
      </div>

      <DataTableSearchChips
        chips={searchChips}
        onRemove={(chip) => handleRemoveChip(chip.removeKey)}
      />

      <DataTable
        tableId="warehouses-table"
        data={sortedWarehouses}
        columns={columns}
        rowKey="warehouseId"
        loading={loading}
        emptyMessage="No hay almacenes con los filtros actuales."
        selectableColumns
        hoverable={false}
        animated={false}
        toolbarSearchContent={
          <DataTableSearchBar
            value={searchText}
            onChange={handleSearchTextChange}
            onSubmitSearch={submitSearch}
            searchLabel="Busca tu almacen"
            searchName="warehouse-smart-search"
            canSaveMetric={hasWarehouseSearchCriteria(executedSnapshot)}
            saveLoading={savingMetric}
            onSaveMetric={handleSaveMetric}
          >
            <WarehouseSmartSearchPanel
              recent={recentSearches}
              saved={savedMetrics}
              columns={smartSearchColumns}
              snapshot={draftSnapshot}
              catalogs={searchCatalogs}
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
        onRowClick={(row) =>
          openStockModal({
            warehouseId: row.warehouseId,
            name: row.name,
          })
        }
        onPageChange={handlePageChange}
      />

      <WarehouseFormModal
        open={openCreate || Boolean(editingWarehouseId)}
        mode={editingWarehouseId ? "edit" : "create"}
        warehouseId={editingWarehouseId}
        onClose={closeFormModal}
        onSaved={handleSavedWarehouse}
        primaryColor={PRIMARY}
        entityLabel="almacen"
      />

      <AlertModal
        open={Boolean(deletingWarehouseId)}
        type={warehousePendingToggle?.isActive ? "warning" : "restore"}
        title={warehousePendingToggle?.isActive ? "Desactivar almacen" : "Restaurar almacen"}
        message={
          warehousePendingToggle?.isActive
            ? "Estas por desactivar este almacen. Hazlo solo si estas seguro."
            : "Estas por restaurar este almacen. Hazlo solo si estas seguro."
        }
        confirmText={warehousePendingToggle?.isActive ? "Desactivar" : "Restaurar"}
        onClose={() => setDeletingWarehouseId(null)}
        onConfirm={() => {
          void confirmDelete();
        }}
      />

      <WarehouseLocationsModal
        open={Boolean(openLocationsWarehouseId && selectedWarehouse)}
        warehouse={selectedWarehouse}
        onClose={closeLocationsModal}
        primaryColor={PRIMARY}
        primaryHover="#1aa392"
      />

      <WarehouseStockModal
        open={Boolean(stockWarehouse)}
        warehouse={stockWarehouse}
        onClose={closeStockModal}
      />
    </PageShell>
  );
}
