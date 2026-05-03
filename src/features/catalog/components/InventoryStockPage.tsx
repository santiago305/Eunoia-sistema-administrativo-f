import { startTransition, useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useReducedMotion } from "framer-motion";
import { ArrowLeftRight, FileText, Menu, Wrench } from "lucide-react";
import { PageTitle } from "@/shared/components/components/PageTitle";
import { PageShell } from "@/shared/layouts/PageShell";
import { Headed } from "@/shared/components/components/Headed";
import { ActionsPopover, type ActionItem } from "@/shared/components/components/ActionsPopover";
import { DataTable } from "@/shared/components/table/DataTable";
import type { DataTableColumn } from "@/shared/components/table/types";
import {
  DataTableSearchBar,
  DataTableSearchChips,
  type DataTableRecentSearchItem,
  type DataTableSavedSearchItem,
} from "@/shared/components/table/search";
import { useFlashMessage } from "@/shared/hooks/useFlashMessage";
import { errorResponse, successResponse } from "@/shared/common/utils/response";
import { listActive } from "@/shared/services/warehouseServices";
import {
  deleteInventoryExportPreset,
  deleteInventorySearchMetric,
  exportInventoryExcel,
  getInventoryExportColumns,
  getInventoryExportPresets,
  getInventorySearchState,
  getSkuStockSnapshots,
  listInventory,
  saveInventoryExportPreset,
  saveInventorySearchMetric,
  type SkuStockForecast,
} from "@/shared/services/inventoryService";
import { ExportPopover } from "@/shared/components/components/ExportPopover";
import type { Warehouse } from "@/features/warehouse/types/warehouse";
import type {
  ProductCatalogProductType,
  ProductSkuWithAttributes,
} from "@/features/catalog/types/product";
import type { InventorySearchStateResponse } from "@/features/catalog/types/inventorySearch";
import { useCompany } from "@/shared/hooks/useCompany";
import { InventorySmartSearchPanel } from "@/features/catalog/components/InventorySmartSearchPanel";
import { InventoryForecastModal } from "@/features/catalog/components/InventoryForecastModal";
import { buildSkuLabelFromItem } from "../utils/productCreateModal.helpers";
import { listSkus } from "@/shared/services/skuService";
import { subscribeInventoryStockUpdated } from "@/shared/services/inventoryRealtimeService";
import type { DataTableSearchOption } from "@/shared/components/table/search";
import type {
  InventorySearchFilterKey,
  InventorySearchFilters,
  InventorySearchRule,
  InventorySearchSnapshot,
} from "@/features/catalog/utils/inventorySmartSearch";
import {
  buildInventorySearchChips,
  buildInventorySmartSearchColumns,
  createEmptyInventorySearchFilters,
  findInventorySearchRule,
  hasInventorySearchCriteria,
  removeInventorySearchKey,
  sanitizeInventorySearchSnapshot,
  upsertInventorySearchRule,
} from "@/features/catalog/utils/inventorySmartSearch";

const DEFAULT_LIMIT = 25;

type InventoryStockPageConfig = {
  productType: ProductCatalogProductType;
  pageTitle: string;
  headingTitle: string;
  itemLabel: string;
  tableId: string;
  searchLabel: string;
  searchName: string;
  routes: {
    kardex: string;
    transfer: string;
    adjustments: string;
  };
};

type InventorySnapshotRow = {
  stockItemId: string;
  sku: ProductSkuWithAttributes;
  warehouseId: string;
  warehouseName: string;
  onHand: number;
  reserved: number;
  available: number;
};

