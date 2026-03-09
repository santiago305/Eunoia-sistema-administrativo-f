import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import type { SecurityReasonDistributionItem } from "../../types/security.api";
import { CHART_COLORS } from "../security.utils";
import { ChartTooltip } from "./ChartTooltip";

export function ReasonDistributionChart({
  data,
}: {
  data: SecurityReasonDistributionItem[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_.9fr]">
      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={70}
              outerRadius={105}
              paddingAngle={3}
            >
              {data.map((_, index) => (
                <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-3">
        {data.map((item, index) => (
          <div
            key={item.key}
            className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
              />
              <span className="text-sm font-medium text-zinc-700">{item.label}</span>
            </div>
            <span className="text-sm font-semibold text-zinc-950">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
