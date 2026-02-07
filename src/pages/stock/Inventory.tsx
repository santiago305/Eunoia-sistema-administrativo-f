import { useEffect, useMemo, useRef } from "react";
import * as echarts from "echarts";
import { motion } from "framer-motion";

const inventoryRows = [
  {
    sku: "SKU-221",
    name: "Camisa Oxford",
    warehouse: "Central",
    location: "A-02-03",
    onHand: 420,
    reserved: 36,
    available: 384,
    min: 120,
    ideal: 520,
  },
  {
    sku: "SKU-114",
    name: "Pantalon Slim",
    warehouse: "Norte",
    location: "B-01-05",
    onHand: 280,
    reserved: 20,
    available: 260,
    min: 100,
    ideal: 300,
  },
  {
    sku: "SKU-445",
    name: "Zapatilla Runner",
    warehouse: "Sur",
    location: "C-03-01",
    onHand: 140,
    reserved: 18,
    available: 122,
    min: 80,
    ideal: 200,
  },
];

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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {[
              "Buscar SKU o producto",
              "Almacen",
              "Ubicacion",
              "Estado disponible",
            ].map((placeholder) => (
              <input
                key={placeholder}
                className="h-10 rounded-lg border border-black/10 px-3 text-sm"
                placeholder={placeholder}
              />
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              "Solo bajo minimo",
              "Con reservas",
              "Stock critico",
            ].map((label) => (
              <button key={label} className="text-xs px-3 py-1 rounded-full border border-black/10">
                {label}
              </button>
            ))}
          </div>
        </motion.section>

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="xl:col-span-2 rounded-2xl border border-black/10 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Tabla principal</p>
              <p className="text-xs text-black/60">Snapshot + reservas activas</p>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-black/60">
                  <tr className="border-b border-black/10">
                    <th className="py-2 text-left">SKU</th>
                    <th className="py-2 text-left">Producto</th>
                    <th className="py-2 text-left">Almacen</th>
                    <th className="py-2 text-left">Ubicacion</th>
                    <th className="py-2 text-right">On hand</th>
                    <th className="py-2 text-right">Reservado</th>
                    <th className="py-2 text-right">Disponible</th>
                    <th className="py-2 text-right">Min/Ideal</th>
                    <th className="py-2 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryRows.map((row) => (
                    <tr key={row.sku} className="border-b border-black/5">
                      <td className="py-3 font-medium">{row.sku}</td>
                      <td className="py-3">{row.name}</td>
                      <td className="py-3">{row.warehouse}</td>
                      <td className="py-3">{row.location}</td>
                      <td className="py-3 text-right">{row.onHand}</td>
                      <td className="py-3 text-right">{row.reserved}</td>
                      <td className="py-3 text-right font-semibold">{row.available}</td>
                      <td className="py-3 text-right">
                        {row.min}/{row.ideal}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button className="text-xs px-2 py-1 rounded-md border border-black/10">Ver kardex</button>
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

          <div className="space-y-4">
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
