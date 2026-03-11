import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { SecurityTopRouteItem } from "../../types/security.api";
import { ChartTooltip } from "./ChartTooltip";

const TOP_ROUTES_CHART_COLORS = [
  "#16a34a",
  "#15803d",
  "#22c55e",
  "#4ade80",
  "#65a30d",
  "#84cc16",
];

export function TopRoutesChart({
  data,
}: {
  data: SecurityTopRouteItem[];
}) {
  const sortedData = [...data].sort((a, b) => b.count - a.count);

  return (
    <div className="h-[290px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={sortedData}
          layout="vertical"
          margin={{ left: 40 }}
          barCategoryGap="25%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

          <XAxis
            type="number"
            tick={{ fill: "#71717a", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />

          <YAxis
            type="category"
            dataKey="path"
            tick={{ fill: "#71717a", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={130}
          />

          <Tooltip content={<ChartTooltip />} />

          <Bar dataKey="count" radius={[0, 10, 10, 0]} name="Eventos" barSize={26}>
            {sortedData.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={
                  TOP_ROUTES_CHART_COLORS[index % TOP_ROUTES_CHART_COLORS.length]
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
