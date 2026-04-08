import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import * as echarts from "echarts";
import { motion, useReducedMotion } from "framer-motion";
import { PageTitle } from "@/components/PageTitle";
import { PageShell } from "@/components/layout/PageShell";
import { Headed } from "@/components/Headed";
import { FloatingSelect } from "@/components/FloatingSelect";
import { SectionHeaderForm } from "@/components/SectionHederForm";
import { SystemButton } from "@/components/SystemButton";
import { ActionsPopover, type ActionItem } from "@/components/ActionsPopover";
import { DataTable } from "@/components/table/DataTable";
import type { DataTableColumn } from "@/components/table/types";
import { FloatingInput } from "@/components/FloatingInput";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { useInventoryAnalytics } from "@/hooks/useInventoryAnalytics";
import { errorResponse } from "@/common/utils/response";
import { listActive } from "@/services/warehouseServices";
import { searchProductAndVariant } from "@/services/catalogService";
import { getAvailability, listInventory } from "@/services/inventoryService";
import { RoutesPaths } from "@/Router/config/routesPaths";
import type { Warehouse } from "@/pages/warehouse/types/warehouse";
import type { InventoryRow } from "@/pages/catalog/types/inventory";
import type { FinishedProducts } from "@/pages/catalog/types/variant";
import { ProductTypes } from "@/pages/catalog/types/ProductTypes";
import { Boxes, FileText, Filter, LineChart, Menu, Wrench, ArrowLeftRight } from "lucide-react";
import { buildMonthEndIso, buildMonthStartIso, toDateInputValue, tryShowPicker } from "@/utils/functionPurchases";
import { aggregateByWarehouse, mapSnapshotToRow, useEChart } from "./data/inventoryUtils";


