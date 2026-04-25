import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import * as echarts from "echarts";
import { useReducedMotion } from "framer-motion";
import { PageTitle } from "@/components/PageTitle";
import { PageShell } from "@/components/layout/PageShell";
import { Headed } from "@/components/Headed";
import { Modal } from "@/components/modales/Modal";
import { ActionsPopover, type ActionItem } from "@/components/ActionsPopover";
import { DataTable } from "@/components/table/DataTable";
import type { DataTableColumn } from "@/components/table/types";
import {
  DataTableSearchBar,
  DataTableSearchChips,
  type DataTableRecentSearchItem,
} from "@/components/table/search";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { errorResponse } from "@/common/utils/response";
import { listActive } from "@/services/warehouseServices";
import {
  getSkuStockSnapshots,
  listInventory,
  type SkuStockForecast,
} from "@/services/inventoryService";
import type { Warehouse } from "@/pages/warehouse/types/warehouse";
import type {
  ProductCatalogProductType,
  ProductSkuWithAttributes,
} from "@/pages/catalog/types/product";
import {  useEChart } from "../utils/inventoryUtils";
import { useCompany } from "@/hooks/useCompany";
import { ArrowLeftRight, FileText, Menu, Wrench } from "lucide-react";
import { InventorySmartSearchPanel } from "@/pages/catalog/components/InventorySmartSearchPanel";
import { buildSkuLabelFromItem } from "../utils/productCreateModal.helpers";
import { normalizeQuantity  } from "@/utils/functionPurchases";
import type {
  InventorySearchFilterKey,
  InventorySearchFilters,
  InventorySearchRule,
  InventorySearchSnapshot,
} from "@/pages/catalog/utils/inventorySmartSearch";
import {
  buildInventorySearchChips,
  buildInventorySmartSearchColumns,
  createEmptyInventorySearchFilters,
  findInventorySearchRule,
  removeInventorySearchKey,
  sanitizeInventorySearchSnapshot,
  upsertInventorySearchRule,
} from "@/pages/catalog/utils/inventorySmartSearch";
import { loadLocalRecentSearches, pushLocalRecentSearch } from "@/utils/localRecentSearches";

const DEFAULT_LIMIT = 10;

