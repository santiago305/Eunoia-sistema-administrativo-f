import { useEffect, useMemo, useRef } from "react";
import * as echarts from "echarts";

const reorderRows = [
  { sku: "SKU-221", warehouse: "Central", min: 120, onHand: 84, suggestion: 60 },
  { sku: "SKU-114", warehouse: "Norte", min: 100, onHand: 70, suggestion: 45 },
  { sku: "SKU-445", warehouse: "Sur", min: 80, onHand: 52, suggestion: 38 },
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

export default function Replenishment() {
  const priorityChart = useMemo<echarts.EChartsOption>(
    () => ({
      series: [
        {
          type: "pie",
          radius: ["45%", "70%"],
          label: { show: false },
          data: [
            { value: 14, name: "Alta" },
            { value: 9, name: "Media" },
            { value: 4, name: "Baja" },
          ],
        },
      ],
    }),
    []
  );

  const ref = useEChart(priorityChart);

  return (
    <div className="w-full min-h-screen bg-white text-black">
      <div className="px-6 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Reposicion</h1>
          <p className="text-sm text-black/60">Reglas, alertas y sugerencias de reabastecimiento.</p>
        </div>

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Productos bajo minimo</p>
              <button className="text-xs px-3 py-1 rounded-md border border-black/10">Generar PO</button>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-black/60">
                  <tr className="border-b border-black/10">
                    <th className="py-2 text-left">SKU</th>
                    <th className="py-2 text-left">Almacen</th>
                    <th className="py-2 text-right">Min</th>
                    <th className="py-2 text-right">On hand</th>
                    <th className="py-2 text-right">Sugerido</th>
                  </tr>
                </thead>
                <tbody>
                  {reorderRows.map((row) => (
                    <tr key={row.sku} className="border-b border-black/5">
                      <td className="py-3 font-medium">{row.sku}</td>
                      <td className="py-3">{row.warehouse}</td>
                      <td className="py-3 text-right">{row.min}</td>
                      <td className="py-3 text-right">{row.onHand}</td>
                      <td className="py-3 text-right">{row.suggestion}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold">Reglas de reposicion</p>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between"><span>Lead time</span><span className="font-semibold">7 dias</span></div>
                <div className="flex items-center justify-between"><span>Max por SKU</span><span className="font-semibold">500</span></div>
                <div className="flex items-center justify-between"><span>Revision semanal</span><span className="font-semibold">Si</span></div>
              </div>
            </div>
            <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold">Prioridad</p>
              <div ref={ref} className="mt-4" style={{ height: 180 }} />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
