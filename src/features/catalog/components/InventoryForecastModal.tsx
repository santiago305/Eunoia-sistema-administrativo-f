import { useMemo, useState } from "react";
import * as echarts from "echarts";
import { useReducedMotion } from "framer-motion";
import { Modal } from "@/shared/components/modales/Modal";
import { normalizeQuantity } from "@/shared/utils/functionPurchases";
import { useEChart } from "../utils/inventoryUtils";
import type { SkuStockForecast } from "@/shared/services/inventoryService";

type InventoryForecastModalProps = {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  forecast: SkuStockForecast | null;
};

const COLORS = {
  sales: "#18181b",
  current: "#a1a1aa",
  average: "#16a34a",
  stock: "#f97316",
  projection: "#2563eb",
};

const toSafeNumber = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const LEGEND_KEYS = {
  sales: "Salidas reales",
  average: "Promedio",
  stock: "Stock actual",
  projection: "Proyección",
} as const;

type LegendKey = keyof typeof LEGEND_KEYS;

export function InventoryForecastModal({
  open,
  onClose,
  loading,
  forecast,
}: InventoryForecastModalProps) {
  const shouldReduceMotion = useReducedMotion();

  const [hiddenLegends, setHiddenLegends] = useState<Record<LegendKey, boolean>>({
    sales: false,
    average: false,
    stock: false,
    projection: false,
  });

  const toggleLegend = (key: LegendKey) => {
    setHiddenLegends((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  const animationConfig = useMemo<
    Pick<
      echarts.EChartsOption,
      | "animation"
      | "animationDuration"
      | "animationEasing"
      | "animationDurationUpdate"
      | "animationEasingUpdate"
    >
  >(
    () => ({
      animation: !shouldReduceMotion,
      animationDuration: 800,
      animationEasing: "cubicOut",
      animationDurationUpdate: 300,
      animationEasingUpdate: "cubicOut",
    }),
    [shouldReduceMotion],
  );

  const summary = useMemo(() => {
    if (!forecast) {
      return {
        currentOut: 0,
        projection: 0,
        remaining: 0,
        exceeded: 0,
        historicalAverage: 0,
        weightedForecast: 0,
        stock: 0,
      };
    }

    const historicalValues = [1, 2, 3, 4].map((weekNumber) => {
      const week = forecast.weeks.find((entry) => entry.week === weekNumber);
      return toSafeNumber(week?.outQty);
    });

    const historicalAverage =
      historicalValues.length > 0
        ? historicalValues.reduce((acc, value) => acc + value, 0) /
          historicalValues.length
        : 0;

    /**
     * Promedio móvil ponderado:
     * S1 pesa 10%, S2 pesa 20%, S3 pesa 30%, S4 pesa 40%.
     * Así la proyección responde más a la demanda reciente.
     */
    const weights = [0.1, 0.2, 0.3, 0.4];

    const weightedForecast = historicalValues.reduce(
      (acc, value, index) => acc + value * weights[index],
      0,
    );

    /**
     * Si el backend ya manda forecastWeekly, se respeta.
     * Si no viene, usamos el cálculo local con promedio ponderado.
     */
    const backendForecast = toSafeNumber(forecast.forecastWeekly);

    const projection =
      backendForecast > 0 ? backendForecast : weightedForecast;

    const currentOut = toSafeNumber(forecast.currentWeek?.outQty);
    const stock = toSafeNumber(forecast.stock.available);

    return {
      currentOut,
      projection,
      remaining: Math.max(projection - currentOut, 0),
      exceeded: Math.max(currentOut - projection, 0),
      historicalAverage,
      weightedForecast,
      stock,
    };
  }, [forecast]);

  const forecastChart = useMemo<echarts.EChartsOption>(() => {
    if (!forecast) {
      return {
        ...animationConfig,
        tooltip: { trigger: "axis" },
        grid: {
          left: 24,
          right: 20,
          top: 12,
          bottom: 24,
          containLabel: true,
        },
        xAxis: { type: "category", data: [] },
        yAxis: { type: "value" },
        series: [],
      };
    }

    const formatDateLabel = (value?: string | null) => {
      if (!value) return "";

      const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (!match) return value.slice(0, 10);

      const [, , month, day] = match;
      return `${day}/${month}`;
    };

    const formatRange = (
      from?: string | null,
      toExclusive?: string | null,
    ) => {
      const start = formatDateLabel(from);
      const end = formatDateLabel(toExclusive);

      if (!start && !end) return "";
      if (!end) return `${start} →`;
      if (!start) return `→ ${end}`;

      return `${start} → ${end}`;
    };

    const realWeeks = [1, 2, 3, 4].map((weekNumber) => {
      const week = forecast.weeks.find((entry) => entry.week === weekNumber);

      return {
        label: `S${weekNumber}`,
        range: week ? formatRange(week.from, week.toExclusive) : "",
        salidas: toSafeNumber(week?.outQty),
        type: "real" as const,
      };
    });

    const currentWeek = {
      label: "Actual",
      range: forecast.currentWeek
        ? formatRange(
            forecast.currentWeek.from,
            forecast.currentWeek.toExclusive,
          )
        : "",
      salidas: toSafeNumber(forecast.currentWeek?.outQty),
      type: "actual" as const,
    };

    const rows = [...realWeeks, currentWeek];
    const categories = rows.map((item) => item.label);

    const salidasData = rows.map((item) => ({
      value: item.salidas,
      itemStyle: {
        color: item.type === "actual" ? COLORS.current : COLORS.sales,
        borderRadius: [4, 4, 0, 0],
      },
    }));

    const promedioData = rows.map(() => summary.historicalAverage);
    const stockData = rows.map(() => summary.stock);

    const projectionData = rows.map((item) => {
      if (item.type !== "actual") return null;
      return summary.projection;
    });

    const tooltipFormatter = (params: unknown) => {
      const items = Array.isArray(params) ? params : [params];

      if (!items.length) return "";

      const firstItem = items[0] as {
        axisValueLabel?: string;
        name?: string;
      };

      const axisLabel = firstItem.axisValueLabel ?? firstItem.name ?? "";
      const row = rows.find((item) => item.label === axisLabel);

      const lines: string[] = [`<strong>${axisLabel}</strong>`];

      if (row?.range) {
        lines.push(`<span style="color:#71717a">${row.range}</span>`);
      }

      items.forEach((entry) => {
        const item = entry as {
          marker?: string;
          seriesName?: string;
          value?: string | number | null | undefined;
        };

        if (item.value === null || item.value === undefined) return;

        lines.push(
          `${item.marker ?? ""}${item.seriesName ?? ""}: ${
            normalizeQuantity(item.value) ?? 0
          }`,
        );
      });

      if (axisLabel === "Actual") {
        lines.push(
          summary.remaining > 0
            ? `<span style="color:#71717a">Falta para llegar a proyección: ${normalizeQuantity(
                summary.remaining,
              )}</span>`
            : `<span style="color:#16a34a">Superó la proyección por: ${normalizeQuantity(
                summary.exceeded,
              )}</span>`,
        );
      }

      return lines.join("<br/>");
    };

    return {
      ...animationConfig,

      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "shadow",
          shadowStyle: {
            color: "rgba(24,24,27,0.04)",
          },
        },
        formatter: tooltipFormatter,
      },

      legend: {
        show: false,
        selected: {
          [LEGEND_KEYS.sales]: !hiddenLegends.sales,
          [LEGEND_KEYS.average]: !hiddenLegends.average,
          [LEGEND_KEYS.stock]: !hiddenLegends.stock,
          [LEGEND_KEYS.projection]: !hiddenLegends.projection,
        },
      },

      grid: {
        left: 24,
        right: 24,
        top: 16,
        bottom: 28,
        containLabel: true,
      },

      xAxis: {
        type: "category",
        data: categories,
        axisTick: { show: false },
        axisLine: {
          lineStyle: {
            color: "#e4e4e7",
          },
        },
        axisLabel: {
          color: "#71717a",
          fontSize: 11,
        },
      },

      yAxis: {
        type: "value",
        axisLabel: {
          color: "#71717a",
          fontSize: 11,
        },
        splitLine: {
          lineStyle: {
            color: "#f1f1f1",
          },
        },
      },

      series: [
        {
          name: LEGEND_KEYS.sales,
          type: "bar",
          data: salidasData,
          barWidth: 26,
        },
        {
          name: LEGEND_KEYS.average,
          type: "line",
          data: promedioData,
          symbol: "none",
          lineStyle: {
            color: COLORS.average,
            width: 1.8,
            type: "dashed",
          },
        },
        {
          name: LEGEND_KEYS.stock,
          type: "line",
          data: stockData,
          symbol: "none",
          lineStyle: {
            color: COLORS.stock,
            width: 2,
          },
        },
        {
          name: LEGEND_KEYS.projection,
          type: "line",
          data: projectionData,
          symbol: "circle",
          symbolSize: 11,
          lineStyle: {
            color: COLORS.projection,
            width: 0,
          },
          itemStyle: {
            color: COLORS.projection,
            borderColor: "#ffffff",
            borderWidth: 2,
          },
        },
      ],
    };
  }, [animationConfig, forecast, hiddenLegends, summary]);

  const refForecast = useEChart(forecastChart);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Proyección semanal"
      className="w-[min(56rem,calc(100vw-2rem))]"
      bodyClassName="p-5"
    >
      {loading ? (
        <div className="flex h-[320px] items-center justify-center text-sm text-black/60">
          Cargando proyección...
        </div>
      ) : forecast ? (
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-4">
            <div className="rounded-md bg-zinc-50 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-zinc-400">
                Actual
              </p>
              <p className="text-sm font-semibold text-zinc-900">
                {normalizeQuantity(summary.currentOut)}
              </p>
            </div>

            <div className="rounded-md bg-zinc-50 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-zinc-400">
                Proyección
              </p>
              <p className="text-sm font-semibold text-blue-600">
                {normalizeQuantity(summary.projection)}
              </p>
            </div>

            <div className="rounded-md bg-zinc-50 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-zinc-400">
                Promedio
              </p>
              <p className="text-sm font-semibold text-green-600">
                {normalizeQuantity(summary.historicalAverage)}
              </p>
            </div>

            <div className="rounded-md bg-zinc-50 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-zinc-400">
                Estado
              </p>
              <p
                className={`text-sm font-semibold ${
                  summary.remaining > 0 ? "text-zinc-900" : "text-emerald-600"
                }`}
              >
                {summary.remaining > 0
                  ? `Faltan ${normalizeQuantity(summary.remaining)}`
                  : `+${normalizeQuantity(summary.exceeded)}`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-zinc-500">
            <button
              type="button"
              onClick={() => toggleLegend("sales")}
              className={`flex items-center gap-1.5 transition-opacity ${
                hiddenLegends.sales ? "opacity-35" : "opacity-100"
              }`}
            >
              <span
                className="h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: COLORS.sales }}
              />
              <span>Salidas reales</span>
            </button>

            <button
              type="button"
              onClick={() => toggleLegend("average")}
              className={`flex items-center gap-1.5 transition-opacity ${
                hiddenLegends.average ? "opacity-35" : "opacity-100"
              }`}
            >
              <span
                className="h-px w-5 border-t border-dashed"
                style={{ borderColor: COLORS.average }}
              />
              <span>Promedio</span>
            </button>

            <button
              type="button"
              onClick={() => toggleLegend("stock")}
              className={`flex items-center gap-1.5 transition-opacity ${
                hiddenLegends.stock ? "opacity-35" : "opacity-100"
              }`}
            >
              <span
                className="h-px w-5"
                style={{ backgroundColor: COLORS.stock }}
              />
              <span>Stock actual</span>
            </button>

            <button
              type="button"
              onClick={() => toggleLegend("projection")}
              className={`flex items-center gap-1.5 transition-opacity ${
                hiddenLegends.projection ? "opacity-35" : "opacity-100"
              }`}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: COLORS.projection }}
              />
              <span>Proyección</span>
            </button>
          </div>

          <div ref={refForecast} className="h-[320px] w-full" />
        </div>
      ) : (
        <div className="flex h-[320px] items-center justify-center text-sm text-black/60">
          No hay datos de proyección para este SKU.
        </div>
      )}
    </Modal>
  );
}
