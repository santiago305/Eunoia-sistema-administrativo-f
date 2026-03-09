import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer } from "recharts";

type RiskTone = "low" | "medium" | "high" | "critical";

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function getRiskTone(value: number): RiskTone {
  if (value >= 85) return "critical";
  if (value >= 70) return "high";
  if (value >= 40) return "medium";
  return "low";
}

function getRiskColor(value: number) {
  const tone = getRiskTone(value);

  switch (tone) {
    case "critical":
      return "#ef4444";
    case "high":
      return "#f59e0b";
    case "medium":
      return "#21b8a6";
    case "low":
    default:
      return "#22c55e";
  }
}

export function RiskScoreChart({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  const safeValue = clamp(value);
  const color = getRiskColor(safeValue);

  return (
    <div className="relative h-[260px] w-full max-w-[320px]">
      <div
        className="absolute inset-x-1/2 top-1/2 z-0 h-[132px] w-[132px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl opacity-20"
        style={{ backgroundColor: color }}
      />

      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          data={[{ name: "score", value: safeValue, fill: color }]}
          innerRadius="74%"
          outerRadius="92%"
          startAngle={90}
          endAngle={-270}
          barSize={16}
        >
          <PolarAngleAxis
            type="number"
            domain={[0, 100]}
            tick={false}
          />

          <RadialBar
            dataKey="value"
            background={{ fill: "#edf1f5" }}
            cornerRadius={999}
          />
        </RadialBarChart>
      </ResponsiveContainer>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <div className="flex h-[124px] w-[124px] flex-col items-center justify-center rounded-full border border-zinc-200/80 bg-white/90 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur-sm">
          <span className="text-[42px] font-semibold leading-none tracking-[-0.05em] text-zinc-950">
            {safeValue}
          </span>
          <span className="mt-1 text-sm font-medium text-zinc-500">
            {label}
          </span>
        </div>
      </div>
    </div>
  );
}