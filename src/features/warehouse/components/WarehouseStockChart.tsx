import { useMemo, useState } from "react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Sector,
  Tooltip,
} from "recharts";
import { CHART_COLORS } from "@/shared/utils/chartColors";
import type { WarehouseStockItem } from "@/features/warehouse/types/warehouse";

type WarehouseStockChartEntry = {
  label: string;
  value: number;
};

type Props = {
  items: WarehouseStockItem[];
};

export function WarehouseStockChart({ items }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const chartData = useMemo<WarehouseStockChartEntry[]>(() => {
    return items
      .map((item) => ({
        label: item.skuName?.trim() || item.productName?.trim() || "Sin nombre",
        value: Math.max(0, item.onHand ?? 0),
      }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [items]);

  const total = useMemo(
    () => chartData.reduce((acc, item) => acc + item.value, 0),
    [chartData],
  );

  if (!chartData.length) {
    return (
      <div className="flex h-[240px] items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 text-sm text-zinc-500">
        No hay stock para mostrar.
      </div>
    );
  }

  return (
    <div className="relative h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip
            cursor={false}
            wrapperStyle={{ zIndex: 9999 }}
            content={({ active, payload }) => {
              if (!active || !payload || !payload.length) return null;

              const item = payload[0].payload as WarehouseStockChartEntry;
              const percent = total > 0 ? (item.value / total) * 100 : 0;

              return (
                <div className="rounded-xl border border-zinc-200 bg-white px-3 py-2 shadow-xl">
                  <p className="text-sm font-semibold text-zinc-900">{item.label}</p>
                  <p className="text-xs text-zinc-500">
                    Unidades: <span className="font-medium text-zinc-800">{item.value}</span>
                  </p>
                  <p className="text-xs text-zinc-500">
                    Porcentaje: <span className="font-medium text-zinc-800">{percent.toFixed(1)}%</span>
                  </p>
                </div>
              );
            }}
          />

          <Pie
            data={chartData}
            dataKey="value"
            nameKey="label"
            innerRadius={72}
            outerRadius={106}
            paddingAngle={3}
            stroke="#ffffff"
            strokeWidth={4}
            activeIndex={activeIndex ?? undefined}
            activeShape={renderActiveShape}
            onMouseEnter={(_, index) => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
          >
            {chartData.map((_, index) => (
              <Cell
                key={`warehouse-stock-chart-${index}`}
                fill={CHART_COLORS[index % CHART_COLORS.length]}
                style={{ cursor: "pointer" }}
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      <div className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-400">
            Productos
          </p>
          <p className="text-3xl font-bold tracking-tight text-zinc-950">{total}</p>
        </div>
      </div>
    </div>
  );
}

type ActiveShapeProps = {
  cx: number;
  cy: number;
  innerRadius: number;
  outerRadius: number;
  startAngle: number;
  endAngle: number;
  fill: string;
};

function isActiveShapeProps(value: unknown): value is ActiveShapeProps {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.cx === "number" &&
    typeof candidate.cy === "number" &&
    typeof candidate.innerRadius === "number" &&
    typeof candidate.outerRadius === "number" &&
    typeof candidate.startAngle === "number" &&
    typeof candidate.endAngle === "number" &&
    typeof candidate.fill === "string"
  );
}

function renderActiveShape(props: unknown) {
  if (!isActiveShapeProps(props)) {
    return <g />;
  }

  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 2}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
    </g>
  );
}
