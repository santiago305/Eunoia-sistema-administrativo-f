import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import * as echarts from "echarts";
import { useReducedMotion } from "framer-motion";
import { PageTitle } from "@/components/PageTitle";
import { PageShell } from "@/components/layout/PageShell";
import { Headed } from "@/components/Headed";
import { FloatingInput } from "@/components/FloatingInput";
import { FloatingSelect } from "@/components/FloatingSelect";
import { SectionHeaderForm } from "@/components/SectionHederForm";
import { ActionsPopover, type ActionItem } from "@/components/ActionsPopover";
import { DataTable } from "@/components/table/DataTable";
import type { DataTableColumn } from "@/components/table/types";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { errorResponse } from "@/common/utils/response";
import { listActive } from "@/services/warehouseServices";
import {
  getSkuStockSnapshots,
  listAvailableStockSkus,
  listInventory,
  type AvailableStockByWarehouse,
  type SkuStockForecast,
} from "@/services/inventoryService";
import { RoutesPaths } from "@/router/config/routesPaths";
import type { Warehouse } from "@/pages/warehouse/types/warehouse";
import type { ProductSkuWithAttributes } from "@/pages/catalog/types/product";
import { ProductTypes } from "@/pages/catalog/types/ProductTypes";
import { FileText, Filter, LineChart, Menu, Wrench, ArrowLeftRight } from "lucide-react";
import { normalizeQuantity  } from "@/utils/functionPurchases";
import { useEChart } from "../catalog/utils/inventoryUtils";
import { buildSkuLabelFromItem } from "../catalog/utils/productCreateModal.helpers";

const DEFAULT_LIMIT = 10;

type InventorySnapshotRow = {
  sku: ProductSkuWithAttributes;
  warehouseId: string;
  warehouseName: string;
  onHand: number;
  reserved: number;
  available: number;
};

