import { useEffect, useMemo, useRef } from "react";
import * as echarts from "echarts";
import { motion } from "framer-motion";
import { stockMock } from "@/data/stockMock";

const alerts = [
  { title: "Bajo stock", detail: "12 SKUs debajo del minimo en Almacen Norte" },
  { title: "Ajustes recientes", detail: "4 ajustes posteados en las ultimas 24h" },
  { title: "Transferencias pendientes", detail: "7 transferencias en borrador" },
];

const quickActions = [
  { label: "Nuevo documento", helper: "Crear ajuste, ingreso o salida" },
  { label: "Nueva transferencia", helper: "Mover stock entre almacenes" },
  { label: "Ajuste rapido", helper: "Corregir stock puntual" },
  { label: "Ver kardex", helper: "Auditar movimientos" },
];

const insights = [
  { title: "SKU-221", detail: "Rotacion alta, riesgo de quiebre" },
  { title: "Almacen Sur", detail: "Sobrestock en linea casual" },
  { title: "Ecommerce", detail: "Demanda subio 12%" },
];

const useEChart = (options: echarts.EChartsOption) => {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current, undefined, { renderer: "canvas" });
    chart.setOption(options);

    const handleResize = () => chart.resize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.dispose();
    };
  }, [options]);

  return ref;
};

interface ChartCardProps {
  title: string;
  subtitle?: string;
  options: echarts.EChartsOption;
  height?: number;
}

const ChartCard = ({ title, subtitle, options, height = 220 }: ChartCardProps) => {
  const ref = useEChart(options);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">{title}</p>
          {subtitle && <p className="text-xs text-black/60">{subtitle}</p>}
        </div>
        <span className="text-[10px] uppercase tracking-wide text-black/40">Live</span>
      </div>
      <div ref={ref} style={{ height }} className="mt-4 w-full" />
    </motion.div>
  );
};

