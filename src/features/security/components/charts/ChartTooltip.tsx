export function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 shadow-lg">
      <p className="text-xs font-semibold text-zinc-900">{label}</p>
      <div className="mt-2 space-y-1">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between gap-4 text-xs">
            <span className="flex items-center gap-2 text-zinc-600">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.name}
            </span>
            <span className="font-semibold text-zinc-900">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