export default function CatalogInventory() {
  const shouldReduceMotion = useReducedMotion();
  const { showFlash } = useFlashMessage();
  const navigate = useNavigate();
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

  const [warehouseId, setWarehouseId] = useState("all");
  const [warehouseOptions, setWarehouseOptions] = useState<
    { value: string; label: string }[]
  >([]);

  const [selectedSku, setSelectedSku] = useState<string | null>(null);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(null);
  const [tableSearch, setTableSearch] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [inventoryRows, setInventoryRows] = useState<InventorySnapshotRow[]>([]);
  const [inventoryTotal, setInventoryTotal] = useState(0);
  const [selectedAvailability, setSelectedAvailability] = useState<AvailableStockByWarehouse[]>([]);
  const [, setAvailabilityLoading] = useState(false);
  const availabilityRequestRef = useRef(0);
  const [selectedForecast, setSelectedForecast] = useState<SkuStockForecast | null>(null);
  const [, setForecastLoading] = useState(false);
  const forecastRequestRef = useRef(0);
  const isActiveRow = (row: InventorySnapshotRow) =>
    selectedSku === row.sku.sku.id && selectedWarehouseId === row.warehouseId;

  const warehouseFilter = warehouseId === "all" ? undefined : warehouseId || undefined;

  useEffect(() => {
    if (!selectedSku) {
      setSelectedAvailability([]);
      availabilityRequestRef.current += 1;
      setAvailabilityLoading(false);
      setSelectedForecast(null);
      forecastRequestRef.current += 1;
      setForecastLoading(false);
      return;
    }
  }, [selectedSku]);


  useEffect(() => {
    const id = setTimeout(() => {
      setSearchTerm(tableSearch.trim());
    }, 400);

    return () => clearTimeout(id);
  }, [tableSearch]);

  useEffect(() => {
    setPage(1);
  }, [warehouseId, tableSearch]);

  const availabilityChart = useMemo<echarts.EChartsOption>(() => {
    const warehouseNames = selectedAvailability.map(
      (row) => row.warehouseName || row.warehouseId,
    );
    const perWarehouse = selectedAvailability.map((row) => row.available);

    return {
      ...animationConfig,
      tooltip: { trigger: "axis" },
      grid: { left: 20, right: 16, top: 10, bottom: 20, containLabel: true },
      xAxis: {
        type: "category",
        data: warehouseNames,
        axisLabel: { color: "#111" },
      },
      yAxis: { type: "value", axisLabel: { color: "#111" } },
      series: [
        {
          type: "bar",
          data: perWarehouse,
          itemStyle: { color: "#0f766e" },
          barWidth: 18,
        },
      ],
    };
  }, [animationConfig, selectedAvailability]);

  const refLarge = useEChart(availabilityChart);
  const refCompact = useEChart(availabilityChart);

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

  const refForecastLarge = useEChart(forecastChart);
  const refForecastCompact = useEChart(forecastChart);

  const loadAvailability = async (skuId: string) => {
    const requestId = (availabilityRequestRef.current += 1);
    setAvailabilityLoading(true);

    try {
      const response = await listAvailableStockSkus({
        skuId,
        ...(warehouseFilter ? { warehouseId: warehouseFilter } : {}),
        ...(searchTerm ? { q: searchTerm } : {}),
        productType: ProductTypes.PRODUCT,
      });

      if (availabilityRequestRef.current !== requestId) return;

      const selectedItem =
        response.items.find((item) => item.skuId === skuId) ??
        response.items[0] ??
        null;

      setSelectedAvailability(selectedItem?.availabilityByWarehouse ?? []);
    } catch {
      if (availabilityRequestRef.current !== requestId) return;
      setSelectedAvailability([]);
      showFlash(errorResponse("Error al cargar disponibilidad"));
    } finally {
      if (availabilityRequestRef.current === requestId) {
        setAvailabilityLoading(false);
      }
    }
  };

  const loadForecast = async (skuId: string) => {
    const requestId = (forecastRequestRef.current += 1);
    setForecastLoading(true);

    try {
      const response = await getSkuStockSnapshots(
        skuId,
        warehouseFilter ? { warehouseId: warehouseFilter } : undefined,
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
        warehouseId: warehouseFilter,
        q: searchTerm || undefined,
        productType: ProductTypes.MATERIAL,
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
        navigate(RoutesPaths.KardexFinished);
      },
    },
    {
      id: `transfer-${row.sku.sku.id}`,
      label: "Transferir",
      icon: <ArrowLeftRight className="h-4 w-4 text-black/60" />,
      onClick: () => {
        navigate(RoutesPaths.catalogTransfer);
      },
    },
    {
      id: `adjust-${row.sku.sku.id}`,
      label: "Ajustar",
      icon: <Wrench className="h-4 w-4 text-black/60" />,
      onClick: () => {
        navigate(RoutesPaths.catalogAdjustments);
      },
    },
  ];

  useEffect(() => {
    void loadWarehouses();
  }, []);

  useEffect(() => {
    void loadInventory();
  }, [page, warehouseId, searchTerm]);

  const columns = useMemo<DataTableColumn<InventorySnapshotRow>[]>(
    () => [
      {
        id: "name",
        header: "SKU",
        cell: (row, index) =>
          buildSkuLabelFromItem({
            skuItem: row.sku,        
            index,
            fallbackName: row.sku.sku.name ?? "",
          }),
      },
      {
        id: "warehouse",
        header: "Almacén",
        cell: (row) => <span className="text-black/70">{row.warehouseName}</span>,
      },
      {
        id: "onHand",
        header: "Stock",
        className: "text-right tabular-nums",
        headerClassName: "text-left",
        cell: (row) => row.onHand,
      },
      {
        id: "reserved",
        header: "Reservado",
        className: "text-right tabular-nums",
        headerClassName: "text-left",
        cell: (row) => row.reserved,
      },
      {
        id: "available",
        header: "Disponible",
        className: "text-right tabular-nums font-semibold",
        headerClassName: "text-left",
        cell: (row) => row.available,
      },
      {
        id: "actions",
        header: "Acciones",
        headerClassName: "text-right",
        className: "text-right",
        cell: (row) => (
          <div className="flex justify-end">
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
    [navigate],
  );


  return (
    <PageShell>
      <PageTitle title="Catalogo - Inventario" />
      <div className="space-y-4">
          <Headed
            title="Inventario de materiales"
            subtitle="Explora el stock por SKU y almacén."
            size="lg"
          />
        <section className="rounded-sm border border-black/10 bg-gray-50 p-5 shadow-sm space-y-4">
          <SectionHeaderForm icon={Filter} title="Filtros" />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[0.6fr_0.6fr_1fr]">
            <FloatingSelect
              label="Almacén"
              name="warehouseId"
              value={warehouseId}
              onChange={(value) => {
                setWarehouseId(value);
                setSelectedSku(null);
                setSelectedWarehouseId(null);
              }}
              options={warehouseOptions}
              searchable
              searchPlaceholder="Buscar almacén..."
              emptyMessage="Sin almacenes"
            />
            <FloatingInput
              label="SKU"
              name="sku"
              value={tableSearch}
              onChange={(event) => {
                setTableSearch(event.target.value);
                setSelectedSku(null);
                setSelectedWarehouseId(null);
                setPage(1);
              }}
            />
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-[3fr_1.7fr] gap-4">
          <div className="space-y-3">
             <div className="xl:col-span-2">
                <DataTable
                  tableId="catalog-inventory-table"
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
                  searchValue={tableSearch}
                  onSearchChange={(value) => {
                    setTableSearch(value);
                    setSelectedSku(null);
                    setSelectedWarehouseId(null);
                  }}
                  globalSearchFn={() => true}
                  pagination={{
                    page,
                    limit: DEFAULT_LIMIT,
                    total: inventoryTotal,
                  }}
                  onPageChange={(nextPage) => setPage(nextPage)}
                  onRowClick={(row) => {
                    setSelectedSku(row.sku.sku.id);
                    setSelectedWarehouseId(row.warehouseId);
                    void loadAvailability(row.sku.sku.id);
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
          <div className="space-y-4">
            <div className="rounded-sm border border-black/10 bg-white p-5 shadow-sm">
              <SectionHeaderForm icon={LineChart} title="Disponibilidad" />
              {!selectedSku ? (
                <div className="mt-4 text-sm text-black/60">
                  Selecciona un SKU para ver disponibilidad.
                </div>
              ) : (
                <>
                  <div
                    ref={refLarge}
                    className="mt-4 hidden lg:block"
                    style={{ height: 180 }}
                  />
                  <div
                    ref={refCompact}
                    className="mt-4 lg:hidden"
                    style={{ height: 180 }}
                  />
                </>
              )}
            </div>
            <div className="rounded-sm border border-black/10 bg-white p-5 shadow-sm">
              <SectionHeaderForm icon={LineChart} title="Proyección semanal" />
              {!selectedSku ? (
                <div className="mt-4 text-sm text-black/60">
                  Selecciona un SKU para ver forecast.
                </div>
              ) : (
                <>
                  <div
                    className="mt-4 grid grid-cols-3 gap-2 text-[11px]"
                  >
                    <div className="rounded-lg border border-black/10 bg-black/[0.02] px-3 py-2">
                      Proyección diaria:{" "}
                      <span className="font-semibold text-black">
                        {selectedForecast
                          ? Number.isFinite(selectedForecast.forecastDaily)
                            ? normalizeQuantity(selectedForecast.forecastDaily)
                            : "—"
                          : "—"}
                      </span>
                    </div>
                    <div className="rounded-lg border border-black/10 bg-black/[0.02] px-3 py-2">
                      Días stock:{" "}
                      <span className="font-semibold text-black"><br/>
                        {selectedForecast
                          ? typeof selectedForecast.daysOfStock === "number"
                            ? normalizeQuantity(selectedForecast.daysOfStock)
                            : "—"
                          : "—"}
                      </span>
                    </div>
                  <div className="rounded-lg border border-black/10 bg-black/[0.02] px-3 py-2">
                    T. Crecimiento:{" "}
                    <span className="font-semibold text-black"><br/>
                      {selectedForecast
                        ? Number.isFinite(selectedForecast.trendPct)
                          ? `${(Math.abs(selectedForecast.trendPct) <= 1
                              ? selectedForecast.trendPct * 100
                              : selectedForecast.trendPct
                            ).toFixed(1)}%`
                          : "—"
                        : "—"}
                    </span>
                  </div>
                  </div>
                  <div
                    ref={refForecastLarge}
                    className="mt-4 hidden lg:block"
                    style={{ height: 180 }}
                  />
                  <div
                    ref={refForecastCompact}
                    className="mt-4 lg:hidden"
                    style={{ height: 180 }}
                  />
                </>
              )}
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
