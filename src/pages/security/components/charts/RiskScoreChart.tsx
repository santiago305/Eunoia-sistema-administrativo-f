import {
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
} from "recharts";

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
      return "hsl(var(--primary))";
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
    <div className="relative h-[150px] w-full max-w-[200px]">
      {/* Glow */}
      <div
        className="absolute inset-0 z-0 m-auto h-[90px] w-[90px] rounded-full blur-xl opacity-20"
        style={{ backgroundColor: color }}
      />

      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          data={[
            { name: "full", value: 100, fill: "#edf1f5" }, // fondo completo
            { name: "score", value: safeValue, fill: color }, // progreso
          ]}
          innerRadius="65%"
          outerRadius="90%"
          startAngle={90}
          endAngle={-270}
          barSize={10}
        >
          <PolarAngleAxis
            type="number"
            domain={[0, 100]}
            tick={false}
          />

          {/* Fondo */}
          <RadialBar
            dataKey="value"
            cornerRadius={999}
            data={[{ value: 100, fill: "#edf1f5" }]}
            isAnimationActive={false}
          />

          {/* Progreso */}
          <RadialBar
            dataKey="value"
            cornerRadius={999}
            data={[{ value: safeValue, fill: color }]}
          />
        </RadialBarChart>
      </ResponsiveContainer>

      {/* Centro */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="flex h-[80px] w-[80px] flex-col items-center justify-center rounded-full border border-zinc-200 bg-white shadow-sm">
          <span className="text-xl font-semibold text-zinc-900">
            {safeValue}
          </span>
          <span className="text-[10px] text-zinc-500">{label}</span>
        </div>
      </div>
    </div>
  );
}