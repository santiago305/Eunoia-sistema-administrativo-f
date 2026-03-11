import { useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Sector } from "recharts";

import type { SecurityReasonDistributionItem } from "../../types/security.api";

const REASON_CHART_COLORS = [
  "#6366f1", // indigo
  "#06b6d4", // cyan
  "#22c55e", // green
  "#f59e0b", // amber
  "#f43f5e", // rose
  "#8b5cf6", // purple
];

type Props = {
  data: SecurityReasonDistributionItem[];
};

export function ReasonDistributionChart({ data }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const chartData = useMemo(() => {
    return [...data]
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [data]);

  const total = useMemo(
    () => chartData.reduce((acc, item) => acc + item.value, 0),
    [chartData]
  );

  const activeItem = activeIndex !== null ? chartData[activeIndex] : null;

  if (!chartData.length) {
    return (
      <div className="bg-white p-3">
        <div className="flex h-[280px] items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 text-sm text-zinc-500">
          No hay datos de distribucion por motivo.
        </div>
      </div>
    );
  }

  const handleSelect = (index: number) => {
    setActiveIndex((prev) => (prev === index ? null : index));
  };

  return (
    <div className="bg-white p-2 sm:p-3">
      <div className="grid gap-5 xl:grid-cols-[minmax(280px,1fr)_360px]">
        <div className="relative h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="label"
                innerRadius={78}
                outerRadius={110}
                paddingAngle={3}
                stroke="#ffffff"
                strokeWidth={4}
                activeIndex={activeIndex ?? undefined}
                activeShape={renderActiveShape}
                onClick={(_, index) => handleSelect(index)}
              >
                {chartData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={REASON_CHART_COLORS[index % REASON_CHART_COLORS.length]}
                    style={{ cursor: "pointer" }}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-400">
                Total
              </p>
              <p className="text-3xl font-bold tracking-tight text-zinc-950">{total}</p>

              {activeItem ? (
                <div className="mt-2">
                  <p className="max-w-[140px] text-xs font-medium text-zinc-600">
                    {activeItem.label}
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    {((activeItem.value / total) * 100).toFixed(1)}% del total
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-3 h-full flex flex-col justify-center">
          {chartData.map((item, index) => {
            const percent = total > 0 ? (item.value / total) * 100 : 0;
            const isActive = index === activeIndex;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handleSelect(index)}
                className={[
                  "w-full rounded-2xl border px-4 py-3 text-left transition-all",
                  isActive
                    ? "border-zinc-900 bg-zinc-900 text-white shadow-sm"
                    : "border-zinc-200 bg-zinc-50 text-zinc-800",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="mt-1 h-3 w-3 shrink-0 rounded-full"
                      style={{
                        backgroundColor:
                          REASON_CHART_COLORS[index % REASON_CHART_COLORS.length],
                      }}
                    />
                    <div className="min-w-0">
                      <p
                        className={[
                          "truncate text-sm font-semibold",
                          isActive ? "text-white" : "text-zinc-800",
                        ].join(" ")}
                      >
                        {item.label}
                      </p>
                      <p
                        className={[
                          "text-xs",
                          isActive ? "text-zinc-300" : "text-zinc-500",
                        ].join(" ")}
                      >
                        {percent.toFixed(1)}% del total
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p
                      className={[
                        "text-sm font-bold",
                        isActive ? "text-white" : "text-zinc-950",
                      ].join(" ")}
                    >
                      {item.value}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
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
