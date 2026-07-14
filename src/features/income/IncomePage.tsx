import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { PageShell } from "@/shared/layouts/PageShell";
import { listIncome, getIncomeSummary } from "@/shared/services/incomeService";
import type { Income, IncomeListQuery, IncomeSummary } from "./types/income.types";
import { IncomeKpiStrip } from "./components/IncomeKpiStrip";
import { IncomeTable } from "./components/IncomeTable";

export default function IncomePage() {
  const [rows, setRows] = useState<Income[]>([]);
  const [summary, setSummary] = useState<IncomeSummary | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const filters = useMemo<IncomeListQuery>(() => ({ q: query.trim() || undefined, limit: 50 }), [query]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([listIncome(filters), getIncomeSummary(filters)])
      .then(([incomeResponse, summaryResponse]) => {
        if (!mounted) return;
        setRows(incomeResponse.items);
        setSummary(summaryResponse);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [filters]);

  return (
    <PageShell className="bg-white" scrollArea>
      <div className="space-y-4 p-4 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-black">Ingresos</h1>
            <p className="mt-1 text-sm text-black/60">Cobros recibidos desde pedidos y pendientes de cobro.</p>
          </div>
          <label className="relative block w-full md:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-black/40" />
            <input
              className="h-10 w-full rounded-md border border-black/15 bg-white pl-9 pr-3 text-sm outline-none ring-teal-600/20 transition focus:border-teal-600 focus:ring-4"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar cliente, metodo u operacion"
            />
          </label>
        </div>

        <IncomeKpiStrip summary={summary} />
        <section className="rounded-md border border-black/10 bg-white p-3">
          <IncomeTable rows={rows} loading={loading} />
        </section>
      </div>
    </PageShell>
  );
}
