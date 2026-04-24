import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import { PageTitle } from "@/components/PageTitle";
import { DataTable } from "@/components/table/DataTable";
import type { DataTableColumn } from "@/components/table/types";
import {
  DataTableSearchBar,
  DataTableSearchChips,
  type DataTableRecentSearchItem,
  type DataTableSavedSearchItem,
} from "@/components/table/search";
import { Headed } from "@/components/Headed";
import { PageShell } from "@/components/layout/PageShell";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { errorResponse, successResponse } from "@/common/utils/response";
import {
  parseDateInputValue,
  toLocalDateKey,
} from "@/utils/functionPurchases";
import type { ProductCatalogProductType } from "@/pages/catalog/types/product";
import type { InventoryLedgerMovementListItem } from "@/pages/catalog/types/inventoryLedgerMovements";
import type {
  InventoryLedgerSearchField,
  InventoryLedgerSearchRule,
  InventoryLedgerSearchSnapshot,
  InventoryLedgerSearchStateResponse,
} from "@/pages/catalog/types/inventoryLedgerSearch";
import {
  deleteInventoryLedgerSearchMetric,
  getInventoryLedgerMovements,
  getInventoryLedgerSearchState,
  saveInventoryLedgerSearchMetric,
} from "@/services/kardexService";
import { InventoryLedgerSmartSearchPanel } from "@/pages/catalog/components/InventoryLedgerSmartSearchPanel";
import {
  buildInventoryLedgerSearchChips,
  buildInventoryLedgerSmartSearchColumns,
  createEmptyInventoryLedgerSearchFilters,
  hasInventoryLedgerSearchCriteria,
  removeInventoryLedgerSearchKey,
  sanitizeInventoryLedgerSearchSnapshot,
  upsertInventoryLedgerSearchRule,
} from "@/pages/catalog/utils/inventoryLedgerSmartSearch";

type MovementRow = {
  id: string;
  createdAt: string;
  date: string;
  time: string;
  skuLabel: string;
  warehouse: string;
  quantity: number;
  user: string;
  direction: "IN" | "OUT";
};

const statusLabel: Record<MovementRow["direction"], string> = {
  IN: "Entrada",
  OUT: "Salida",
};

type InventoryMovementsPageConfig = {
  productType: ProductCatalogProductType;
  pageTitle: string;
  headingTitle: string;
  tableId: string;
  searchName: string;
  dateRangeName: string;
};

type InventoryMovementsPageProps = {
  config: InventoryMovementsPageConfig;
};

