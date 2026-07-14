import type { IncomeSummary } from "../types/income.types";

type Props = {
  summary: IncomeSummary | null;
};

const money = (value: number) =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(value || 0);

export function IncomeKpiStrip({ summary }: Props) {
  const kpis = [
    { label: "Ingresado", value: money(summary?.totalCollected ?? 0) },
    { label: "Pendiente de cobro", value: money(summary?.totalPending ?? 0) },
    { label: "Pedidos pagados", value: String(summary?.ordersPaid ?? 0) },
    { label: "Pedidos pendientes", value: String(summary?.ordersPending ?? 0) },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((kpi) => (
        <div key={kpi.label} className="rounded-md border border-black/10 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-normal text-black/50">{kpi.label}</p>
          <p className="mt-2 text-xl font-semibold tabular-nums text-black">{kpi.value}</p>
        </div>
      ))}
    </section>
  );
}
