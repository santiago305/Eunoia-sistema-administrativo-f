import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import * as echarts from "echarts";
import { motion } from "framer-motion";
import { PageTitle } from "@/components/PageTitle";
import { getStockMock } from "@/data/stockService";
import { RoutesPaths } from "@/Router/config/routesPaths";

const statusBadges = [
  { label: "Disponible", value: "78%" },
  { label: "Reservado", value: "12%" },
  { label: "Bloqueado", value: "10%" },
];

const useEChart = (options: echarts.EChartsOption) => {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current);
    chart.setOption(options);

    const handle = () => chart.resize();
    window.addEventListener("resize", handle);
    return () => {
      window.removeEventListener("resize", handle);
      chart.dispose();
    };
  }, [options]);

  return ref;
};

export default function Inventory() {
  const stockMock = getStockMock();
  const navigate = useNavigate();
  const { page } = useParams();
  const currentPage = Math.max(1, Number(page ?? "1") || 1);
  const pageSize = 10;
  const consumptionWindowDays = 14;
  const [selectedSku, setSelectedSku] = useState<string | null>(null);

  // PROVISIONAL: inventory snapshot mocked while backend is under construction.
  const inventoryRows = useMemo(() => {
    const now = new Date();
    const since = new Date(now);
    since.setDate(now.getDate() - consumptionWindowDays);

    const outByVariantWarehouse = new Map<string, number>();
    for (const entry of stockMock.ledger) {
      if (entry.direction !== "OUT") continue;
      const createdAt = new Date(entry.created_at);
      if (createdAt < since) continue;
      const key = `${entry.variant_id}::${entry.warehouse_id}`;
      outByVariantWarehouse.set(key, (outByVariantWarehouse.get(key) ?? 0) + entry.quantity);
    }

    return stockMock.inventory.map((item) => {
      const variant = stockMock.variants.find((v) => v.variant_id === item.variant_id);
      const product = stockMock.products.find((p) => p.product_id === variant?.product_id);
      const warehouse = stockMock.warehouses.find((w) => w.warehouse_id === item.warehouse_id);
      const rule = stockMock.reorderRules.find(
        (r) => r.variant_id === item.variant_id && r.warehouse_id === item.warehouse_id
      );
      const key = `${item.variant_id}::${item.warehouse_id}`;
      const totalOut = outByVariantWarehouse.get(key) ?? 0;
      const dailyConsumption = totalOut / consumptionWindowDays;
      const daysRemaining =
        dailyConsumption > 0 ? Math.max(0, Math.round((item.on_hand / dailyConsumption) * 10) / 10) : null;

      return {
        sku: variant?.sku ?? "SKU",
        name: product?.name ?? "Producto",
        warehouse: warehouse?.name ?? "Almacén",
        onHand: item.on_hand,
        reserved: item.reserved,
        available: item.on_hand - item.reserved,
        min: rule?.min_qty ?? 0,
        ideal: rule?.max_qty ?? 0,
        daysRemaining,
        dailyConsumption,
      };
    });
  }, [stockMock, consumptionWindowDays]);
  const availabilityChart = useMemo<echarts.EChartsOption>(() => {
    const warehouseNames = stockMock.warehouses.map((w) => w.name);
    const skuToUse = selectedSku ?? inventoryRows[0]?.sku ?? "";
    const perWarehouse = warehouseNames.map((name) => {
      const row = inventoryRows.find((item) => item.sku === skuToUse && item.warehouse === name);
      return row?.available ?? 0;
    });

    return {
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
  }, [inventoryRows, selectedSku, stockMock.warehouses]);

  const refLarge = useEChart(availabilityChart);
  const refCompact = useEChart(availabilityChart);
  const [searchText, setSearchText] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredRows = useMemo(() => {
    const search = searchText.trim().toLowerCase();
    return inventoryRows.filter((row) => {
      const matchesSearch =
        search.length === 0 ||
        row.sku.toLowerCase().includes(search) ||
        row.name.toLowerCase().includes(search);
      const matchesWarehouse = warehouseFilter.length === 0 || row.warehouse === warehouseFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "available" && row.available > 0) ||
        (statusFilter === "reserved" && row.reserved > 0) ||
        (statusFilter === "high" && row.ideal > 0 && row.onHand / row.ideal >= 0.6) ||
        (statusFilter === "mid" &&
          row.ideal > 0 &&
          row.onHand / row.ideal < 0.6 &&
          row.onHand / row.ideal >= 0.3) ||
        (statusFilter === "low" && row.ideal > 0 && row.onHand / row.ideal < 0.3);

      return matchesSearch && matchesWarehouse && matchesStatus;
    });
  }, [inventoryRows, searchText, warehouseFilter, statusFilter]);

  const selectedSkuValue = selectedSku ?? filteredRows[0]?.sku ?? inventoryRows[0]?.sku ?? "";
  const selectedSkuRows = useMemo(
    () => inventoryRows.filter((row) => row.sku === selectedSkuValue),
    [inventoryRows, selectedSkuValue]
  );
  const selectedSkuName = selectedSkuRows[0]?.name ?? "SKU";
  const selectedSkuRule = selectedSkuRows[0]
    ? { min: selectedSkuRows[0].min, ideal: selectedSkuRows[0].ideal }
    : { min: 0, ideal: 0 };

  const selectedMovements = useMemo(() => {
    const variant = stockMock.variants.find((v) => v.sku === selectedSkuValue);
    if (!variant) return [];
    return stockMock.ledger
      .filter((entry) => entry.variant_id === variant.variant_id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 6)
      .map((entry) => ({
        date: new Date(entry.created_at).toLocaleDateString("es-PE", { day: "2-digit", month: "short" }),
        direction: entry.direction,
        quantity: entry.quantity,
        warehouse: stockMock.warehouses.find((w) => w.warehouse_id === entry.warehouse_id)?.name ?? "-",
      }));
  }, [stockMock, selectedSkuValue]);

  const selectedReservations = useMemo(() => {
    const variant = stockMock.variants.find((v) => v.sku === selectedSkuValue);
    if (!variant) return [];
    return stockMock.reservations
      .filter((res) => res.variant_id === variant.variant_id)
      .slice(0, 3)
      .map((res) => ({
        qty: res.quantity,
        warehouse: stockMock.warehouses.find((w) => w.warehouse_id === res.warehouse_id)?.name ?? "-",
      }));
  }, [stockMock, selectedSkuValue]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const pagedRows = filteredRows.slice(startIndex, startIndex + pageSize);

  const goToPage = (nextPage: number) => {
    navigate(`/stock/inventario/${nextPage}`);
  };

  return (
    <div className="w-full min-h-screen bg-white text-black">
      <PageTitle title="Inventario" />
      <div className="px-6 py-6 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Inventario</h1>
              <p className="text-sm text-black/60">Explora el estado real del stock por SKU y almacén.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {statusBadges.map((badge) => (
                <span key={badge.label} className="rounded-full border border-black/10 bg-black/[0.02] px-3 py-1 text-xs">
                  {badge.label}: {badge.value}
                </span>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              className="h-10 rounded-lg border border-black/10 px-3 text-sm"
              placeholder="Buscar SKU o producto"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
            />
            <select
              className="h-10 rounded-lg border border-black/10 px-3 text-sm bg-white"
              value={warehouseFilter}
              onChange={(event) => setWarehouseFilter(event.target.value)}
            >
              <option value="">Almacén (todos)</option>
              {Array.from(new Set(inventoryRows.map((row) => row.warehouse))).map((warehouse) => (
                <option key={warehouse} value={warehouse}>
                  {warehouse}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-lg border border-black/10 px-3 text-sm bg-white"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">Estado (todos)</option>
              <option value="available">Disponible</option>
              <option value="reserved">Con reservas</option>
              <option value="low">Bajo mínimo</option>
            </select>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              { label: "Stock 100%-60%", value: "high" },
              { label: "Stock 59%-30%", value: "mid" },
              { label: "Stock 29%-1%", value: "low" },
            ].map((item) => {
              const isActive = statusFilter === item.value;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setStatusFilter(isActive ? "all" : item.value)}
                  className={[
                    "text-xs px-3 py-1 rounded-full border transition",
                    isActive ? "border-black bg-black text-white" : "border-black/10",
                  ].join(" ")}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </motion.section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_360px] 3xl:grid-cols-[minmax(0,1fr)_420px]">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Tabla principal</p>
              <p className="text-xs text-black/60">Snapshot + reservas activas</p>
            </div>

            <div className="mt-4 md:hidden space-y-3">
              {pagedRows.map((row) => (
                <div key={row.sku} className="rounded-xl border border-black/10 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">{row.name}</p>
                      <p className="text-xs text-black/60">{row.sku} – {row.warehouse}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{row.available}</p>
                      <p className="text-[11px] text-black/50">Disponibles</p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-black/70">
                    <div>Stock físico: <span className="font-semibold text-black">{row.onHand}</span></div>
                    <div>Reservado: <span className="font-semibold text-black">{row.reserved}</span></div>
                    <div>Min/Ideal: <span className="font-semibold text-black">{row.min}/{row.ideal}</span></div>
                    <div>
                      Días restantes: {" "}
                      <span className={row.daysRemaining !== null && row.daysRemaining <= 3 ? "font-semibold text-red-600" : "font-semibold text-black"}>
                        {row.daysRemaining === null ? "N/A" : row.daysRemaining}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className="text-xs px-2 py-1 rounded-md border border-black/10" onClick={() => navigate(`${RoutesPaths.stockMovements}?sku=${row.sku}`)}>Ver kardex</button>
                    <button className="text-xs px-2 py-1 rounded-md border border-black/10" onClick={() => navigate(`${RoutesPaths.stockTransfers}?sku=${row.sku}`)}>Transferir</button>
                    <button className="text-xs px-2 py-1 rounded-md border border-black/10" onClick={() => navigate(`${RoutesPaths.stockAdjustments}?sku=${row.sku}`)}>Ajustar</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 overflow-x-auto hidden md:block">
              <table className="w-full text-sm">
                <thead className="text-xs text-black/60">
                  <tr className="border-b border-black/10">
                    <th className="py-2 text-left" title="Identificador del producto (SKU)">
                      SKU
                    </th>
                    <th className="py-2 text-left" title="Nombre del producto">
                      Producto
                    </th>
                    <th className="py-2 text-left" title="Almacén donde está el stock">
                      Almacén
                    </th>
                    <th className="py-2 text-right" title="Stock físico en almacén">
                      Stock físico
                    </th>
                    <th className="py-2 text-right" title="Stock reservado no disponible">
                      Reservado
                    </th>
                    <th className="py-2 text-right" title="Disponible = en mano - reservado">
                      Disponible
                    </th>
                    <th className="py-2 text-right" title="Mínimo y nivel ideal del SKU">
                      Min/Ideal
                    </th>
                    <th className="py-2 text-right" title="Días restantes según consumo reciente">
                      Días restantes
                    </th>
                    <th className="py-2 text-right" title="Acciones rapidas sobre el SKU">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.map((row) => (
                    <tr
                      key={row.sku}
                      className={[
                        "border-b border-black/5 cursor-pointer",
                        selectedSkuValue === row.sku ? "bg-black/[0.03]" : "",
                      ].join(" ")}
                      onClick={() => setSelectedSku(row.sku)}
                    >
                      <td className="py-3 font-medium">{row.sku}</td>
                      <td className="py-3">{row.name}</td>
                      <td className="py-3">{row.warehouse}</td>
                      <td className="py-3 text-right">{row.onHand}</td>
                      <td className="py-3 text-right">{row.reserved}</td>
                      <td className="py-3 text-right font-semibold">{row.available}</td>
                      <td className="py-3 text-right">
                        {row.min}/{row.ideal}
                      </td>
                      <td className="py-3 text-right">
                        {row.daysRemaining === null ? (
                          "N/A"
                        ) : row.daysRemaining <= 3 ? (
                          <span className="font-semibold text-red-600">{row.daysRemaining} días</span>
                        ) : (
                          <span className="text-black/80">{row.daysRemaining} días</span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button className="text-xs px-2 py-1 rounded-md border border-black/10" onClick={() => navigate(`${RoutesPaths.stockMovements}?sku=${row.sku}`)}>Ver kardex</button>
                          <button className="text-xs px-2 py-1 rounded-md border border-black/10" onClick={() => navigate(`${RoutesPaths.stockTransfers}?sku=${row.sku}`)}>Transferir</button>
                          <button className="text-xs px-2 py-1 rounded-md border border-black/10" onClick={() => navigate(`${RoutesPaths.stockAdjustments}?sku=${row.sku}`)}>Ajustar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-black/60">
              <div>
                Mostrando {startIndex + 1}-{Math.min(startIndex + pageSize, filteredRows.length)} de {filteredRows.length}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-md border border-black/10 px-2 py-1"
                  disabled={safePage <= 1}
                  onClick={() => goToPage(safePage - 1)}
                >
                  Anterior
                </button>
                <span>Página {safePage} de {totalPages}</span>
                <button
                  type="button"
                  className="rounded-md border border-black/10 px-2 py-1"
                  disabled={safePage >= totalPages}
                  onClick={() => goToPage(safePage + 1)}
                >
                  Siguiente
                </button>
              </div>
            </div>
          </motion.div>

          <div className="space-y-4 order-first xl:order-none">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm lg:hidden 2xl:block"
            >
              <p className="text-sm font-semibold">Detalle SKU</p>
              <p className="text-xs text-black/60">Resumen por almacén – {selectedSkuName}</p>
              <div className="mt-4 space-y-2 text-sm">
                {selectedSkuRows.map((row) => (
                  <div key={`${row.sku}-${row.warehouse}`} className="flex items-center justify-between">
                    <span>{row.warehouse}</span>
                    <span className="font-semibold">{row.onHand}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-xl border border-black/10 bg-black/[0.02] p-3 text-xs">
                Reglas activas: min {selectedSkuRule.min}, ideal {selectedSkuRule.ideal}
              </div>
              <div className="mt-4 space-y-2 text-xs">
                <p className="font-semibold text-black/80">Ultimos movimientos</p>
                {selectedMovements.length === 0 ? (
                  <p className="text-black/60">Sin movimientos recientes.</p>
                ) : (
                  selectedMovements.map((mov, idx) => (
                    <div key={`${mov.date}-${idx}`} className="flex items-center justify-between">
                      <span className="text-black/60">{mov.date} – {mov.warehouse}</span>
                      <span className={mov.direction === "IN" ? "text-emerald-600" : "text-red-600"}>
                        {mov.direction} {mov.quantity}
                      </span>
                    </div>
                  ))
                )}
              </div>
              <div className="mt-4 space-y-2 text-xs">
                <p className="font-semibold text-black/80">Reservas activas</p>
                {selectedReservations.length === 0 ? (
                  <p className="text-black/60">Sin reservas activas.</p>
                ) : (
                  selectedReservations.map((res, idx) => (
                    <div key={`${res.warehouse}-${idx}`} className="flex items-center justify-between">
                      <span className="text-black/60">{res.warehouse}</span>
                      <span className="font-semibold">{res.qty}</span>
                    </div>
                  ))
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm lg:hidden 2xl:block"
            >
              <p className="text-sm font-semibold">Disponibilidad por almacén</p>
              <div ref={refLarge} className="mt-4" style={{ height: 180 }} />
            </motion.div>

                        <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="hidden lg:block 2xl:hidden"
            >
              <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-4 items-start">
                <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm h-full">
                  <p className="text-sm font-semibold">Detalle SKU</p>
                  <p className="text-xs text-black/60">Resumen por almacén – {selectedSkuName}</p>
                  <div className="mt-4 space-y-2 text-sm">
                    {selectedSkuRows.map((row) => (
                      <div key={`${row.sku}-${row.warehouse}`} className="flex items-center justify-between">
                        <span>{row.warehouse}</span>
                        <span className="font-semibold">{row.onHand}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 rounded-xl border border-black/10 bg-black/[0.02] p-3 text-xs">
                    Reglas activas: min {selectedSkuRule.min}, ideal {selectedSkuRule.ideal}
                  </div>
                  <div className="mt-4 space-y-2 text-xs">
                    <p className="font-semibold text-black/80">Ultimos movimientos</p>
                    {selectedMovements.length === 0 ? (
                      <p className="text-black/60">Sin movimientos recientes.</p>
                    ) : (
                      selectedMovements.map((mov, idx) => (
                        <div key={`${mov.date}-${idx}`} className="flex items-center justify-between">
                        <span className="text-black/60">{mov.date} – {mov.warehouse}</span>
                          <span className={mov.direction === "IN" ? "text-emerald-600" : "text-red-600"}>
                            {mov.direction} {mov.quantity}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="mt-4 space-y-2 text-xs">
                    <p className="font-semibold text-black/80">Reservas activas</p>
                    {selectedReservations.length === 0 ? (
                      <p className="text-black/60">Sin reservas activas.</p>
                    ) : (
                      selectedReservations.map((res, idx) => (
                        <div key={`${res.warehouse}-${idx}`} className="flex items-center justify-between">
                          <span className="text-black/60">{res.warehouse}</span>
                          <span className="font-semibold">{res.qty}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm h-full flex flex-col">
                  <p className="text-sm font-semibold">Disponibilidad por almacén</p>
                  <div ref={refCompact} className="mt-4 flex-1" />
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </div>
    </div>
  );
}