export default function StockSummary() {
  // PROVISIONAL: KPIs computed from mock data aligned to SQL schema.
  const todayIso = new Date().toISOString().slice(0, 10);
  const totalUnits = stockMock.inventory.reduce((acc, item) => acc + item.on_hand, 0);
  const totalValue = stockMock.inventory.reduce((acc, item) => {
    const variant = stockMock.variants.find((v) => v.variant_id === item.variant_id);
    const cost = variant?.cost ?? 0;
    return acc + item.on_hand * cost;
  }, 0);
  const lowMinCount = stockMock.reorderRules.filter((rule) => {
    const inv = stockMock.inventory.find(
      (item) => item.variant_id === rule.variant_id && item.warehouse_id === rule.warehouse_id
    );
    return inv ? inv.on_hand < rule.min_qty : false;
  }).length;
  const movementsToday = stockMock.ledger.filter((m) => m.created_at.startsWith(todayIso)).length;

  const kpis = [
    {
      label: "Stock total (unidades)",
      value: totalUnits.toLocaleString("es-PE"),
      delta: "+2.4%",
      helper: "vs semana anterior",
    },
    {
      label: "Stock valorizado",
      value: `$ ${totalValue.toLocaleString("es-PE", { maximumFractionDigits: 0 })}`,
      delta: "+1.1%",
      helper: "costo promedio",
    },
    {
      label: "Items bajo minimo",
      value: lowMinCount.toString(),
      delta: "-6",
      helper: "requieren reposicion",
    },
    {
      label: "Movimientos hoy",
      value: movementsToday.toString(),
      delta: "+18",
      helper: "entradas + salidas",
    },
  ];
  const stockByWarehouse = useMemo<echarts.EChartsOption>(
    () => ({
      tooltip: { trigger: "item" },
      series: [
        {
          type: "pie",
          radius: ["45%", "70%"],
          label: { show: false },
          data: [
            { value: 44, name: "Almacen Central" },
            { value: 28, name: "Norte" },
            { value: 18, name: "Sur" },
            { value: 10, name: "Ecommerce" },
          ],
        },
      ],
    }),
    []
  );

  const topMoved = useMemo<echarts.EChartsOption>(
    () => ({
      grid: { left: 20, right: 10, top: 10, bottom: 20, containLabel: true },
      xAxis: { type: "value", axisLabel: { color: "#111" } },
      yAxis: {
        type: "category",
        data: ["SKU-093", "SKU-221", "SKU-114", "SKU-445", "SKU-701"],
        axisLabel: { color: "#111" },
      },
      series: [
        {
          type: "bar",
          data: [980, 860, 740, 620, 510],
          itemStyle: { color: "#111" },
          barWidth: 14,
        },
      ],
    }),
    []
  );

  const last30Days = useMemo<echarts.EChartsOption>(
    () => ({
      grid: { left: 20, right: 16, top: 10, bottom: 20, containLabel: true },
      xAxis: {
        type: "category",
        data: [
          "01", "04", "07", "10", "13", "16", "19", "22", "25", "28",
        ],
        axisLabel: { color: "#111" },
      },
      yAxis: { type: "value", axisLabel: { color: "#111" } },
      series: [
        {
          type: "line",
          smooth: true,
          data: [42, 58, 48, 62, 71, 66, 74, 69, 83, 77],
          lineStyle: { color: "#0f766e" },
          itemStyle: { color: "#0f766e" },
          areaStyle: { color: "rgba(15, 118, 110, 0.12)" },
        },
      ],
    }),
    []
  );

  const heatmap = useMemo<echarts.EChartsOption>(
    () => ({
      grid: { left: 30, right: 10, top: 10, bottom: 20, containLabel: true },
      xAxis: {
        type: "category",
        data: ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"],
        axisLabel: { color: "#111" },
      },
      yAxis: {
        type: "category",
        data: ["Ajustes", "Transfer", "Recep", "Salidas"],
        axisLabel: { color: "#111" },
      },
      visualMap: {
        min: 0,
        max: 20,
        show: false,
        inRange: { color: ["#e0f2f1", "#0f766e"] },
      },
      series: [
        {
          type: "heatmap",
          data: [
            [0, 0, 8], [1, 0, 12], [2, 0, 6], [3, 0, 14], [4, 0, 9], [5, 0, 4], [6, 0, 3],
            [0, 1, 10], [1, 1, 7], [2, 1, 11], [3, 1, 15], [4, 1, 13], [5, 1, 6], [6, 1, 4],
            [0, 2, 12], [1, 2, 9], [2, 2, 8], [3, 2, 16], [4, 2, 14], [5, 2, 7], [6, 2, 5],
            [0, 3, 6], [1, 3, 10], [2, 3, 9], [3, 3, 13], [4, 3, 11], [5, 3, 5], [6, 3, 4],
          ],
        },
      ],
    }),
    []
  );

  const heatmapRef = useEChart(heatmap);

  return (
    <div className="w-full h-full min-h-screen bg-white text-black">
      <div className="px-6 py-6 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Stock (Resumen)</h1>
              <p className="text-sm text-black/60">
                Vision general para reaccionar rapido al estado del inventario.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-black/10 bg-black/[0.02] px-3 py-1 text-xs">Hoy</span>
              <span className="rounded-full border border-black/10 bg-black/[0.02] px-3 py-1 text-xs">Ultimos 7 dias</span>
              <span className="rounded-full border border-black/10 bg-black/[0.02] px-3 py-1 text-xs">Ultimos 30 dias</span>
            </div>
          </div>
        </motion.div>

        <motion.section
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4"
          initial="hidden"
          animate="show"
          variants={{
            hidden: { opacity: 0 },
            show: { opacity: 1, transition: { staggerChildren: 0.08 } },
          }}
        >
          {kpis.map((kpi) => (
            <motion.div
              key={kpi.label}
              variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
              className="rounded-2xl border border-black/10 bg-[#f0faf9] p-5 shadow-sm"
            >
              <p className="text-xs font-medium text-black/60">{kpi.label}</p>
              <div className="mt-2 flex items-end justify-between">
                <span className="text-2xl font-semibold">{kpi.value}</span>
                <span className="text-xs font-semibold text-[#0f766e]">{kpi.delta}</span>
              </div>
              <p className="mt-2 text-xs text-black/50">{kpi.helper}</p>
            </motion.div>
          ))}
        </motion.section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ChartCard title="Stock por almacen" subtitle="Distribucion por ubicacion" options={stockByWarehouse} />
          <ChartCard title="Top productos movidos" subtitle="Ultimas 24 horas" options={topMoved} />
          <ChartCard title="Movimientos ultimos 30 dias" subtitle="Entradas y salidas" options={last30Days} />
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm space-y-4"
          >
            <div>
              <p className="text-sm font-semibold">Alertas</p>
              <p className="text-xs text-black/60">Acciones recomendadas</p>
            </div>
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div key={alert.title} className="rounded-xl border border-black/10 bg-black/[0.02] p-3">
                  <p className="text-sm font-semibold">{alert.title}</p>
                  <p className="text-xs text-black/60">{alert.detail}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm"
          >
            <p className="text-sm font-semibold">Insights rapidos</p>
            <p className="text-xs text-black/60">Lecturas accionables</p>
            <div className="mt-4 space-y-3">
              {insights.map((item) => (
                <div key={item.title} className="rounded-xl border border-black/10 p-3">
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="text-xs text-black/60">{item.detail}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold">Actividad semanal</p>
                <p className="text-xs text-black/60">Intensidad de documentos por dia</p>
              </div>
            </div>
            <div ref={heatmapRef} className="mt-4" style={{ height: 200 }} />
          </motion.div>
        </section>

        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Accesos rapidos</p>
              <p className="text-xs text-black/60">Atajos para actuar sin perder tiempo</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {quickActions.map((action) => (
              <motion.button
                key={action.label}
                type="button"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="rounded-xl border border-black/10 bg-black/[0.02] p-4 text-left transition"
              >
                <p className="text-sm font-semibold">{action.label}</p>
                <p className="text-xs text-black/60">{action.helper}</p>
              </motion.button>
            ))}
          </div>
        </motion.section>
      </div>
    </div>
  );
}



