import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as echarts from "echarts";
import { motion } from "framer-motion";
import { getStockMock } from "@/data/stockService";
import { RoutesPaths } from "@/router/config/routesPaths";

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

export default function Inventory() {  const stockMock = getStockMock();  const navigate = useNavigate();
  // PROVISIONAL: inventory snapshot mocked while backend is under construction.
  const inventoryRows = useMemo(() => {
    return stockMock.inventory.map((item) => {
      const variant = stockMock.variants.find((v) => v.variant_id === item.variant_id);
      const product = stockMock.products.find((p) => p.product_id === variant?.product_id);
      const warehouse = stockMock.warehouses.find((w) => w.warehouse_id === item.warehouse_id);
      const rule = stockMock.reorderRules.find(
        (r) => r.variant_id === item.variant_id && r.warehouse_id === item.warehouse_id
      );

      return {
        sku: variant?.sku ?? "SKU",
        name: product?.name ?? "Producto",
        warehouse: warehouse?.name ?? "Almacen",
        onHand: item.on_hand,
        reserved: item.reserved,
        available: item.on_hand - item.reserved,
        min: rule?.min_qty ?? 0,
        ideal: rule?.max_qty ?? 0,
      };
    });
  }, []);
  const availabilityChart = useMemo<echarts.EChartsOption>(
    () => ({
      tooltip: { trigger: "axis" },
      grid: { left: 20, right: 16, top: 10, bottom: 20, containLabel: true },
      xAxis: {
        type: "category",
        data: ["Central", "Norte", "Sur", "Ecommerce"],
        axisLabel: { color: "#111" },
      },
      yAxis: { type: "value", axisLabel: { color: "#111" } },
      series: [
        {
          type: "bar",
          data: [62, 55, 48, 38],
          itemStyle: { color: "#0f766e" },
          barWidth: 18,
        },
      ],
    }),
    []
  );

  const ref = useEChart(availabilityChart);
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

  return (
    <div className="w-full min-h-screen bg-white text-black">
      <div className="px-6 py-6 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Inventario</h1>
              <p className="text-sm text-black/60">Explora el estado real del stock por SKU y almacen.</p>
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
              <option value="">Almacen (todos)</option>
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
              <option value="low">Bajo minimo</option>
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
              {filteredRows.map((row) => (
                <div key={row.sku} className="rounded-xl border border-black/10 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">{row.name}</p>
                      <p className="text-xs text-black/60">{row.sku} · {row.warehouse}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{row.available}</p>
                      <p className="text-[11px] text-black/50">Disponibles</p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-black/70">
                    <div>Stock fisico: <span className="font-semibold text-black">{row.onHand}</span></div>
                    <div>Reservado: <span className="font-semibold text-black">{row.reserved}</span></div>
                    <div>Min/Ideal: <span className="font-semibold text-black">{row.min}/{row.ideal}</span></div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className="text-xs px-2 py-1 rounded-md border border-black/10" onClick={() => navigate(`${RoutesPaths.stockMovements}?sku=${row.sku}`)}>Ver kardex</button>
                    <button className="text-xs px-2 py-1 rounded-md border border-black/10">Transferir</button>
                    <button className="text-xs px-2 py-1 rounded-md border border-black/10">Ajustar</button>
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
                    <th className="py-2 text-left" title="Almacen donde esta el stock">
                      Almacen
                    </th>
                    <th className="py-2 text-right" title="Stock fisico en almacen">
                      Stock fisico
                    </th>
                    <th className="py-2 text-right" title="Stock reservado no disponible">
                      Reservado
                    </th>
                    <th className="py-2 text-right" title="Disponible = en mano - reservado">
                      Disponible
                    </th>
                    <th className="py-2 text-right" title="Minimo y nivel ideal del SKU">
                      Min/Ideal
                    </th>
                    <th className="py-2 text-right" title="Acciones rapidas sobre el SKU">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
              {filteredRows.map((row) => (
                <tr key={row.sku} className="border-b border-black/5">
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
                        <div className="flex items-center justify-end gap-2">
                          <button className="text-xs px-2 py-1 rounded-md border border-black/10" onClick={() => navigate(`${RoutesPaths.stockMovements}?sku=${row.sku}`)}>Ver kardex</button>
                          <button className="text-xs px-2 py-1 rounded-md border border-black/10">Transferir</button>
                          <button className="text-xs px-2 py-1 rounded-md border border-black/10">Ajustar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

          <div className="space-y-4 order-first xl:order-none">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm"
            >
              <p className="text-sm font-semibold">Detalle SKU</p>
              <p className="text-xs text-black/60">Resumen por almacen</p>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>Central</span>
                  <span className="font-semibold">220</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Norte</span>
                  <span className="font-semibold">120</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Sur</span>
                  <span className="font-semibold">80</span>
                </div>
              </div>
              <div className="mt-4 rounded-xl border border-black/10 bg-black/[0.02] p-3 text-xs">
                Reglas activas: min 120, max 520, lead time 6 dias
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm"
            >
              <p className="text-sm font-semibold">Disponibilidad por almacen</p>
              <div ref={ref} className="mt-4" style={{ height: 180 }} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm"
            >
              <p className="text-sm font-semibold">Acciones rapidas</p>
              <div className="mt-3 space-y-2">
                <button className="w-full text-left text-sm px-3 py-2 rounded-md border border-black/10">Transferir desde aqui</button>
                <button className="w-full text-left text-sm px-3 py-2 rounded-md border border-black/10">Ajuste rapido</button>
                <button className="w-full text-left text-sm px-3 py-2 rounded-md border border-black/10">Crear reserva</button>
              </div>
            </motion.div>
          </div>
        </section>
      </div>
    </div>
  );
}