type InventoryStockPageConfig = {
  productType: ProductCatalogProductType;
  pageTitle: string;
  headingTitle: string;
  recentStorageKey: string;
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
  const animationConfig = useMemo<
    Pick<
      echarts.EChartsOption,
      | "animation"
      | "animationDuration"
      | "animationEasing"
      | "animationDurationUpdate"
      | "animationEasingUpdate"
    >
  >(
    () => ({
      animation: !shouldReduceMotion,
      animationDuration: 800,
      animationEasing: "cubicOut",
      animationDurationUpdate: 300,
      animationEasingUpdate: "cubicOut",
    }),
    [shouldReduceMotion],
  );

  const [warehouseOptions, setWarehouseOptions] = useState<
    { value: string; label: string }[]
  >([]);

  const [selectedSku, setSelectedSku] = useState<string | null>(null);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [appliedSearchText, setAppliedSearchText] = useState("");
  const [searchFilters, setSearchFilters] = useState<InventorySearchFilters>(() =>
    createEmptyInventorySearchFilters(),
  );
  const [recentSearches, setRecentSearches] = useState<
    DataTableRecentSearchItem<InventorySearchSnapshot>[]
  >(() => loadLocalRecentSearches(config.recentStorageKey));
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [inventoryRows, setInventoryRows] = useState<InventorySnapshotRow[]>([]);
  const [inventoryTotal, setInventoryTotal] = useState(0);
  const [forecastModalOpen, setForecastModalOpen] = useState(false);
  const [selectedForecast, setSelectedForecast] = useState<SkuStockForecast | null>(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const forecastRequestRef = useRef(0);

  const isActiveRow = (row: InventorySnapshotRow) =>
    selectedSku === row.sku.sku.id && selectedWarehouseId === row.warehouseId;

  const smartSearchCatalogs = useMemo(
    () => ({
      warehouses: warehouseOptions
        .filter((option) => option.value !== "all")
        .map((option) => ({ id: option.value, label: option.label })),
    }),
    [warehouseOptions],
  );

  const smartSearchColumns = useMemo(
    () => buildInventorySmartSearchColumns(smartSearchCatalogs),
    [smartSearchCatalogs],
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
    () => buildInventorySearchChips(executedSnapshot, smartSearchCatalogs),
    [executedSnapshot, smartSearchCatalogs],
  );

  const buildRecentLabel = useCallback(
    (snapshot: InventorySearchSnapshot) => {
      const chips = buildInventorySearchChips(snapshot, smartSearchCatalogs);
      return chips.map((chip) => chip.label).join(" · ") || "Búsqueda";
    },
    [smartSearchCatalogs],
  );

  const recordRecentSearch = useCallback(
    (snapshot: InventorySearchSnapshot) => {
      const hasFilters = Boolean(snapshot.filters.length);
      const hasQuery = Boolean(snapshot.q);
      if (!hasFilters && !hasQuery) return;

      const normalized = sanitizeInventorySearchSnapshot(snapshot);
      const id = JSON.stringify(normalized);
      const label = buildRecentLabel(normalized);

      setRecentSearches(
        pushLocalRecentSearch(config.recentStorageKey, {
          id,
          label,
          snapshot: normalized,
        }),
      );
    },
    [buildRecentLabel, config.recentStorageKey],
  );

  const applySmartSnapshot = (snapshot: InventorySearchSnapshot) => {
    const normalized = sanitizeInventorySearchSnapshot(snapshot);
    setSearchText(normalized.q ?? "");
    setAppliedSearchText(normalized.q ?? "");
    setSearchFilters(normalized.filters);
    recordRecentSearch(normalized);
    setSelectedSku(null);
    setSelectedWarehouseId(null);
    setPage(1);
  };

  const submitSearch = () => {
    const next = searchText.trim();
    const nextSnapshot = sanitizeInventorySearchSnapshot({
      q: next,
      filters: searchFilters,
    });

    recordRecentSearch(nextSnapshot);
    setAppliedSearchText(next);
    setSelectedSku(null);
    setSelectedWarehouseId(null);
    setPage(1);
  };

  const handleApplySearchRule = (rule: InventorySearchRule) => {
    const next = upsertInventorySearchRule(
      sanitizeInventorySearchSnapshot({ q: searchText, filters: searchFilters }),
      rule,
    );
    setSearchFilters(next.filters);
    recordRecentSearch(
      sanitizeInventorySearchSnapshot({
        q: appliedSearchText,
        filters: next.filters,
      }),
    );
    setSelectedSku(null);
    setSelectedWarehouseId(null);
    setPage(1);
  };

  const handleRemoveSearchRule = (fieldId: InventorySearchFilterKey) => {
    const next = removeInventorySearchKey(
      sanitizeInventorySearchSnapshot({ q: searchText, filters: searchFilters }),
      fieldId,
    );
    setSearchFilters(next.filters);
    recordRecentSearch(
      sanitizeInventorySearchSnapshot({
        q: appliedSearchText,
        filters: next.filters,
      }),
    );
    setSelectedSku(null);
    setSelectedWarehouseId(null);
    setPage(1);
  };

  const handleRemoveChip = (key: "q" | InventorySearchFilterKey) => {
    const nextSnapshot = removeInventorySearchKey(
      sanitizeInventorySearchSnapshot({ q: appliedSearchText, filters: searchFilters }),
      key,
    );
    setSearchText(nextSnapshot.q ?? "");
    setAppliedSearchText(nextSnapshot.q ?? "");
    setSearchFilters(nextSnapshot.filters);
    recordRecentSearch(nextSnapshot);
    setSelectedSku(null);
    setSelectedWarehouseId(null);
    setPage(1);
  };

  useEffect(() => {
    if (!selectedSku) {
      setSelectedForecast(null);
      forecastRequestRef.current += 1;
      setForecastLoading(false);
      return;
    }
  }, [selectedSku]);

  const forecastChart = useMemo<echarts.EChartsOption>(() => {
    const categories = ["S1", "S2", "S3", "S4", "S5"];

    if (!selectedForecast) {
      return {
        ...animationConfig,
        tooltip: { trigger: "axis" },
        grid: { left: 20, right: 16, top: 10, bottom: 20, containLabel: true },
        xAxis: { type: "category", data: categories, axisLabel: { color: "#111" } },
        yAxis: { type: "value", axisLabel: { color: "#111" } },
        series: [],
      };
    }

    const formatDateLabel = (value?: string | null) => {
      if (!value) return "";
      const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (!match) return value.slice(0, 10);
      const [, year, month, day] = match;
      return `${day}/${month}/${year}`;
    };

    const formatRange = (from?: string | null, toExclusive?: string | null) => {
      const start = formatDateLabel(from);
      const end = formatDateLabel(toExclusive);
      if (!start && !end) return "";
      if (!end) return `${start} →`;
      if (!start) return `→ ${end}`;
      return `${start} → ${end}`;
    };

    const weekRangesByCategory = new Map<string, string>();
    categories.slice(0, 4).forEach((category, index) => {
      const weekNumber = (index + 1) as 1 | 2 | 3 | 4;
      const week = selectedForecast.weeks.find((entry) => entry.week === weekNumber);
      const range = week ? formatRange(week.from, week.toExclusive) : "";
      if (range) weekRangesByCategory.set(category, range);
    });

    const currentWeekRange = selectedForecast.currentWeek
      ? formatRange(selectedForecast.currentWeek.from, selectedForecast.currentWeek.toExclusive)
      : "";
    if (currentWeekRange) weekRangesByCategory.set("S5", currentWeekRange);

    const outQtyByWeek = new Map<number, number>();
    selectedForecast.weeks.forEach((week) => {
      outQtyByWeek.set(week.week, week.outQty ?? 0);
    });

    const weeklyBars = [1, 2, 3, 4].map((weekNumber) => outQtyByWeek.get(weekNumber) ?? 0);
    const currentWeekQty =
      typeof selectedForecast.currentWeek?.outQty === "number"
        ? selectedForecast.currentWeek.outQty
        : null;
    const forecastLine = [null, null, null, null, selectedForecast.forecastWeekly];
    const stockLine = categories.map(() => selectedForecast.stock.available);

    const tooltipFormatter = (params: any) => {
      const items = Array.isArray(params) ? params : [params];
      if (!items.length) return "";
      const axisLabel = items[0]?.axisValueLabel ?? items[0]?.name ?? "";
      const range = weekRangesByCategory.get(axisLabel) ?? "";
      const lines: string[] = [];
      if (range) lines.push(`${range}`);
      items.forEach((item: any) => {
        let value = item?.value;
        if (value && typeof value === "object" && "value" in value) {
          value = (value as any).value;
        }
        lines.push(`${item.marker}${item.seriesName}: ${normalizeQuantity(value) ?? 0}`);
      });
      return lines.join("<br/>");
    };

    return {
      ...animationConfig,
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, formatter: tooltipFormatter },
      legend: { top: 0, left: "center", data: ["Salidas", "Proyección", "Stock"] },
      grid: { left: 20, right: 16, top: 24, bottom: 20, containLabel: true },
      xAxis: { type: "category", data: categories, axisLabel: { color: "#111" } },
      yAxis: { type: "value", axisLabel: { color: "#111" } },
      series: [
        {
          name: "Salidas",
          type: "bar",
          data: [
            ...weeklyBars,
            currentWeekQty === null
              ? null
              : {
                  value: currentWeekQty,
                  itemStyle: { color: "#9ca3af" },
                },
          ],
          itemStyle: { color: "#0f766e" },
          barWidth: 18,
        },
        {
          name: "Proyección",
          type: "line",
          data: forecastLine,
          symbol: "circle",
          symbolSize: 7,
          lineStyle: { color: "#2563eb", type: "dashed", width: 2 },
          itemStyle: { color: "#2563eb" },
        },
        {
          name: "Stock",
          type: "line",
          data: stockLine,
          symbol: "none",
          lineStyle: { color: "#ea580c", width: 2 },
        },
      ],
    };
  }, [animationConfig, selectedForecast]);

  const refForecast = useEChart(forecastChart);

  const loadForecast = async (skuId: string) => {
    const requestId = (forecastRequestRef.current += 1);
    setForecastLoading(true);

    try {
      const response = await getSkuStockSnapshots(
        skuId,
        warehouseQuery.detailWarehouseId ? { warehouseId: warehouseQuery.detailWarehouseId } : undefined,
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

  const loadInventory = async () => {
    if (loading) return;
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
      } as unknown as Record<string, unknown>)) as unknown as {
        items?: InventorySnapshotRow[];
        total?: number;
        page?: number;
      };

      const items = res.items ?? [];
      setInventoryRows(items);
      setInventoryTotal(res.total ?? items.length);
      if (res.page && res.page !== page) setPage(res.page);
    } catch {
      setInventoryRows([]);
      setInventoryTotal(0);
      showFlash(errorResponse("Error al cargar inventario"));
    } finally {
      setLoading(false);
    }
  };


  const buildInventoryActions = (row: InventorySnapshotRow): ActionItem[] => [
    {
      id: `kardex-${row.sku.sku.id}`,
      label: "Ver kardex",
      icon: <FileText className="h-4 w-4 text-black/60" />,
      onClick: () => {
        navigate(config.routes.kardex);
      },
    },
    {
      id: `transfer-${row.sku.sku.id}`,
      label: "Transferir",
      icon: <ArrowLeftRight className="h-4 w-4 text-black/60" />,
      disabled: companyActionDisabled,
      onClick: () => {
        navigate(config.routes.transfer);
      },
    },
    {
      id: `adjust-${row.sku.sku.id}`,
      label: "Ajustar",
      icon: <Wrench className="h-4 w-4 text-black/60" />,
      disabled: companyActionDisabled,
      onClick: () => {
        navigate(config.routes.adjustments);
      },
    },
  ];

  useEffect(() => {
    void loadWarehouses();
  }, []);

  useEffect(() => {
    void loadInventory();
  }, [config.productType, executedSnapshot, page, warehouseQuery]);

  const columns = useMemo<DataTableColumn<InventorySnapshotRow>[]>(
    () => [
      {
        id: "name",
        header: "SKU",
        cell: (row) =>
          buildSkuLabelFromItem({
            skuItem: row.sku,
            fallbackName: row.sku.sku.name ?? "",
          }),
      },
      {
        id: "warehouse",
        header: "Almacén",
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
	    [companyActionDisabled, config.routes.adjustments, config.routes.kardex, config.routes.transfer, navigate],
	  );


  return (
    <PageShell>
      <PageTitle title={config.pageTitle} />
      <div className="space-y-2">
          <Headed
            title={config.headingTitle}
            subtitle="Explora el stock por SKU y almacén."
            size="lg"
          />

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
                      onChange={(value) => {
                        setSearchText(value);
                      }}
                      onSubmitSearch={submitSearch}
                      searchLabel={config.searchLabel}
                      searchName={config.searchName}
                    >
                      <InventorySmartSearchPanel
                        recent={recentSearches}
                        columns={smartSearchColumns}
                        snapshot={draftSnapshot}
                        catalogs={smartSearchCatalogs}
                        filterQuery={searchText}
                        onApplySnapshot={applySmartSnapshot}
                        onApplyRule={handleApplySearchRule}
                        onRemoveRule={handleRemoveSearchRule}
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
                    void loadForecast(row.sku.sku.id);
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
        <Modal
          open={forecastModalOpen}
          onClose={() => {
            setForecastModalOpen(false);
            setSelectedSku(null);
            setSelectedWarehouseId(null);
          }}
          title="Proyección semanal"
          className="w-[min(56rem,calc(100vw-2rem))]"
          bodyClassName="p-5"
        >
          {forecastLoading ? (
            <div className="flex h-[320px] items-center justify-center text-sm text-black/60">
              Cargando proyección...
            </div>
          ) : selectedForecast ? (
            <div ref={refForecast} className="h-[320px] w-full" />
          ) : (
            <div className="flex h-[320px] items-center justify-center text-sm text-black/60">
              No hay datos de proyección para este SKU.
            </div>
          )}
        </Modal>
      </div>
    </PageShell>
  );
}
