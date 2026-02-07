import { useEffect, useMemo, useRef } from "react";
import * as echarts from "echarts";

// PROVISIONAL: series configuration mocked while backend is under construction.
const seriesRows = [
  { code: "TRA", docType: "TRANSFER", warehouse: "Central", next: 321, padding: 6, active: true },
  { code: "AJU", docType: "ADJUSTMENT", warehouse: "Sur", next: 89, padding: 6, active: true },
  { code: "REC", docType: "RECEIPT", warehouse: "Norte", next: 901, padding: 6, active: true },
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

export default function SeriesTypes() {
  const usageChart = useMemo<echarts.EChartsOption>(
    () => ({
      grid: { left: 20, right: 16, top: 10, bottom: 20, containLabel: true },
      xAxis: { type: "category", data: ["TRA", "AJU", "REC"], axisLabel: { color: "#111" } },
      yAxis: { type: "value", axisLabel: { color: "#111" } },
      series: [
        {
          type: "bar",
          data: [64, 22, 18],
          itemStyle: { color: "#0f766e" },
          barWidth: 20,
        },
      ],
    }),
    []
  );

  const ref = useEChart(usageChart);

  return (
    <div className="w-full min-h-screen bg-white text-black">
      <div className="px-6 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Series y Tipos</h1>
          <p className="text-sm text-black/60">Configuracion documental y permisos.</p>
        </div>

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Series</p>
              <button className="text-xs px-3 py-1 rounded-md border border-black/10">Nueva serie</button>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-black/60">
                  <tr className="border-b border-black/10">
                    <th className="py-2 text-left">Code</th>
                    <th className="py-2 text-left">Doc type</th>
                    <th className="py-2 text-left">Almacen</th>
                    <th className="py-2 text-right">Next</th>
                    <th className="py-2 text-right">Padding</th>
                    <th className="py-2 text-left">Activo</th>
                  </tr>
                </thead>
                <tbody>
                  {seriesRows.map((row) => (
                    <tr key={row.code} className="border-b border-black/5">
                      <td className="py-3 font-medium">{row.code}</td>
                      <td className="py-3">{row.docType}</td>
                      <td className="py-3">{row.warehouse}</td>
                      <td className="py-3 text-right">{row.next}</td>
                      <td className="py-3 text-right">{row.padding}</td>
                      <td className="py-3">{row.active ? "Si" : "No"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold">Vista previa</p>
              <div className="mt-3 rounded-xl border border-black/10 bg-black/[0.02] p-4 text-sm">
                Asi se veran tus documentos:
                <div className="mt-2 text-lg font-semibold">TRA-000120</div>
              </div>
            </div>
            <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold">Uso por tipo</p>
              <div ref={ref} className="mt-4" style={{ height: 180 }} />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