const DEFAULT_LIMIT = 10;



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

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(null);
  const [tableSearch, setTableSearch] = useState("");
  const [productQuery, setProductQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [fromDate, setFromDate] = useState(buildMonthStartIso());
  const [toDate, setToDate] = useState(buildMonthEndIso());
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [loading, setLoading] = useState(false);

  const [inventoryRows, setInventoryRows] = useState<InventoryRow[]>([]);
  const [inventoryTotal, setInventoryTotal] = useState(0);
  const [availabilityRows, setAvailabilityRows] = useState<InventoryRow[]>([]);
  const [productResults, setProductResults] = useState<FinishedProducts[]>([]);

  const summary = useMemo(() => {
    const total = inventoryRows.length;
    const available = inventoryRows.filter((row) => row.available > 0).length;
    const reserved = inventoryRows.filter((row) => row.reserved > 0).length;
    return {
      total: inventoryTotal,
      availablePct: total ? Math.round((available / total) * 100) : 0,
      reservedPct: total ? Math.round((reserved / total) * 100) : 0,
    };
  }, [inventoryRows, inventoryTotal]);

  const activeItemId = selectedItemId ?? "";
  const isActiveRow = (row: InventoryRow) =>
    selectedItemId === row.stockItemId && selectedWarehouseId === row.warehouseId;

  const warehouseFilter = warehouseId === "all" ? undefined : warehouseId || undefined;
  const analyticsEnabled = true;
  const {
    dailySales,
    demand,
    loading: analyticsLoading,
    error: analyticsError,
  } = useInventoryAnalytics({
    warehouseId: warehouseFilter,
    stockItemId: activeItemId || undefined,
    from: fromDate || undefined,
    to: toDate || undefined,
    enabled: analyticsEnabled,
  });


  useEffect(() => {
    const id = setTimeout(() => {
      setSearchTerm(tableSearch.trim());
    }, 400);

    return () => clearTimeout(id);
  }, [tableSearch]);

  useEffect(() => {
    const id = setTimeout(() => {
      if (productQuery.trim()) {
        void searchFinishedProducts();
      } else {
        setProductResults([]);
      }
    }, 500);

    return () => clearTimeout(id);
  }, [productQuery]);

  useEffect(() => {
    setPage(1);
  }, [warehouseId, tableSearch]);

  const availabilityBase = useMemo(() => {
    if (!selectedItemId) return [];
    const rows = availabilityRows.length
      ? availabilityRows
      : inventoryRows.filter((row) => row.stockItemId === selectedItemId);
    return aggregateByWarehouse(rows);
  }, [availabilityRows, inventoryRows, selectedItemId]);

  const availabilityChart = useMemo<echarts.EChartsOption>(() => {
    const availabilityMap = new Map<string, number>();

    availabilityBase.forEach((row) => {
      availabilityMap.set(
        row.warehouse,
        (availabilityMap.get(row.warehouse) ?? 0) + row.available,
      );
    });

    const warehouseNames = Array.from(availabilityMap.keys());
    const perWarehouse = warehouseNames.map(
      (name) => availabilityMap.get(name) ?? 0,
    );

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
  }, [availabilityBase, animationConfig]);

  const refLarge = useEChart(availabilityChart);
  const refCompact = useEChart(availabilityChart);

  const weeklyChart = useMemo<echarts.EChartsOption>(() => {
    const weekLabels = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
    const weekNames = ["Semana 1", "Semana 2", "Semana 3", "Semana 4", "Semana 5"];
    const weekColors = ["#0f766e", "#2563eb", "#ea580c", "#16a34a", "#db2777"];
    const weekSeriesData = Array.from({ length: 5 }, () => Array(7).fill(0));
    const weekDates = Array.from({ length: 5 }, () =>
      Array.from({ length: 7 }, () => new Set<string>()),
    );
    const getMondayIndex = (date: Date) => (date.getDay() + 6) % 7;
    const getWeekOfMonth = (date: Date) => {
      const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
      const firstIndex = getMondayIndex(firstDay);
      return Math.floor((date.getDate() - 1 + firstIndex) / 7);
    };

    dailySales.forEach((entry) => {
      const rawDate = entry.day ?? entry.date;
      if (!rawDate) return;
      const normalized = rawDate.includes("T") ? rawDate : `${rawDate}T00:00:00`;
      const parsed = new Date(normalized);
      if (Number.isNaN(parsed.getTime())) return;
      const weekIndex = Math.min(4, Math.max(0, getWeekOfMonth(parsed)));
      const weekdayIndex = getMondayIndex(parsed);
      const amount = typeof entry.salida === "number" ? entry.salida : 0;
      weekSeriesData[weekIndex][weekdayIndex] += amount;
      const match = rawDate.match(/^\d{4}-\d{2}-\d{2}/);
      if (match) weekDates[weekIndex][weekdayIndex].add(match[0]);
    });

    const tooltipFormatter = (params: any) => {
      const items = Array.isArray(params) ? params : [params];
      if (!items.length) return "";
      const axisLabel = items[0]?.axisValueLabel ?? items[0]?.name ?? "";
      const weekdayIndex = weekLabels.indexOf(axisLabel);
      const lines = [axisLabel];
      items.forEach((item: any) => {
        const weekIndex = weekNames.indexOf(item.seriesName);
        if (weekIndex < 0 || weekdayIndex < 0) return;
        const dates = Array.from(weekDates[weekIndex][weekdayIndex] ?? []);
        if (!dates.length) return;
        const value =
          typeof item.value === "number"
            ? item.value
            : Array.isArray(item.value)
              ? item.value[1]
              : item.value ?? 0;
        lines.push(`${item.marker}${item.seriesName}: ${value} (${dates.join(", ")})`);
      });
      return lines.join("<br/>");
    };

    return {
      ...animationConfig,
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "cross" },
        formatter: tooltipFormatter,
      },
      color: weekColors,
      legend: { data: weekNames, top: 0, left: "center" },
      grid: { left: 20, right: 16, top: 24, bottom: 20, containLabel: true },
      xAxis: [{ type: "category", boundaryGap: false, data: weekLabels }],
      yAxis: [{ type: "value" }],
      series: weekNames.map((name, index) => ({
        name,
        type: "line",
        smooth: true,
        areaStyle: { opacity: 0.08 },
        emphasis: { focus: "series" },
        data: weekSeriesData[index],
      })),
    };
  }, [dailySales, animationConfig]);

  const refWeekly = useEChart(weeklyChart);

  const coverageText =
    demand?.coverageDays === null || demand?.coverageDays === undefined
      ? "N/A"
      : demand.coverageDays.toFixed(1);
  const rangeDays = useMemo(() => {
    const parseDateOnly = (value?: string | null) => {
      if (!value) return null;
      const match = value.match(/^\d{4}-\d{2}-\d{2}/);
      if (!match) return null;
      const date = new Date(`${match[0]}T00:00:00`);
      if (Number.isNaN(date.getTime())) return null;
      return date;
    };

    const start = parseDateOnly(fromDate);
    const end = parseDateOnly(toDate);
    if (!start || !end) return 0;
    return Math.max(
      0,
      Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1,
    );
  }, [fromDate, toDate]);

  const searchFinishedProducts = async () => {
    if (!productQuery.trim()) {
      setProductResults([]);
      return;
    }

    try {
      const res = await searchProductAndVariant({
        q: productQuery,
        raw: false,
        withRecipes: true,
      });
      setProductResults(res ?? []);
    } catch {
      setProductResults([]);
      showFlash(errorResponse("Error al cargar productos terminados"));
    }
  };

  const productOptions = useMemo(() => {
    const options = (productResults ?? []).map((v) => ({
      value: v.itemId ?? v.id ?? "",
      label: `${v.productName ?? "Producto"} ${v.attributes?.presentation ?? ""} ${v.attributes?.variant ?? ""} ${v.attributes?.color ?? ""} ${
        v.sku ? ` - ${v.sku}` : ""
      } ${v.customSku ? `(${v.customSku})` : ""}`,
    }));

    const selectedRow = selectedItemId
      ? inventoryRows.find((row) => row.stockItemId === selectedItemId)
      : null;
    if (selectedRow && !options.some((opt) => opt.value === selectedRow.stockItemId)) {
      options.unshift({ value: selectedRow.stockItemId, label: selectedRow.name });
    }

    return [{ value: "", label: "Seleccionar producto" }, ...options];
  }, [productResults, selectedItemId, inventoryRows]);

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
      const res = await listInventory({
        page,
        limit: DEFAULT_LIMIT,
        warehouseId: warehouseFilter,
        type: ProductTypes.FINISHED,
        search: searchTerm || undefined,
      });

      const items = res.items ?? [];
      setInventoryRows(items.map(mapSnapshotToRow));
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

  const loadAvailability = async () => {
    if (!selectedItemId) {
      setAvailabilityRows([]);
      return;
    }

    try {
      const res = await getAvailability({
        itemId: selectedItemId,
        stockItemId: selectedItemId,
      });
      const rows = (res ?? []).map(mapSnapshotToRow);
      setAvailabilityRows(rows);
    } catch {
      setAvailabilityRows([]);
    }
  };

  const buildInventoryActions = (row: InventoryRow): ActionItem[] => [
    {
      id: `kardex-${row.id}`,
      label: "Ver kardex",
      icon: <FileText className="h-4 w-4 text-black/60" />,
      onClick: () => {
        navigate(RoutesPaths.KardexFinished);
      },
    },
    {
      id: `transfer-${row.id}`,
      label: "Transferir",
      icon: <ArrowLeftRight className="h-4 w-4 text-black/60" />,
      onClick: () => {
        navigate(RoutesPaths.catalogTransfer);
      },
    },
    {
      id: `adjust-${row.id}`,
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

  useEffect(() => {
    void loadAvailability();
  }, [selectedItemId]);

  const columns = useMemo<DataTableColumn<InventoryRow>[]>(
    () => [
      {
        id: "name",
        header: "Producto",
        cell: (row) => <span className="text-black/80">{row.name}</span>,
      },
      {
        id: "warehouse",
        header: "Almacén",
        cell: (row) => <span className="text-black/70">{row.warehouse}</span>,
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
        id: "minIdeal",
        header: "Min",
        className: "text-right tabular-nums",
        headerClassName: "text-left",
        cell: (row) => `${row.minStock}`,
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

  const buildCsv = (rows: InventoryRow[]) => {
    const header = [
      "sku",
      "producto",
      "almacen",
      "stock_fisico",
      "reservado",
      "disponible",
      "minimo",
      "ideal",
      "dias_restantes",
    ];
    const escape = (value: string) => {
      if (value.includes('"') || value.includes(",") || value.includes("\n")) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };
    const lines = rows.map((row) =>
      [
        row.sku,
        row.name,
        row.warehouse,
        String(row.onHand),
        String(row.reserved),
        String(row.available),
        String(row.min),
        String(row.ideal),
        row.daysRemaining === null ? "N/A" : String(row.daysRemaining),
      ]
        .map((value) => escape(String(value)))
        .join(","),
    );
    return [header.join(","), ...lines].join("\n");
  };

  const downloadCsv = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const csv = `\uFEFF${buildCsv(inventoryRows)}`;
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "inventario.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <PageShell>
      <PageTitle title="Catalogo - Inventario" />
      <div className="space-y-4">
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
          animate={shouldReduceMotion ? false : { opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"
        >
          <Headed
            title="Inventario de productos terminados"
            subtitle="Explora el stock por SKU y almacén."
            size="lg"
          />
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-lg border border-black/10 bg-black/[0.02] px-3 py-2 text-[11px]">
              Total:{" "}
              <span className="font-semibold text-black">{summary.total}</span>
            </div>
            <SystemButton
              variant="outline"
              size="sm"
              className="text-[11px]"
              onClick={downloadCsv}
              loading={exporting}
            >
              {exporting ? "Exportando..." : "Exportar CSV"}
            </SystemButton>
          </div>
        </motion.div>

        <section className="rounded-2xl border border-black/10 bg-gray-50 p-5 shadow-sm space-y-4">
          <SectionHeaderForm icon={Filter} title="Filtros" />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[0.5fr_0.5fr_0.6fr_1fr_1fr]">
            <FloatingInput
              label="Fecha inicio"
              name="fromDate"
              type="date"
              value={toDateInputValue(fromDate)}
              onClick={(e) => tryShowPicker(e.currentTarget)}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
            />
            <FloatingInput
              label="Fecha fin"
              name="toDate"
              type="date"
              value={toDateInputValue(toDate)}
              onClick={(e) => tryShowPicker(e.currentTarget)}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
            />
            <FloatingSelect
              label="Almacén"
              name="warehouseId"
              value={warehouseId}
              onChange={(value) => setWarehouseId(value)}
              options={warehouseOptions}
              searchable
              searchPlaceholder="Buscar almacén..."
              emptyMessage="Sin almacenes"
            />
            <FloatingSelect
              label="Producto terminado "
              name="stockItemId"
              value={selectedItemId ?? ""}
              options={productOptions}
              onChange={(value) => {
                setSelectedItemId(value ? value : null);
                setSelectedWarehouseId(null);
              }}
              searchable
              onSearchChange={(text) => setProductQuery(text)}
              className="h-9 text-xs"
              placeholder="Seleccionar"
              searchPlaceholder="Buscar producto..."
              emptyMessage="Sin productos"
            />
          </div>
        </section>
        <section className="grid grid-cols-[3fr_1.5fr] gap-4">
          <div className="space-y-3">
            <div className="xl:col-span-2 rounded-2xl border border-black/10 bg-white p-5 shadow-sm
            max-h-70 min-h-28">
              <div className="flex items-center justify-between">
                <SectionHeaderForm icon={LineChart} title="Salidas por semana" />
                <span className="text-xs text-black/60">{}</span>
              </div>
              <div className="relative mt-4" style={{ height: 180 }}>
                <div
                  ref={refWeekly}
                  className={
                    !analyticsEnabled || analyticsLoading || analyticsError
                      ? "opacity-40"
                      : ""
                  }
                  style={{ height: 180 }}
                />
                {!analyticsEnabled ? (
                  <div className="absolute inset-0 flex items-center justify-center text-sm text-black/60">
                    Selecciona un SKU y un almacén para ver la analítica.
                  </div>
                ) : analyticsLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center text-sm text-black/60">
                    Cargando analítica…
                  </div>
                ) : analyticsError ? (
                  <div className="absolute inset-0 flex items-center justify-center text-sm text-rose-600">
                    {analyticsError}
                  </div>
                ) : null}
              </div>
            </div>

             <div className="xl:col-span-2 rounded-2xl border border-black/10 bg-white shadow-sm overflow-hidden
             p-3">
                <div className="p-2 flex items-center justify-between">
                  <SectionHeaderForm icon={Boxes} title="Tabla de stock" />
                  <div className="text-xs text-black/60">
                    Snapshot + reservas activas
                  </div>
                </div>
                <DataTable
                  tableId="catalog-inventory-table"
                  data={inventoryRows}
                  columns={columns}
                  rowKey="id"
                  loading={loading}
                  emptyMessage="No hay registros con los filtros actuales."
                  hoverable
                  animated={!shouldReduceMotion}
                  showSearch
                  searchPlaceholder="Buscar SKU, producto o almacén..."
                  selectableColumns
                  searchValue={tableSearch}
                  onSearchChange={setTableSearch}
                  globalSearchFn={() => true}
                  pagination={{
                    page,
                    limit: DEFAULT_LIMIT,
                    total: inventoryTotal,
                  }}
                  onPageChange={(nextPage) => setPage(nextPage)}
                  onRowClick={(row) => {
                    setSelectedItemId(row.stockItemId);
                    setSelectedWarehouseId(row.warehouseId);
                  }}
                  rowClassName={(row) =>
                    isActiveRow(row)
                      ? "bg-black/5 hover:bg-black/5"
                      : "hover:bg-black/[0.03]"
                  }
                />
            </div>

          </div>
          <div className="space-y-3">
              <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
                <SectionHeaderForm icon={LineChart} title="Disponibilidad" />
                {!selectedItemId ? (
                  <div className="mt-4 text-sm text-black/60">
                    Selecciona un producto para ver disponibilidad.
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

              <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm space-y-3 max-h-70 min-h-25">
                <SectionHeaderForm icon={LineChart} title="Demanda estimada" />
                {!analyticsEnabled ? (
                  <div className="text-sm text-black/60">
                    Selecciona un SKU y un almacén para ver proyecciones.
                  </div>
                ) : analyticsLoading ? (
                  <div className="text-sm text-black/60">Cargando demanda…</div>
                ) : analyticsError ? (
                  <div className="text-sm text-rose-600">{analyticsError}</div>
                ) : (
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    <div className="flex items-center justify-between rounded-lg border border-black/10 px-3 py-2">
                      <span className="text-black/60">Días en rango</span>
                      <span className="font-semibold">{rangeDays}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-black/10 px-3 py-2">
                      <span className="text-black/60">Promedio diario</span>
                      <span className="font-semibold">{demand?.avgDaily ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-black/10 px-3 py-2">
                      <span className="text-black/60">Proyección</span>
                      <span className="font-semibold">{demand?.projection ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-black/10 px-3 py-2">
                      <span className="text-black/60">Cobertura (días)</span>
                      <span className="font-semibold">{coverageText}</span>
                    </div>
                  </div>
                )}
            </div>
            
          </div>

        </section>
      </div>
    </PageShell>
  );
}
