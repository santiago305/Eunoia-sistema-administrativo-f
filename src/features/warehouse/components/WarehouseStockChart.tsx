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
  const productItems = useMemo(() => buildChartData(items, "PRODUCT"), [items]);

  const materialItems = useMemo(() => buildChartData(items, "MATERIAL"), [items]);

  if (!productItems.length && !materialItems.length) {
    return null;
  }

  return (
    <div className="flex w-full gap-4">
      {productItems.length > 0 ? (
        <StockDonutChart
          title="productos"
          centerLabel="Productos"
          items={productItems}
        />
      ) : null}

      {materialItems.length > 0 ? (
        <StockDonutChart
          title="materia prima"
          centerLabel="Materia prima"
          items={materialItems}
        />
      ) : null}
    </div>
  );
}

type StockDonutChartProps = {
  title: string;
  centerLabel: string;
  items: WarehouseStockChartEntry[];
};

function StockDonutChart({ title, centerLabel, items }: StockDonutChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const total = useMemo(
    () => items.reduce((acc, item) => acc + item.value, 0),
    [items],
  );

  return (
    <div className="min-w-[260px] flex-1">
      <p className="mb-3 text-sm font-semibold text-zinc-800">{title}</p>

      <div className="relative h-[260px] w-full rounded-2xl border border-zinc-100 bg-white sm:h-[280px] lg:h-[300px]">
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
                    <p className="text-sm font-semibold text-zinc-900">
                      {item.label}
                    </p>

                    <p className="text-xs text-zinc-500">
                      Unidades:{" "}
                      <span className="font-medium text-zinc-800">
                        {item.value}
                      </span>
                    </p>

                    <p className="text-xs text-zinc-500">
                      Porcentaje:{" "}
                      <span className="font-medium text-zinc-800">
                        {percent.toFixed(1)}%
                      </span>
                    </p>
                  </div>
                );
              }}
            />

            <Pie
              data={items}
              dataKey="value"
              nameKey="label"
              innerRadius={66}
              outerRadius={95}
              paddingAngle={3}
              stroke="#ffffff"
              strokeWidth={4}
              activeIndex={activeIndex ?? undefined}
              activeShape={renderActiveShape}
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              {items.map((_, index) => (
                <Cell
                  key={`${centerLabel}-warehouse-stock-chart-${index}`}
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
              {centerLabel}
            </p>
            <p className="text-3xl font-bold tracking-tight text-zinc-950">
              {total}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function buildChartData(
  items: WarehouseStockItem[],
  type: WarehouseStockItem["productType"],
): WarehouseStockChartEntry[] {
  return items
    .filter((item) => item.productType === type)
    .map((item) => ({
      label: item.skuName?.trim() || item.productName?.trim() || "Sin nombre",
      value: Math.max(0, item.onHand ?? 0),
    }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);
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