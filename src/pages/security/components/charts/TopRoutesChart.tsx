import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { SecurityTopRouteItem } from "../../types/security.api";
import { ChartTooltip } from "./ChartTooltip";

export function TopRoutesChart({
  data,
}: {
  data: SecurityTopRouteItem[];
}) {
  return (
    <div className="h-[290px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis type="number" tick={{ fill: "#71717a", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis
            type="category"
            dataKey="path"
            tick={{ fill: "#71717a", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={130}
          />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="count" radius={[0, 10, 10, 0]} fill="#0f172a" name="Eventos" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
