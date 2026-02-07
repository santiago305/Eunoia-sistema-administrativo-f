import { useEffect, useMemo, useRef } from "react";
import * as echarts from "echarts";

const movements = [
  {
    date: "07 Feb 2026 09:12",
    doc: "TRA-000321",
    type: "TRANSFER",
    inOut: "OUT",
    qty: 38,
    balance: 402,
    ref: "Orden 8821",
  },
  {
    date: "07 Feb 2026 08:44",
    doc: "AJU-000089",
    type: "ADJUSTMENT",
    inOut: "IN",
    qty: 12,
    balance: 440,
    ref: "Conteo ciclico",
  },
  {
    date: "06 Feb 2026 17:30",
    doc: "REC-000901",
    type: "RECEIPT",
    inOut: "IN",
    qty: 120,
    balance: 428,
    ref: "Compra 541",
  },
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

export default function Movements() {
  const movementsChart = useMemo<echarts.EChartsOption>(
    () => ({
      grid: { left: 20, right: 16, top: 10, bottom: 20, containLabel: true },
      xAxis: {
        type: "category",
        data: ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"],
        axisLabel: { color: "#111" },
      },
      yAxis: { type: "value", axisLabel: { color: "#111" } },
      series: [
        {
          type: "line",
          data: [48, 52, 44, 62, 58, 64, 49],
          smooth: true,
          lineStyle: { color: "#0f766e" },
          itemStyle: { color: "#0f766e" },
        },
      ],
    }),
    []
  );

  const ref = useEChart(movementsChart);

  return (
    <div className="w-full min-h-screen bg-white text-black">
      <div className="px-6 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Movimientos (Kardex)</h1>
          <p className="text-sm text-black/60">Auditoria viva del inventario.</p>
        </div>

        <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {[
              "Rango fechas",
              "SKU / producto",
              "Doc type",
              "Almacen",
              "Usuario",
            ].map((placeholder) => (
              <input
                key={placeholder}
                className="h-10 rounded-lg border border-black/10 px-3 text-sm"
                placeholder={placeholder}
              />
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Ledger</p>
              <button className="text-xs px-3 py-1 rounded-md border border-black/10">Exportar CSV</button>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-black/60">
                  <tr className="border-b border-black/10">
                    <th className="py-2 text-left">Fecha</th>
                    <th className="py-2 text-left">Documento</th>
                    <th className="py-2 text-left">Tipo</th>
                    <th className="py-2 text-left">IN/OUT</th>
                    <th className="py-2 text-right">Qty</th>
                    <th className="py-2 text-right">Balance</th>
                    <th className="py-2 text-left">Referencia</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((row) => (
                    <tr key={row.doc} className="border-b border-black/5">
                      <td className="py-3">{row.date}</td>
                      <td className="py-3 font-medium">{row.doc}</td>
                      <td className="py-3">{row.type}</td>
                      <td className="py-3">
                        <span className={row.inOut === "IN" ? "text-emerald-600" : "text-red-600"}>
                          {row.inOut}
                        </span>
                      </td>
                      <td className="py-3 text-right">{row.qty}</td>
                      <td className="py-3 text-right">{row.balance}</td>
                      <td className="py-3">{row.ref}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold">Detalle movimiento</p>
              <div className="mt-3 text-sm space-y-2">
                <p><span className="font-semibold">Documento:</span> TRA-000321</p>
                <p><span className="font-semibold">Origen:</span> Central</p>
                <p><span className="font-semibold">Destino:</span> Norte</p>
                <p><span className="font-semibold">Notas:</span> Reposicion tienda Norte</p>
              </div>
              <button className="mt-4 text-xs px-3 py-1 rounded-md border border-black/10">Ver documento completo</button>
            </div>
            <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold">Tendencia semanal</p>
              <div ref={ref} className="mt-4" style={{ height: 180 }} />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