export function InventoryMovementsPage({ config }: InventoryMovementsPageProps) {
  const { showFlash, clearFlash } = useFlashMessage();

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchText, setSearchText] = useState("");
  const [appliedSearchText, setAppliedSearchText] = useState("");
  const [searchFilters, setSearchFilters] = useState(() => createEmptyInventoryLedgerSearchFilters());
  const [page, setPage] = useState(1);

  const limit = 25;

  const [searchState, setSearchState] = useState<InventoryLedgerSearchStateResponse | null>(null);
  const [savingMetric, setSavingMetric] = useState(false);

  const [items, setItems] = useState<InventoryLedgerMovementListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const draftSnapshot = useMemo<InventoryLedgerSearchSnapshot>(
    () => sanitizeInventoryLedgerSearchSnapshot({ q: searchText, filters: searchFilters }),
    [searchFilters, searchText],
  );

  const executedSnapshot = useMemo<InventoryLedgerSearchSnapshot>(
    () => sanitizeInventoryLedgerSearchSnapshot({ q: appliedSearchText, filters: searchFilters }),
    [appliedSearchText, searchFilters],
  );

  const loadSearchState = useCallback(async () => {
    try {
      const response = await getInventoryLedgerSearchState({ productType: config.productType });
      setSearchState(response);
    } catch {
      showFlash(errorResponse("Error al cargar el estado del buscador inteligente"));
    }
  }, [config.productType, showFlash]);

  useEffect(() => {
    void loadSearchState();
  }, [loadSearchState]);

  const smartSearchColumns = useMemo(
    () => buildInventoryLedgerSmartSearchColumns(searchState),
    [searchState],
  );

  const recentSearches = useMemo<DataTableRecentSearchItem<InventoryLedgerSearchSnapshot>[]>(
    () =>
      (searchState?.recent ?? []).map((item) => ({
        id: item.recentId,
        label: item.label,
        snapshot: item.snapshot,
      })),
    [searchState],
  );

  const savedMetrics = useMemo<DataTableSavedSearchItem<InventoryLedgerSearchSnapshot>[]>(
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
    () => buildInventoryLedgerSearchChips(executedSnapshot, searchState),
    [executedSnapshot, searchState],
  );

  const submitSearch = useCallback(() => {
    startTransition(() => {
      setAppliedSearchText(searchText.trim());
      setPage(1);
    });
  }, [searchText]);

  const handleApplySnapshot = useCallback((snapshot: InventoryLedgerSearchSnapshot) => {
    const normalized = sanitizeInventoryLedgerSearchSnapshot(snapshot);
    startTransition(() => {
      setSearchText(normalized.q ?? "");
      setAppliedSearchText(normalized.q ?? "");
      setSearchFilters(normalized.filters);
      setPage(1);
    });
  }, []);

  const handleApplySearchRule = useCallback((rule: InventoryLedgerSearchRule) => {
    startTransition(() => {
      const next = upsertInventoryLedgerSearchRule(
        sanitizeInventoryLedgerSearchSnapshot({ q: searchText, filters: searchFilters }),
        rule,
      );
      setSearchFilters(next.filters);
      setPage(1);
    });
  }, [searchFilters, searchText]);

  const handleRemoveSearchRule = useCallback((fieldId: InventoryLedgerSearchField) => {
    startTransition(() => {
      const next = removeInventoryLedgerSearchKey(
        sanitizeInventoryLedgerSearchSnapshot({ q: searchText, filters: searchFilters }),
        fieldId,
      );
      setSearchFilters(next.filters);
      setPage(1);
    });
  }, [searchFilters, searchText]);

  const handleRemoveChip = useCallback((key: "q" | InventoryLedgerSearchField) => {
    const next = removeInventoryLedgerSearchKey(
      sanitizeInventoryLedgerSearchSnapshot({ q: appliedSearchText, filters: searchFilters }),
      key,
    );
    startTransition(() => {
      setSearchText(next.q ?? "");
      setAppliedSearchText(next.q ?? "");
      setSearchFilters(next.filters);
      setPage(1);
    });
  }, [appliedSearchText, searchFilters]);

  const handleSaveMetric = useCallback(async (name: string) => {
    if (savingMetric) return;
    setSavingMetric(true);

    try {
      const response = await saveInventoryLedgerSearchMetric({
        name,
        productType: config.productType,
        snapshot: executedSnapshot,
      });

      if (response.type === "success") {
        showFlash(successResponse(response.message));
        await loadSearchState();
      } else {
        showFlash(errorResponse(response.message));
      }
    } catch {
      showFlash(errorResponse("Error al guardar la metrica"));
    } finally {
      setSavingMetric(false);
    }
  }, [config.productType, executedSnapshot, loadSearchState, savingMetric, showFlash]);

  const handleDeleteMetric = useCallback(async (metricId: string) => {
    try {
      const response = await deleteInventoryLedgerSearchMetric({
        metricId,
        productType: config.productType,
      });

      if (response.type === "success") {
        showFlash(successResponse(response.message));
        await loadSearchState();
      } else {
        showFlash(errorResponse(response.message));
      }
    } catch {
      showFlash(errorResponse("Error al eliminar la metrica"));
    }
  }, [config.productType, loadSearchState, showFlash]);

  const loadMovements = useCallback(async () => {
    clearFlash();
    setLoading(true);
    setError(null);

    try {
      const response = await getInventoryLedgerMovements({
        page,
        limit,
        from: fromDate || undefined,
        to: toDate || undefined,
        productType: config.productType,
        q: executedSnapshot.q,
        filters: executedSnapshot.filters.length ? JSON.stringify(executedSnapshot.filters) : undefined,
      });

      setItems(response.items ?? []);
      setTotal(response.total ?? 0);

      if (hasInventoryLedgerSearchCriteria(executedSnapshot)) {
        void loadSearchState();
      }
    } catch {
      setItems([]);
      setTotal(0);
      setError("Error al listar movimientos");
      showFlash(errorResponse("Error al listar movimientos"));
    } finally {
      setLoading(false);
    }
  }, [clearFlash, config.productType, executedSnapshot, fromDate, loadSearchState, page, showFlash, toDate]);

  useEffect(() => {
    void loadMovements();
  }, [loadMovements]);

  const rows = useMemo<MovementRow[]>(
    () =>
      items.map((item) => {
        const createdAt = item.createdAt ? new Date(item.createdAt) : null;
        const date = createdAt
          ? createdAt.toLocaleDateString("es-PE", { year: "numeric", month: "2-digit", day: "2-digit" })
          : "-";
        const time = createdAt
          ? createdAt.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
          : "-";
        const skuLabel = item.sku.name || "-";
        const warehouse = item.warehouseName || item.warehouseId || "-";
        const user = item.user?.name || item.user?.email || "-";

        return {
          id: item.id,
          createdAt: item.createdAt,
          date,
          time,
          skuLabel,
          warehouse,
          quantity: item.quantity ?? 0,
          user,
          direction: item.direction,
        };
      }),
    [items],
  );

  const columns = useMemo<DataTableColumn<MovementRow>[]>(
    () => [
      {
        id: "createdAt",
        header: "Fecha y hora",
        cell: (row) => (
          <div className="text-black/70">
            {row.date}
            <br />
            {row.time}
          </div>
        ),
        headerClassName: "text-left w-[110px]",
        className: "text-black/70",
        hideable: true,
        sortable: false,
      },
      {
        id: "skuLabel",
        header: "Producto",
        accessorKey: "skuLabel",
        headerClassName: "text-left w-[140px]",
        className: "text-black/70",
        hideable: true,
        sortable: false,
      },
      {
        id: "warehouse",
        header: "Almacén",
        accessorKey: "warehouse",
        headerClassName: "text-left w-[140px]",
        className: "text-black/70",
        hideable: true,
        sortable: false,
      },
      {
        id: "quantity",
        header: "Cantidad",
        accessorKey: "quantity",
        headerClassName: "text-right w-[90px]",
        className: "text-black/70 text-right",
        hideable: true,
        sortable: false,
      },
      {
        id: "user",
        header: "Usuario",
        accessorKey: "user",
        headerClassName: "text-left w-[140px]",
        className: "text-black/70",
        hideable: true,
        sortable: false,
      },
      {
        id: "direction",
        header: "E/S",
        cell: (row) => (
          <span className="inline-flex rounded-lg px-2 py-1 text-[10px] font-medium bg-slate-50 text-slate-700">
            {statusLabel[row.direction] ?? row.direction}
          </span>
        ),
        headerClassName: "text-left w-[70px]",
        className: "text-black/70",
        hideable: true,
        sortable: false,
      },
    ],
    [],
  );

  return (
    <PageShell>
      <PageTitle title={config.pageTitle} />

      <div className="grid grid-cols-2 ms:grid-cols-1 gap-3 pt-2 items-center">
        <Headed title={config.headingTitle} subtitle="Auditoría interna del inventario." size="lg" />
      </div>

      <div className="space-y-3">
        <DataTableSearchChips chips={searchChips} onRemove={(chip) => handleRemoveChip(chip.removeKey)} />

        <DataTable
          tableId={config.tableId}
          data={rows}
          columns={columns}
          rowKey="id"
          loading={loading}
          emptyMessage="No hay movimientos para los filtros actuales."
          hoverable={false}
          animated={false}
          selectableColumns
          toolbarSearchContent={
            <DataTableSearchBar
              value={searchText}
              onChange={(value) => startTransition(() => setSearchText(value))}
              onSubmitSearch={submitSearch}
              searchLabel="Buscar en movimientos"
              searchName={config.searchName}
              canSaveMetric={hasInventoryLedgerSearchCriteria(executedSnapshot)}
              saveLoading={savingMetric}
              onSaveMetric={handleSaveMetric}
            >
              <InventoryLedgerSmartSearchPanel
                recent={recentSearches}
                saved={savedMetrics}
                columns={smartSearchColumns}
                snapshot={draftSnapshot}
                searchState={searchState}
                filterQuery={searchText}
                onApplySnapshot={handleApplySnapshot}
                onApplyRule={handleApplySearchRule}
                onRemoveRule={handleRemoveSearchRule}
                onDeleteMetric={handleDeleteMetric}
              />
            </DataTableSearchBar>
          }
          rangeDates={{
            startDate: parseDateInputValue(fromDate),
            endDate: parseDateInputValue(toDate),
            label: "Rango de fechas",
            name: config.dateRangeName,
            onChange: ({ startDate, endDate }) => {
              startTransition(() => {
                setFromDate(startDate ? toLocalDateKey(startDate) : "");
                setToDate(endDate ? toLocalDateKey(endDate) : "");
                setPage(1);
              });
            },
          }}
          pagination={{ page, limit, total }}
          onPageChange={(nextPage) => startTransition(() => setPage(nextPage))}
          tableClassName="text-[10px]"
        />

        {error ? <div className="px-5 py-4 text-[10px] text-rose-600">{error}</div> : null}
      </div>
    </PageShell>
  );
}
