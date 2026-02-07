import { useEffect, useMemo, useRef } from "react";
import * as echarts from "echarts";
import { stockMock } from "@/data/stockMock";

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

export default function Adjustments() {
  // PROVISIONAL: adjustments list mocked from ledger while backend is under construction.
  const adjustments = useMemo(() => {
    return stockMock.ledger.map((entry, index) => ({
      id: `AJU-${String(index + 89).padStart(6, "0")}`,
      reason: entry.direction === "IN" ? "Conteo" : "Merma",
      status: index % 2 === 0 ? "Posted" : "Draft",
      diff: entry.direction === "IN" ? entry.quantity : -entry.quantity,
    }));
  }, []);
  const reasonChart = useMemo<echarts.EChartsOption>(
    () => ({
      series: [
        {
          type: "pie",
          radius: ["45%", "70%"],
          label: { show: false },
          data: [
            { value: 10, name: "Conteo" },
            { value: 6, name: "Merma" },
            { value: 4, name: "Correccion" },
          ],
        },
      ],
    }),
    []
  );

  const ref = useEChart(reasonChart);

  return (
    <div className="w-full min-h-screen bg-white text-black">
      <div className="px-6 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Ajustes</h1>
          <p className="text-sm text-black/60">Controla conteos, mermas y correcciones.</p>
        </div>

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Ajustes recientes</p>
              <button className="text-xs px-3 py-1 rounded-md border border-black/10">Nuevo ajuste</button>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-black/60">
                  <tr className="border-b border-black/10">
                    <th className="py-2 text-left">Documento</th>
                    <th className="py-2 text-left">Motivo</th>
                    <th className="py-2 text-left">Estado</th>
                    <th className="py-2 text-right">Diferencia</th>
                  </tr>
                </thead>
                <tbody>
                  {adjustments.map((row) => (
                    <tr key={row.id} className="border-b border-black/5">
                      <td className="py-3 font-medium">{row.id}</td>
                      <td className="py-3">{row.reason}</td>
                      <td className="py-3">{row.status}</td>
                      <td className="py-3 text-right">{row.diff}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold">Ajuste rapido</p>
              <div className="mt-3 space-y-2">
                <input className="h-10 w-full rounded-lg border border-black/10 px-3 text-sm" placeholder="SKU" />
                <input className="h-10 w-full rounded-lg border border-black/10 px-3 text-sm" placeholder="Almacen" />
                <input className="h-10 w-full rounded-lg border border-black/10 px-3 text-sm" placeholder="Cantidad" />
                <input className="h-10 w-full rounded-lg border border-black/10 px-3 text-sm" placeholder="Motivo" />
                <button className="w-full text-sm px-3 py-2 rounded-md bg-black text-white">Postear ajuste</button>
              </div>
            </div>
            <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold">Motivos</p>
              <div ref={ref} className="mt-4" style={{ height: 180 }} />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}


