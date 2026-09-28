import { useEffect, useState } from "react";
import { PageShell } from "@/shared/layouts/PageShell";
import { listIncome, getIncomeSummary } from "@/shared/services/incomeService";
import type { Income, IncomeListQuery, IncomeSummary } from "./types/income.types";
import { IncomeKpiStrip } from "./components/IncomeKpiStrip";
import { IncomeTable } from "./components/IncomeTable";

const DEFAULT_INCOME_QUERY = { limit: 50 } satisfies IncomeListQuery;

export default function IncomePage() {
  const [rows, setRows] = useState<Income[]>([]);
  const [summary, setSummary] = useState<IncomeSummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([listIncome(DEFAULT_INCOME_QUERY), getIncomeSummary(DEFAULT_INCOME_QUERY)])
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
  }, []);

  return (
    <PageShell className="bg-white" scrollArea>
      <IncomeKpiStrip summary={summary} />
      <IncomeTable rows={rows} loading={loading} />
    </PageShell>
  );
}
