import { RadialBar, RadialBarChart, ResponsiveContainer } from "recharts";

export function RiskScoreChart({ value }: { value: number }) {
  return (
    <div className="h-[240px] w-full max-w-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          innerRadius="72%"
          outerRadius="100%"
          data={[{ name: "Riesgo", value }]}
          startAngle={90}
          endAngle={-270}
          barSize={18}
        >
          <RadialBar background={{ fill: "#eef2f7" }} dataKey="value" cornerRadius={18} fill="#21b8a6" />
        </RadialBarChart>
      </ResponsiveContainer>
    </div>
  );
}