export function InventoryStockPage({ config }: { config: InventoryStockPageConfig }) {
  const shouldReduceMotion = useReducedMotion();
  const { showFlash } = useFlashMessage();
  const { hasCompany } = useCompany();
  const navigate = useNavigate();
  const companyActionDisabled = !hasCompany;

  const [warehouseOptions, setWarehouseOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [searchState, setSearchState] = useState<InventorySearchStateResponse | null>(null);
  const [selectedSku, setSelectedSku] = useState<string | null>(null);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [appliedSearchText, setAppliedSearchText] = useState("");
  const [searchFilters, setSearchFilters] = useState<InventorySearchFilters>(() =>
    createEmptyInventorySearchFilters(),
  );
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [savingMetric, setSavingMetric] = useState(false);
  const [exportColumns, setExportColumns] = useState<Array<{ key: string; label: string }>>([]);
  const [exportPresets, setExportPresets] = useState<Array<{ metricId: string; name: string; columns: Array<{ key: string; label: string }> }>>([]);
  const [exporting, setExporting] = useState(false);
  const [inventoryRows, setInventoryRows] = useState<InventorySnapshotRow[]>([]);
  const [inventoryTotal, setInventoryTotal] = useState(0);
  const [forecastModalOpen, setForecastModalOpen] = useState(false);
  const [selectedForecast, setSelectedForecast] = useState<SkuStockForecast | null>(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const forecastRequestRef = useRef(0);
  const [skuOptions, setSkuOptions] = useState<DataTableSearchOption[]>([]);
  const realtimeRefreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isActiveRow = (row: InventorySnapshotRow) =>
    selectedSku === row.sku.sku.id && selectedWarehouseId === row.warehouseId;

  const smartSearchCatalogs = useMemo(
    () => ({
      warehouses:
        searchState?.catalogs.warehouses ??
        warehouseOptions
          .filter((option) => option.value !== "all")
          .map((option) => ({ id: option.value, label: option.label })),
      skus: skuOptions,
    }),
    [searchState, skuOptions, warehouseOptions],
  );

  const draftSnapshot = useMemo<InventorySearchSnapshot>(
    () =>
      sanitizeInventorySearchSnapshot({
        q: searchText,
        filters: searchFilters,
      }),
    [searchFilters, searchText],
  );

  const executedSnapshot = useMemo<InventorySearchSnapshot>(
    () =>
      sanitizeInventorySearchSnapshot({
        q: appliedSearchText,
        filters: searchFilters,
      }),
    [appliedSearchText, searchFilters],
  );

  const recentSearches = useMemo<DataTableRecentSearchItem<InventorySearchSnapshot>[]>(
    () =>
      (searchState?.recent ?? []).map((item) => ({
        id: item.recentId,
        label: item.label,
        snapshot: item.snapshot,
      })),
    [searchState],
  );

  const savedMetrics = useMemo<DataTableSavedSearchItem<InventorySearchSnapshot>[]>(
    () =>
      (searchState?.saved ?? []).map((metric) => ({
        id: metric.metricId,
        name: metric.name,
        label: metric.label,
        snapshot: metric.snapshot,
      })),
    [searchState],
  );

  const warehouseQuery = useMemo(() => {
    const rule = findInventorySearchRule(executedSnapshot, "warehouse");
    const values = (rule?.values ?? []).map((value) => value?.trim()).filter(Boolean) as string[];

    if (rule?.mode === "exclude") {
      return {
        warehouseIdsIn: [] as string[],
        warehouseIdsNotIn: values,
        detailWarehouseId: undefined as string | undefined,
      };
    }

    return {
      warehouseIdsIn: values,
      warehouseIdsNotIn: [] as string[],
      detailWarehouseId: values.length === 1 ? values[0] : undefined,
    };
  }, [executedSnapshot]);

  const searchChips = useMemo(
    () => buildInventorySearchChips(executedSnapshot, smartSearchCatalogs, { item: config.itemLabel }),
    [config.itemLabel, executedSnapshot, smartSearchCatalogs],
  );

  const loadSearchState = useCallback(async () => {
    try {
      const response = await getInventorySearchState({ productType: config.productType });
      setSearchState(response);
    } catch {
      showFlash(errorResponse("Error al cargar el estado del buscador inteligente"));
    }
  }, [config.productType, showFlash]);

  const loadSkus = useCallback(
    async (q?: string) => {
      try {
        const res = await listSkus({ limit: 20, q, productType: config.productType });
        const options = (res.items ?? []).map((item: any) => ({
          id: item.sku.id,
          label: item.sku.name || item.sku.backendSku,
        }));

        setSkuOptions((prev) => {
          const next = [...prev];
          options.forEach((option: DataTableSearchOption) => {
            if (!next.some((entry) => entry.id === option.id)) next.push(option);
          });
          return next;
        });
      } catch {
        // silent fallback
      }
    },
    [config.productType],
  );

  const loadExportColumns = useCallback(async () => {
    const response = await getInventoryExportColumns({
      productType: config.productType,
      q: executedSnapshot.q,
      filters: JSON.stringify(executedSnapshot.filters),
    });
    setExportColumns(response ?? []);
  }, [config.productType, executedSnapshot.filters, executedSnapshot.q]);

  const loadExportPresets = useCallback(async () => {
    const response = await getInventoryExportPresets({
      productType: config.productType,
    });
    setExportPresets((response ?? []).map((item) => ({
      metricId: item.metricId,
      name: item.name,
      columns: (item.snapshot?.columns ?? []) as Array<{ key: string; label: string }>,
    })));
  }, [config.productType]);

  const skuSearchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchSku = useCallback((q: string) => {
    if (skuSearchDebounceRef.current) clearTimeout(skuSearchDebounceRef.current);
    skuSearchDebounceRef.current = setTimeout(() => {
      void loadSkus(q);
    }, 500);
  }, [loadSkus]);

  const smartSearchColumns = useMemo(
    () =>
      buildInventorySmartSearchColumns(
        smartSearchCatalogs,
        { item: config.itemLabel },
        { onSearchSku: handleSearchSku },
      ),
    [config.itemLabel, handleSearchSku, smartSearchCatalogs],
  );

  const applySmartSnapshot = useCallback((snapshot: InventorySearchSnapshot) => {
    const normalized = sanitizeInventorySearchSnapshot(snapshot);
    startTransition(() => {
      setSearchText(normalized.q ?? "");
      setAppliedSearchText(normalized.q ?? "");
      setSearchFilters(normalized.filters);
      setSelectedSku(null);
      setSelectedWarehouseId(null);
      setPage(1);
    });
  }, []);

  const submitSearch = useCallback(() => {
    const next = searchText.trim();
    startTransition(() => {
      setAppliedSearchText(next);
      setSelectedSku(null);
      setSelectedWarehouseId(null);
      setPage(1);
    });
  }, [searchText]);

  const handleApplySearchRule = useCallback((rule: InventorySearchRule) => {
    startTransition(() => {
      setSearchFilters((current) => {
        const next = upsertInventorySearchRule(
          sanitizeInventorySearchSnapshot({ q: searchText, filters: current }),
          rule,
        );
        return next.filters;
      });
      setSelectedSku(null);
      setSelectedWarehouseId(null);
      setPage(1);
    });
  }, [searchText]);

  const handleRemoveSearchRule = useCallback((fieldId: InventorySearchFilterKey) => {
    startTransition(() => {
      setSearchFilters((current) => {
        const next = removeInventorySearchKey(
          sanitizeInventorySearchSnapshot({ q: searchText, filters: current }),
          fieldId,
        );
        return next.filters;
      });
      setSelectedSku(null);
      setSelectedWarehouseId(null);
      setPage(1);
    });
  }, [searchText]);

  const handleRemoveChip = useCallback((key: "q" | InventorySearchFilterKey) => {
    const nextSnapshot = removeInventorySearchKey(
      sanitizeInventorySearchSnapshot({ q: appliedSearchText, filters: searchFilters }),
      key,
    );

    startTransition(() => {
      setSearchText(nextSnapshot.q ?? "");
      setAppliedSearchText(nextSnapshot.q ?? "");
      setSearchFilters(nextSnapshot.filters);
      setSelectedSku(null);
      setSelectedWarehouseId(null);
      setPage(1);
    });
  }, [appliedSearchText, searchFilters]);

  useEffect(() => {
    if (!selectedSku) {
      setSelectedForecast(null);
      forecastRequestRef.current += 1;
      setForecastLoading(false);
      return;
    }
  }, [selectedSku]);

  useEffect(() => {
    void loadSearchState();
  }, [loadSearchState]);

  useEffect(() => {
    void loadSkus();
  }, [loadSkus]);
  useEffect(() => {
    void loadExportColumns();
    void loadExportPresets();
  }, [loadExportColumns, loadExportPresets]);

  const loadForecast = async (skuId: string, warehouseId?: string) => {
    const requestId = (forecastRequestRef.current += 1);
    setForecastLoading(true);

    try {
      const response = await getSkuStockSnapshots(
        skuId,
        warehouseId ? { warehouseId } : warehouseQuery.detailWarehouseId ? { warehouseId: warehouseQuery.detailWarehouseId } : undefined,
      );

      if (forecastRequestRef.current !== requestId) return;
      setSelectedForecast(response.forecast ?? null);
    } catch {
      if (forecastRequestRef.current !== requestId) return;
      setSelectedForecast(null);
      showFlash(errorResponse("Error al cargar forecast"));
    } finally {
      if (forecastRequestRef.current === requestId) {
        setForecastLoading(false);
      }
    }
  };

  const loadWarehouses = async () => {
    try {
      const res = await listActive();
      const options = [
        { value: "all", label: "Todos" },
        ...(res?.map((s: Warehouse) => ({
          value: s.warehouseId,
          label: s.name,
        })) ?? []),
      ];
      setWarehouseOptions(options);
    } catch {
      setWarehouseOptions([]);
      showFlash(errorResponse("Error al cargar almacenes"));
    }
  };

  const loadInventory = useCallback(async () => {
    setLoading(true);

    try {
      const res = (await listInventory({
        page,
        limit: DEFAULT_LIMIT,
        warehouseId: warehouseQuery.detailWarehouseId,
        warehouseIdsIn: warehouseQuery.warehouseIdsIn.length ? warehouseQuery.warehouseIdsIn : undefined,
        warehouseIdsNotIn: warehouseQuery.warehouseIdsNotIn.length ? warehouseQuery.warehouseIdsNotIn : undefined,
        q: executedSnapshot.q || undefined,
        filters: executedSnapshot.filters.length ? JSON.stringify(executedSnapshot.filters) : undefined,
        productType: config.productType,
      } as any)) as unknown as {
        items?: InventorySnapshotRow[];
        total?: number;
        page?: number;
      };

      const items = res.items ?? [];
      setInventoryRows(items);
      setInventoryTotal(res.total ?? items.length);
      
      const resPage = Number(res.page);
      if (!isNaN(resPage) && resPage > 0 && resPage !== page) {
        setPage(resPage);
      }

      if (hasInventorySearchCriteria(executedSnapshot)) {
        void loadSearchState();
      }
    } catch {
      setInventoryRows([]);
      setInventoryTotal(0);
      showFlash(errorResponse("Error al cargar inventario"));
    } finally {
      setLoading(false);
    }
  }, [config.productType, executedSnapshot, loadSearchState, page, showFlash, warehouseQuery]);

  const buildInventoryActions = (row: InventorySnapshotRow): ActionItem[] => [
    {
      id: `kardex-${row.sku.sku.id}`,
      label: "Ver kardex",
      icon: <FileText className="h-4 w-4 text-black/60" />,
      onClick: () => {
        const q = row.sku.sku.name?.trim() || row.sku.sku.backendSku?.trim() || "";
        navigate(`${config.routes.kardex}${q ? `?q=${encodeURIComponent(q)}` : ""}`);
      },
    },
    {
      id: `transfer-${row.sku.sku.id}`,
      label: "Transferir",
      icon: <ArrowLeftRight className="h-4 w-4 text-black/60" />,
      disabled: companyActionDisabled,
      onClick: () => {
        const params = new URLSearchParams();
        params.set("openTransferModal", "1");
        params.set("skuId", row.sku.sku.id);
        if (row.sku.sku.name?.trim()) params.set("skuName", row.sku.sku.name.trim());
        if (row.sku.sku.backendSku?.trim()) params.set("backendSku", row.sku.sku.backendSku.trim());
        if (row.sku.sku.customSku?.trim()) params.set("customSku", row.sku.sku.customSku.trim());
        navigate(`${config.routes.transfer}?${params.toString()}`);
      },
    },
    {
      id: `adjust-${row.sku.sku.id}`,
      label: "Ajustar",
      icon: <Wrench className="h-4 w-4 text-black/60" />,
      disabled: companyActionDisabled,
      onClick: () => {
        const params = new URLSearchParams();
        params.set("openAdjustmentModal", "1");
        params.set("skuId", row.sku.sku.id);
        if (row.sku.sku.name?.trim()) params.set("skuName", row.sku.sku.name.trim());
        if (row.sku.sku.backendSku?.trim()) params.set("backendSku", row.sku.sku.backendSku.trim());
        if (row.sku.sku.customSku?.trim()) params.set("customSku", row.sku.sku.customSku.trim());
        navigate(`${config.routes.adjustments}?${params.toString()}`);
      },
    },
  ];

  useEffect(() => {
    void loadWarehouses();
  }, []);

  // Referencia para evitar dobles peticiones consecutivas o loops
  const fetchLockRef = useRef(false);

  useEffect(() => {
    if (fetchLockRef.current) return;
    fetchLockRef.current = true;
    
    void loadInventory().finally(() => {
      // Liberar el lock después de un corto tiempo para permitir futuras peticiones
      setTimeout(() => {
        fetchLockRef.current = false;
      }, 100);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, executedSnapshot, warehouseQuery, config.productType]);

  useEffect(() => {
    const unsubscribe = subscribeInventoryStockUpdated((event) => {
      let updatedAnyRow = false;

      setInventoryRows((current) =>
        current.map((row) => {
          if (row.warehouseId !== event.warehouseId) return row;
          if (row.stockItemId !== event.stockItemId) return row;
          updatedAnyRow = true;
          return {
            ...row,
            onHand: Number(event.onHand ?? row.onHand),
            reserved: Number(event.reserved ?? row.reserved),
            available: Number(event.available ?? row.available),
          };
        }),
      );

      // Si el evento no corresponde a filas visibles (por paginación/filtros),
      // hacemos refresh ligero con debounce para mantener coherencia.
      if (!updatedAnyRow && !realtimeRefreshTimeoutRef.current) {
        realtimeRefreshTimeoutRef.current = setTimeout(() => {
          realtimeRefreshTimeoutRef.current = null;
          void loadInventory();
        }, 350);
      }
    }, {
      warehouseIds: warehouseQuery.warehouseIdsIn.length ? warehouseQuery.warehouseIdsIn : undefined,
    });
    return () => {
      unsubscribe();
      if (realtimeRefreshTimeoutRef.current) {
        clearTimeout(realtimeRefreshTimeoutRef.current);
        realtimeRefreshTimeoutRef.current = null;
      }
    };
  }, [loadInventory, warehouseQuery.warehouseIdsIn]);

  const handleSaveMetric = useCallback(async (name: string) => {
    if (!hasInventorySearchCriteria(executedSnapshot)) return false;

    setSavingMetric(true);
    try {
      const response = await saveInventorySearchMetric({
        name,
        productType: config.productType,
        snapshot: executedSnapshot,
      });

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
  }, [config.productType, executedSnapshot, loadSearchState, showFlash]);

  const handleDeleteMetric = useCallback(async (metricId: string) => {
    try {
      const response = await deleteInventorySearchMetric({
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

  const handleExport = useCallback(async (columnsToExport: Array<{ key: string; label: string }>) => {
    setExporting(true);
    try {
      const file = await exportInventoryExcel({
        page,
        limit: DEFAULT_LIMIT,
        q: executedSnapshot.q,
        filters: JSON.stringify(executedSnapshot.filters),
        productType: config.productType,
        columns: columnsToExport,
      } as any);
      const url = URL.createObjectURL(file.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.filename;
      a.click();
      URL.revokeObjectURL(url);
      showFlash(successResponse("Excel exportado correctamente"));
    } catch {
      showFlash(errorResponse("No se pudo exportar el Excel"));
    } finally {
      setExporting(false);
    }
  }, [config.productType, executedSnapshot.filters, executedSnapshot.q, page, showFlash]);

  const handleSaveExportPreset = useCallback(async (payload: { name: string; columns: Array<{ key: string; label: string }> }) => {
    await saveInventoryExportPreset({
      name: payload.name,
      columns: payload.columns,
      productType: config.productType,
      useDateRange: false,
    });
    await loadExportPresets();
  }, [config.productType, loadExportPresets]);

  const handleDeleteExportPreset = useCallback(async (metricId: string) => {
    await deleteInventoryExportPreset({
      metricId,
      productType: config.productType,
    });
    await loadExportPresets();
  }, [config.productType, loadExportPresets]);

  const columns = useMemo<DataTableColumn<InventorySnapshotRow>[]>(
    () => [
      {
        id: "name",
        header: config.itemLabel,
        cell: (row) =>
          buildSkuLabelFromItem({
            skuItem: row.sku,
            fallbackName: row.sku.sku.name ?? "",
            withCode: false,
          }),
      },
      {
        id: "warehouse",
        header: "Almacen",
        sortAccessor: (row) => row.warehouseName,
        cell: (row) => <span className="text-black/70">{row.warehouseName}</span>,
      },
      {
        id: "onHand",
        header: "Stock",
        className: "text-center tabular-nums",
        headerClassName: "text-center [&>div]:justify-center",
        cell: (row) => row.onHand,
      },
      {
        id: "reserved",
        header: "Reservado",
        className: "text-center tabular-nums",
        headerClassName: "text-center [&>div]:justify-center",
        cell: (row) => row.reserved,
      },
      {
        id: "available",
        header: "Disponible",
        className: "text-center tabular-nums font-semibold",
        headerClassName: "text-center [&>div]:justify-center",
        cell: (row) => row.available,
      },
      {
        id: "actions",
        header: "Acciones",
        headerClassName: "text-center [&>div]:justify-center",
        className: "text-center",
        stopRowClick: true,
        cell: (row) => (
          <div className="flex justify-center">
            <ActionsPopover
              actions={buildInventoryActions(row)}
              columns={1}
              compact
              showLabels
              triggerIcon={<Menu className="h-4 w-4" />}
              popoverClassName="min-w-52"
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
          </div>
        ),
      },
    ],
    [companyActionDisabled, config.itemLabel, config.routes.adjustments, config.routes.kardex, config.routes.transfer, navigate],
  );

  return (
    <PageShell>
      <PageTitle title={config.pageTitle} />
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Headed title={config.headingTitle} size="lg" />
          {exportColumns.length ? (
            <ExportPopover
              columns={exportColumns}
              presets={exportPresets}
              loading={exporting}
              onSavePreset={handleSaveExportPreset}
              onDeletePreset={handleDeleteExportPreset}
              onExport={handleExport}
            />
          ) : null}
        </div>

        <section>
          <div className="space-y-3">
            <div className="xl:col-span-2">
              <DataTableSearchChips
                chips={searchChips}
                onRemove={(chip) => handleRemoveChip(chip.removeKey)}
              />
              <DataTable
                tableId={config.tableId}
                data={inventoryRows}
                columns={columns}
                rowKey={(row, index) =>
                  `${row.sku.sku.id}-${row.warehouseId}-${index}`
                }
                loading={loading}
                emptyMessage="No hay registros con los filtros actuales."
                hoverable
                animated={!shouldReduceMotion}
                showSearch={false}
                selectableColumns
                toolbarSearchContent={
                  <DataTableSearchBar
                    value={searchText}
                    onChange={setSearchText}
                    onSubmitSearch={submitSearch}
                    searchLabel={config.searchLabel}
                    searchName={config.searchName}
                    canSaveMetric={hasInventorySearchCriteria(executedSnapshot)}
                    saveLoading={savingMetric}
                    onSaveMetric={handleSaveMetric}
                  >
                    <InventorySmartSearchPanel
                      recent={recentSearches}
                      saved={savedMetrics}
                      columns={smartSearchColumns}
                      snapshot={draftSnapshot}
                      catalogs={smartSearchCatalogs}
                      labels={{ item: config.itemLabel }}
                      filterQuery={searchText}
                      onApplySnapshot={applySmartSnapshot}
                      onApplyRule={handleApplySearchRule}
                      onRemoveRule={handleRemoveSearchRule}
                      onDeleteMetric={handleDeleteMetric}
                    />
                  </DataTableSearchBar>
                }
                pagination={{
                  page,
                  limit: DEFAULT_LIMIT,
                  total: inventoryTotal,
                }}
                onPageChange={(nextPage) => setPage(nextPage)}
                onRowClick={(row) => {
                  setSelectedSku(row.sku.sku.id);
                  setSelectedWarehouseId(row.warehouseId);
                  setForecastModalOpen(true);
                  void loadForecast(row.sku.sku.id, row.warehouseId);
                }}
                rowClassName={(row) =>
                  isActiveRow(row)
                    ? "bg-black/5 hover:bg-black/5"
                    : "hover:bg-black/[0.03]"
                }
              />
            </div>
          </div>
        </section>

        <InventoryForecastModal
          open={forecastModalOpen}
          onClose={() => {
            setForecastModalOpen(false);
            setSelectedSku(null);
            setSelectedWarehouseId(null);
          }}
          loading={forecastLoading}
          forecast={selectedForecast}
        />
      </div>
    </PageShell>
  );
}
