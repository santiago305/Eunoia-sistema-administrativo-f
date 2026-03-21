import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { SecurityActivitySeriesItem } from "../../types/security.api";
import { ChartTooltip } from "./ChartTooltip";

export function ActivitySeriesChart({
  data,
}: {
  data: SecurityActivitySeriesItem[];
}) {
  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="violationsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.22} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="label" tick={{ fill: "#71717a", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#71717a", fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip content={<ChartTooltip />} />
          <Area
            type="monotone"
            dataKey="violations"
            stroke="hsl(var(--primary))"
            strokeWidth={3}
            fill="url(#violationsFill)"
            name="Violaciones"
          />
          <Area type="monotone" dataKey="bans" stroke="#0f172a" strokeWidth={2} fill="transparent" name="Bans" />
          <Area
            type="monotone"
            dataKey="uniqueIps"
            stroke="#f59e0b"
            strokeWidth={2}
            fill="transparent"
            name="IPs unicas"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
