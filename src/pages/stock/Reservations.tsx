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

export default function Reservations() {
  // PROVISIONAL: reservations mocked from schema while backend is under construction.
  const reservations = useMemo(() => {
    return stockMock.reservations.map((row) => {
      const variant = stockMock.variants.find((v) => v.variant_id === row.variant_id);
      const warehouse = stockMock.warehouses.find((w) => w.warehouse_id === row.warehouse_id);
      const expires = row.expires_at ? new Date(row.expires_at).toLocaleDateString("es-PE") : "-";
      return {
        id: row.reservation_id,
        sku: variant?.sku ?? "SKU",
        qty: row.quantity,
        warehouse: warehouse?.name ?? "Almacen",
        expires,
      };
    });
  }, []);
  const reservationsChart = useMemo<echarts.EChartsOption>(
    () => ({
      grid: { left: 20, right: 16, top: 10, bottom: 20, containLabel: true },
      xAxis: { type: "category", data: ["Central", "Norte", "Sur"], axisLabel: { color: "#111" } },
      yAxis: { type: "value", axisLabel: { color: "#111" } },
      series: [
        {
          type: "bar",
          data: [24, 14, 8],
          itemStyle: { color: "#111" },
          barWidth: 18,
        },
      ],
    }),
    []
  );

  const ref = useEChart(reservationsChart);

  return (
    <div className="w-full min-h-screen bg-white text-black">
      <div className="px-6 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Reservas</h1>
          <p className="text-sm text-black/60">Stock comprometido por pedidos o preventas.</p>
        </div>

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Reservas activas</p>
              <button className="text-xs px-3 py-1 rounded-md border border-black/10">Nueva reserva</button>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-black/60">
                  <tr className="border-b border-black/10">
                    <th className="py-2 text-left">Reserva</th>
                    <th className="py-2 text-left">SKU</th>
                    <th className="py-2 text-right">Qty</th>
                    <th className="py-2 text-left">Almacen</th>
                    <th className="py-2 text-left">Expira</th>
                  </tr>
                </thead>
                <tbody>
                  {reservations.map((row) => (
                    <tr key={row.id} className="border-b border-black/5">
                      <td className="py-3 font-medium">{row.id}</td>
                      <td className="py-3">{row.sku}</td>
                      <td className="py-3 text-right">{row.qty}</td>
                      <td className="py-3">{row.warehouse}</td>
                      <td className="py-3">{row.expires}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold">Crear reserva</p>
              <div className="mt-3 space-y-2">
                <input className="h-10 w-full rounded-lg border border-black/10 px-3 text-sm" placeholder="SKU" />
                <input className="h-10 w-full rounded-lg border border-black/10 px-3 text-sm" placeholder="Almacen" />
                <input className="h-10 w-full rounded-lg border border-black/10 px-3 text-sm" placeholder="Cantidad" />
                <input className="h-10 w-full rounded-lg border border-black/10 px-3 text-sm" placeholder="Expiracion" />
                <button className="w-full text-sm px-3 py-2 rounded-md bg-black text-white">Guardar reserva</button>
              </div>
            </div>
            <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold">Reservas por almacen</p>
              <div ref={ref} className="mt-4" style={{ height: 180 }} />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}


