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

import type { SecurityMethodDistributionItem } from "../../types/security.api";
import { ChartTooltip } from "./ChartTooltip";

const METHOD_CHART_COLORS = [
  "#06b6d4", // cyan
  "#3b82f6", // azul
  "#22c55e", // verde
  "#f97316", // naranja
  "#ef4444", // rojo
  "#8b5cf6", // violeta
];

export function MethodDistributionChart({
  data,
}: {
  data: SecurityMethodDistributionItem[];
}) {
  return (
    <div className="h-[290px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

          <XAxis
            dataKey="method"
            tick={{ fill: "#71717a", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />

          <YAxis
            tick={{ fill: "#71717a", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />

          <Tooltip content={<ChartTooltip />} />

          <Bar dataKey="count" radius={[10, 10, 0, 0]} name="Eventos">
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={METHOD_CHART_COLORS[index % METHOD_CHART_COLORS.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
