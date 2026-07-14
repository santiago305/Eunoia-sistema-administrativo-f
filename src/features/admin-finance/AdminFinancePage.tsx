import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { PageShell } from "@/shared/layouts/PageShell";
import {
  getAdminFinanceSummary,
  listAdminFinanceMovements,
} from "@/shared/services/adminFinanceService";
import type {
  AdminFinanceMovement,
  AdminFinanceQuery,
  AdminFinanceSummary,
} from "./types/adminFinance.types";

const money = (value: number, currency = "PEN") =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency }).format(value);

const emptySummary: AdminFinanceSummary = {
  income: { collected: 0, pending: 0 },
  expenses: { paid: 0, pending: 0, overdue: 0, scheduled: 0 },
  net: { collectedMinusPaid: 0, projectedAfterPending: 0 },
};

export default function AdminFinancePage() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<AdminFinanceQuery["type"]>();
  const [summary, setSummary] = useState<AdminFinanceSummary>(emptySummary);
  const [movements, setMovements] = useState<AdminFinanceMovement[]>([]);
  const [loading, setLoading] = useState(false);

  const filters = useMemo<AdminFinanceQuery>(
    () => ({ q: query.trim() || undefined, type, limit: 50 }),
    [query, type],
  );

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([
      getAdminFinanceSummary(filters),
      listAdminFinanceMovements(filters),
    ])
      .then(([nextSummary, nextMovements]) => {
        if (!mounted) return;
        setSummary(nextSummary);
        setMovements(nextMovements.items);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [filters]);

  const cards = [
    { label: "Ingresos cobrados", value: money(summary.income.collected) },
    { label: "Por cobrar", value: money(summary.income.pending) },
    { label: "Egresos pagados", value: money(summary.expenses.paid) },
    { label: "Por pagar", value: money(summary.expenses.pending) },
    { label: "Vencido", value: money(summary.expenses.overdue) },
    { label: "Programado", value: money(summary.expenses.scheduled) },
    { label: "Neto cobrado", value: money(summary.net.collectedMinusPaid) },
    { label: "Proyectado", value: money(summary.net.projectedAfterPending) },
  ];

  return (
    <PageShell className="bg-white" scrollArea>
      <div className="space-y-4 p-4 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-black">Dashboard administrativo</h1>
            <p className="mt-1 text-sm text-black/60">Ingresos, egresos y pendientes consolidados.</p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row md:max-w-xl">
            <label className="relative block flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-black/40" />
              <input
                className="h-10 w-full rounded-md border border-black/15 bg-white pl-9 pr-3 text-sm outline-none ring-teal-600/20 transition focus:border-teal-600 focus:ring-4"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar movimiento"
              />
            </label>
            <select
              className="h-10 rounded-md border border-black/15 bg-white px-3 text-sm"
              value={type ?? ""}
              onChange={(event) =>
                setType((event.target.value || undefined) as AdminFinanceQuery["type"])
              }
            >
              <option value="">Todos</option>
              <option value="INCOME">Ingresos</option>
              <option value="EXPENSE">Egresos</option>
            </select>
          </div>
        </div>

        <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <div key={card.label} className="rounded-md border border-black/10 bg-white p-3">
              <div className="text-xs font-medium text-black/55">{card.label}</div>
              <div className="mt-1 text-lg font-semibold tabular-nums text-black">{card.value}</div>
            </div>
          ))}
        </section>

        <section className="overflow-hidden rounded-md border border-black/10 bg-white">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-black/[0.03] text-xs uppercase text-black/55">
              <tr>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Origen</th>
                <th className="px-3 py-2">Descripcion</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2 text-right">Monto</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((movement) => (
                <tr key={`${movement.type}-${movement.sourceId}-${movement.date}`} className="border-t border-black/10">
                  <td className="px-3 py-2">{movement.type === "INCOME" ? "Ingreso" : "Egreso"}</td>
                  <td className="px-3 py-2">{movement.source}</td>
                  <td className="px-3 py-2">{movement.description}</td>
                  <td className="px-3 py-2">{movement.status}</td>
                  <td className="px-3 py-2">{movement.date?.slice(0, 10)}</td>
                  <td className="px-3 py-2 text-right font-medium tabular-nums">{money(movement.amount, movement.currency)}</td>
                </tr>
              ))}
              {!movements.length ? (
                <tr>
                  <td className="px-3 py-8 text-center text-sm text-black/50" colSpan={6}>
                    {loading ? "Cargando movimientos..." : "Sin movimientos."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>
      </div>
    </PageShell>
  );
}
