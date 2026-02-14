import { useEffect, useMemo, useState } from "react";
import { PageTitle } from "@/components/PageTitle";
import { listProducts } from "@/services/productService";
import { useProducts } from "@/hooks/useProducts";
import {
  Activity,
  Layers,
  PieChart,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

// Si tu proyecto usa otro wrapper de ECharts, cambia este import.
// El más común es: npm i echarts echarts-for-react
import ReactECharts from "echarts-for-react";

type Product = {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

const PRIMARY = "#21b8a6";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function formatPct(value: number) {
  const v = clamp(value, 0, 100);
  return `${v.toFixed(0)}%`;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function diffDays(a: Date, b: Date) {
  const ms = startOfDay(a).getTime() - startOfDay(b).getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

function monthKey(date: Date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  return `${y}-${m}`;
}

function monthLabel(key: string) {
  // key: YYYY-MM
  const [y, m] = key.split("-").map((x) => Number(x));
  const date = new Date(y, m - 1, 1);
  return date.toLocaleDateString("es-PE", { month: "short", year: "2-digit" });
}

async function fetchProductSample(maxItems = 1000) {
  // Para dashboard: buscamos un "sample" razonable sin reventar la API.
  const pageSize = 200;
  const first = await listProducts({ page: 1, limit: pageSize });
  const total = first.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const maxPages = Math.max(1, Math.ceil(maxItems / pageSize));
  const pagesToFetch = Math.min(pages, maxPages);

  const items: Product[] = [...((first.items ?? []) as Product[])];
  for (let p = 2; p <= pagesToFetch; p += 1) {
    const res = await listProducts({ page: p, limit: pageSize });
    const batch = (res.items ?? []) as Product[];
    if (batch.length) items.push(...batch);
  }

  return {
    items,
    total,
    fetched: items.length,
    pagesFetched: pagesToFetch,
  };
}

export default function CatalogSummary() {
  const shouldReduceMotion = useReducedMotion();

  const [totals, setTotals] = useState({ total: 0, active: 0, inactive: 0 });
  const [totalsLoading, setTotalsLoading] = useState(false);

  const [sample, setSample] = useState<Product[]>([]);
  const [sampleMeta, setSampleMeta] = useState<{ fetched: number; total: number } | null>(null);
  const [sampleLoading, setSampleLoading] = useState(false);

  // Mantengo tu lógica existente (últimos 10) sin tocar funcionalidad.
  const listParams = useMemo(() => ({ page: 1, limit: 10 }), []);
  const { items: products, loading } = useProducts(listParams);

  // Animations (minimal + clean)
  const fadeUp = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.18 } },
    exit: { opacity: 0, y: 6, transition: { duration: 0.12 } },
  };

  useEffect(() => {
    const loadTotals = async () => {
      setTotalsLoading(true);
      try {
        const [allRes, activeRes, inactiveRes] = await Promise.all([
          listProducts({ page: 1, limit: 1 }),
          listProducts({ page: 1, limit: 1, isActive: "true" }),
          listProducts({ page: 1, limit: 1, isActive: "false" }),
        ]);
        setTotals({
          total: allRes.total ?? 0,
          active: activeRes.total ?? 0,
          inactive: inactiveRes.total ?? 0,
        });
      } finally {
        setTotalsLoading(false);
      }
    };

    const loadSample = async () => {
      setSampleLoading(true);
      try {
        const res = await fetchProductSample(1000);
        setSample(res.items);
        setSampleMeta({ fetched: res.fetched, total: res.total });
      } catch {
        setSample([]);
        setSampleMeta(null);
      } finally {
        setSampleLoading(false);
      }
    };

    void loadTotals();
    void loadSample();
  }, []);

  const latestProducts = useMemo(() => {
    return [...(products as Product[])].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [products]);

  const insights = useMemo(() => {
    const now = new Date();
    const activeRate = totals.total ? (totals.active / totals.total) * 100 : 0;

    // Con sample calculamos "tendencias" sin exigir endpoints extras
    const created30 = sample.filter((p) => diffDays(now, new Date(p.createdAt)) <= 30).length;
    const updated7 = sample.filter((p) => diffDays(now, new Date(p.updatedAt)) <= 7).length;

    return {
      activeRate,
      created30,
      updated7,
    };
  }, [totals, sample]);

  const statusPieOption = useMemo(() => {
    return {
      tooltip: { trigger: "item" },
      series: [
        {
          name: "Estado",
          type: "pie",
          radius: ["60%", "80%"],     // un poco menos agresivo que 85%
          center: ["50%", "50%"],     // vuelve al centro real
          avoidLabelOverlap: true,
          itemStyle: {
            borderRadius: 10,
            borderColor: "#fff",
            borderWidth: 2,
          },
          label: { show: false },
          labelLine: { show: false },
          data: [
            { value: totals.active, name: "Activos", itemStyle: { color: PRIMARY } },
            { value: totals.inactive, name: "Inactivos", itemStyle: { color: "#E11D48" } },
          ],
        },
      ],
    };
  }, [totals]);



  const createdByMonth = useMemo(() => {
    // últimos 6 meses por defecto (basado en sample)
    const now = new Date();
    const keys: string[] = [];
    const map = new Map<string, number>();

    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const k = monthKey(d);
      keys.push(k);
      map.set(k, 0);
    }

    for (const p of sample) {
      const k = monthKey(new Date(p.createdAt));
      if (map.has(k)) map.set(k, (map.get(k) ?? 0) + 1);
    }

    return {
      keys,
      labels: keys.map(monthLabel),
      values: keys.map((k) => map.get(k) ?? 0),
    };
  }, [sample]);

  const createdBarOption = useMemo(() => {
    return {
      tooltip: { trigger: "axis" },
      grid: { left: 24, right: 14, top: 20, bottom: 24, containLabel: true },
      xAxis: {
        type: "category",
        data: createdByMonth.labels,
        axisTick: { alignWithLabel: true },
        axisLabel: { color: "rgba(0,0,0,.55)" },
        axisLine: { lineStyle: { color: "rgba(0,0,0,.08)" } },
      },
      yAxis: {
        type: "value",
        axisLabel: { color: "rgba(0,0,0,.55)" },
        splitLine: { lineStyle: { color: "rgba(0,0,0,.06)" } },
      },
      series: [
        {
          name: "Nuevos",
          type: "bar",
          data: createdByMonth.values,
          barWidth: 22,
          itemStyle: { color: PRIMARY, borderRadius: [10, 10, 0, 0] },
        },
      ],
    };
  }, [createdByMonth]);

  const kpiCard = (
    title: string,
    value: string | number,
    subtitle: string,
    icon: React.ReactNode,
    tone: "neutral" | "primary" | "danger" = "neutral"
  ) => {
    const iconWrap =
      tone === "primary"
        ? "border-[#21b8a6]/25 bg-[#21b8a6]/10"
        : tone === "danger"
        ? "border-rose-600/20 bg-rose-50"
        : "border-black/10 bg-black/[0.02]";

    const iconColor =
      tone === "primary" ? "text-[#21b8a6]" : tone === "danger" ? "text-rose-600" : "text-black/70";

    return (
      <div className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-black/50">{title}</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p>
          </div>
          <div className={`rounded-2xl border p-3 ${iconWrap}`}>
            <div className={iconColor}>{icon}</div>
          </div>
        </div>
        <p className="mt-3 text-xs text-black/50">{subtitle}</p>
      </div>
    );
  };

  return (
    <div className="w-full min-h-screen bg-white text-black">
      <PageTitle title="Catálogo · Resumen" />

      <div className="mx-auto w-full max-w-[1500px] 2xl:max-w-[1700px] 3xl:max-w-[1900px] px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
          animate={shouldReduceMotion ? false : { opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"
        >
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Catálogo (Resumen)</h1>
            <p className="text-sm text-black/60">
              Control general del catálogo: estado, actividad reciente y evolución.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-2xl border border-black/10 bg-black/[0.02] px-3 py-2 text-xs">
              <span className="text-black/60">Total</span>{" "}
              <span className="font-semibold text-black tabular-nums">{totals.total}</span>
            </div>
            <div className="rounded-2xl border border-[#21b8a6]/25 bg-[#21b8a6]/10 px-3 py-2 text-xs">
              <span className="text-black/60">Activos</span>{" "}
              <span className="font-semibold text-black tabular-nums">{totals.active}</span>
            </div>
            <div className="rounded-2xl border border-rose-600/15 bg-rose-50 px-3 py-2 text-xs">
              <span className="text-black/60">Inactivos</span>{" "}
              <span className="font-semibold text-black tabular-nums">{totals.inactive}</span>
            </div>
          </div>
        </motion.div>

        {/* KPIs */}
        <motion.section
          initial={shouldReduceMotion ? false : "hidden"}
          animate={shouldReduceMotion ? false : "show"}
          variants={fadeUp}
          className="grid grid-cols-1 gap-4 lg:grid-cols-4"
        >
          {kpiCard(
            "Productos",
            totalsLoading ? "…" : totals.total,
            totalsLoading ? "Cargando resumen…" : "Conteo total de productos registrados.",
            <Layers className="h-5 w-5" />,
            "neutral"
          )}

          {kpiCard(
            "Activos",
            totalsLoading ? "…" : totals.active,
            "Disponibles para venta / uso.",
            <TrendingUp className="h-5 w-5" />,
            "primary"
          )}

          {kpiCard(
            "Inactivos",
            totalsLoading ? "…" : totals.inactive,
            "Deshabilitados o pausados.",
            <TrendingDown className="h-5 w-5" />,
            "danger"
          )}

          {kpiCard(
            "Tasa activos",
            totalsLoading ? "…" : formatPct(insights.activeRate),
            "Qué tan “limpio” está el catálogo.",
            <Sparkles className="h-5 w-5" />,
            "primary"
          )}
        </motion.section>

        {/* Charts */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <motion.div
            initial={shouldReduceMotion ? false : "hidden"}
            animate={shouldReduceMotion ? false : "show"}
            variants={fadeUp}
            className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Estado del catálogo</p>
                <p className="text-xs text-black/60">Distribución de activos vs inactivos.</p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-3">
                <PieChart className="h-5 w-5 text-black/70" />
              </div>
            </div>

            <div className="mt-4">
              <ReactECharts
                option={statusPieOption}
                style={{ height: 260, width: "100%" }}
                opts={{ renderer: "canvas" }}
              />
            </div>

            <p className="mt-2 text-xs text-black/50">
              {totalsLoading ? "Actualizando…" : "Usa esto para detectar catálogos con exceso de productos inactivos."}
            </p>
          </motion.div>

          <motion.div
            initial={shouldReduceMotion ? false : "hidden"}
            animate={shouldReduceMotion ? false : "show"}
            variants={fadeUp}
            className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Nuevos productos</p>
                <p className="text-xs text-black/60">Últimos 6 meses (según muestra cargada).</p>
              </div>
              <div className="rounded-2xl border border-[#21b8a6]/25 bg-[#21b8a6]/10 p-3">
                <Activity className="h-5 w-5" style={{ color: PRIMARY }} />
              </div>
            </div>

            <div className="mt-4">
              <ReactECharts
                option={createdBarOption}
                style={{ height: 260, width: "100%" }}
                opts={{ renderer: "canvas" }}
              />
            </div>

            <p className="mt-2 text-xs text-black/50">
              {sampleLoading
                ? "Cargando datos…"
                : sampleMeta
                ? `Analizado: ${sampleMeta.fetched} de ${sampleMeta.total} productos (muestra).`
                : "No se pudo cargar la muestra."}
            </p>
          </motion.div>
        </section>

        {/* Activity strip */}
        <motion.section
          initial={shouldReduceMotion ? false : "hidden"}
          animate={shouldReduceMotion ? false : "show"}
          variants={fadeUp}
          className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold">Actividad reciente</p>
              <p className="text-xs text-black/60">Señales rápidas para control y orden.</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="rounded-2xl border border-black/10 bg-black/[0.02] px-3 py-2 text-xs">
                <span className="text-black/60">Nuevos (30d)</span>{" "}
                <span className="font-semibold text-black tabular-nums">{sampleLoading ? "…" : insights.created30}</span>
              </div>
              <div className="rounded-2xl border border-black/10 bg-black/[0.02] px-3 py-2 text-xs">
                <span className="text-black/60">Actualizados (7d)</span>{" "}
                <span className="font-semibold text-black tabular-nums">{sampleLoading ? "…" : insights.updated7}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
            <div className="rounded-2xl border border-black/10 bg-white p-4">
              <p className="text-xs text-black/50">Sugerencia</p>
              <p className="mt-1 text-sm font-medium">Mantén inactivos bajo control</p>
              <p className="mt-1 text-xs text-black/60">
                Si sube el % de inactivos, suele ser señal de catálogo desordenado o productos duplicados.
              </p>
            </div>
            <div className="rounded-2xl border border-black/10 bg-white p-4">
              <p className="text-xs text-black/50">Sugerencia</p>
              <p className="mt-1 text-sm font-medium">Define estándar de nombres</p>
              <p className="mt-1 text-xs text-black/60">
                Consistencia en nombres mejora búsquedas, variantes y reduce errores de registro.
              </p>
            </div>
            <div className="rounded-2xl border border-black/10 bg-white p-4">
              <p className="text-xs text-black/50">Sugerencia</p>
              <p className="mt-1 text-sm font-medium">Revisión semanal</p>
              <p className="mt-1 text-xs text-black/60">
                Un check semanal evita que el catálogo se convierta en un cementerio de productos.
              </p>
            </div>
          </div>
        </motion.section>

        {/* Últimos productos */}
        <motion.section
          initial={shouldReduceMotion ? false : "hidden"}
          animate={shouldReduceMotion ? false : "show"}
          variants={fadeUp}
          className="rounded-3xl border border-black/10 bg-white shadow-sm overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-black/10">
            <div>
              <p className="text-sm font-semibold">Últimos productos</p>
              <p className="text-xs text-black/60">Ordenados por fecha de creación.</p>
            </div>
            <div className="text-xs text-black/50">
              {loading ? "Cargando…" : `Mostrando ${latestProducts.length}`}
            </div>
          </div>

          {/* Desktop table */}
          <div className="hidden lg:block">
            <div className="max-h-[calc(100vh-420px)] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-white text-xs text-black/60">
                  <tr className="border-b border-black/10">
                    <th className="py-3 px-5 text-left">Producto</th>
                    <th className="py-3 px-5 text-left">Descripción</th>
                    <th className="py-3 px-5 text-left">Estado</th>
                    <th className="py-3 px-5 text-right">Creado</th>
                  </tr>
                </thead>

                <AnimatePresence mode="wait" initial={false}>
                  <motion.tbody
                    key={`${latestProducts.length}-${loading}`}
                    initial={shouldReduceMotion ? false : { opacity: 0 }}
                    animate={shouldReduceMotion ? false : { opacity: 1 }}
                    exit={shouldReduceMotion ? undefined : { opacity: 0 }}
                    transition={{ duration: 0.14 }}
                  >
                    {latestProducts.map((product) => (
                      <motion.tr
                        key={product.id}
                        layout
                        className="border-b border-black/5 hover:bg-black/[0.02]"
                      >
                        <td className="py-4 px-5 font-medium">{product.name}</td>
                        <td className="py-4 px-5 text-black/70">
                          <p className="line-clamp-2 max-w-[720px]">{product.description ?? "-"}</p>
                        </td>
                        <td className="py-4 px-5">
                          <span
                            className={[
                              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset",
                              product.isActive
                                ? "bg-[#21b8a6]/10 text-[#0f766e] ring-[#21b8a6]/25"
                                : "bg-rose-50 text-rose-700 ring-rose-600/15",
                            ].join(" ")}
                          >
                            <span
                              className={[
                                "h-1.5 w-1.5 rounded-full",
                                product.isActive ? "bg-[#21b8a6]" : "bg-rose-500",
                              ].join(" ")}
                            />
                            {product.isActive ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-right text-black/60 tabular-nums">
                          {new Date(product.createdAt).toLocaleDateString("es-PE")}
                        </td>
                      </motion.tr>
                    ))}
                  </motion.tbody>
                </AnimatePresence>
              </table>

              {!loading && latestProducts.length === 0 && (
                <p className="px-5 py-6 text-sm text-black/60">No hay productos para mostrar.</p>
              )}
            </div>
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden">
            <div className="max-h-[calc(100vh-460px)] overflow-auto p-4 sm:p-5 space-y-3">
              {latestProducts.map((product) => (
                <motion.div
                  key={product.id}
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
                  animate={shouldReduceMotion ? false : { opacity: 1, y: 0 }}
                  transition={{ duration: 0.14 }}
                  className="rounded-3xl border border-black/10 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{product.name}</p>
                      <p className="mt-1 text-sm text-black/70 line-clamp-2">{product.description ?? "-"}</p>
                      <div className="mt-3">
                        <span
                          className={[
                            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset",
                            product.isActive
                              ? "bg-[#21b8a6]/10 text-[#0f766e] ring-[#21b8a6]/25"
                              : "bg-rose-50 text-rose-700 ring-rose-600/15",
                          ].join(" ")}
                        >
                          <span
                            className={[
                              "h-1.5 w-1.5 rounded-full",
                              product.isActive ? "bg-[#21b8a6]" : "bg-rose-500",
                            ].join(" ")}
                          />
                          {product.isActive ? "Activo" : "Inactivo"}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-black/50 tabular-nums">
                      {new Date(product.createdAt).toLocaleDateString("es-PE")}
                    </div>
                  </div>
                </motion.div>
              ))}

              {!loading && latestProducts.length === 0 && (
                <div className="rounded-3xl border border-black/10 bg-white p-4 text-sm text-black/60">
                  No hay productos para mostrar.
                </div>
              )}
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
