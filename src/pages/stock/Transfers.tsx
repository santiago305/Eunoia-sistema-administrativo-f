import { useEffect, useMemo, useRef } from "react";
import * as echarts from "echarts";

const transfers = [
  { id: "TRA-000321", status: "Draft", from: "Central", to: "Norte", items: 12 },
  { id: "TRA-000322", status: "Posted", from: "Sur", to: "Central", items: 8 },
  { id: "TRA-000323", status: "Revision", from: "Central", to: "Ecommerce", items: 5 },
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

export default function Transfers() {
  const flowChart = useMemo<echarts.EChartsOption>(
    () => ({
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
          data: [22, 18, 14, 10],
          itemStyle: { color: "#111" },
          barWidth: 16,
        },
      ],
    }),
    []
  );

  const ref = useEChart(flowChart);

  return (
    <div className="w-full min-h-screen bg-white text-black">
      <div className="px-6 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Transferencias</h1>
          <p className="text-sm text-black/60">Operacion principal de movimiento entre almacenes.</p>
        </div>

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Tablero de transferencias</p>
              <button className="text-xs px-3 py-1 rounded-md border border-black/10">Nueva transferencia</button>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-black/60">
                  <tr className="border-b border-black/10">
                    <th className="py-2 text-left">Documento</th>
                    <th className="py-2 text-left">Estado</th>
                    <th className="py-2 text-left">Origen</th>
                    <th className="py-2 text-left">Destino</th>
                    <th className="py-2 text-right">Items</th>
                  </tr>
                </thead>
                <tbody>
                  {transfers.map((row) => (
                    <tr key={row.id} className="border-b border-black/5">
                      <td className="py-3 font-medium">{row.id}</td>
                      <td className="py-3">{row.status}</td>
                      <td className="py-3">{row.from}</td>
                      <td className="py-3">{row.to}</td>
                      <td className="py-3 text-right">{row.items}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold">Creador rapido</p>
              <div className="mt-3 space-y-2">
                <input className="h-10 w-full rounded-lg border border-black/10 px-3 text-sm" placeholder="From warehouse" />
                <input className="h-10 w-full rounded-lg border border-black/10 px-3 text-sm" placeholder="To warehouse" />
                <button className="w-full text-sm px-3 py-2 rounded-md bg-black text-white">Iniciar transferencia</button>
              </div>
            </div>
            <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold">Flujo por almacen</p>
              <div ref={ref} className="mt-4" style={{ height: 180 }} />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
