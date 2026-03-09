import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { SecurityMethodDistributionItem } from "../../types/security.api";
import { ChartTooltip } from "./ChartTooltip";

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
          <XAxis dataKey="method" tick={{ fill: "#71717a", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#71717a", fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="count" radius={[10, 10, 0, 0]} fill="#21b8a6" name="Eventos" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
