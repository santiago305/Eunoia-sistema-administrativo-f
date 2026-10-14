import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Modal } from "@/shared/components/modales/Modal";
import { parseApiError } from "@/shared/common/utils/handleApiError";
import { useCompany } from "@/shared/hooks/useCompany";
import { listCompanyPaymentAccountsByCompany } from "@/shared/services/companyPaymentAccountService";
import { getCompanyPaymentAccountDisplay } from "@/features/payments/paymentAccountView";
import type { CompanyPaymentAccount } from "@/features/payments/types/payment-account.types";
import { getBankReconciliationReport, type BankReconciliationReport } from "@/shared/services/incomeService";

type Props = { open: boolean; onClose: () => void };
const dateDefaults = () => {
  const now = new Date();
  const to = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  return { from: `${to.slice(0, 7)}-01`, to };
};
const money = (value: string | number, currency: string) => new Intl.NumberFormat("es-PE", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value));
const statusLabel = { UNRECONCILED: "Sin conciliar", PARTIALLY_RECONCILED: "Parcial", RECONCILED: "Conciliado" };

export function BankReconciliationReportModal({ open, onClose }: Props) {
  const { company } = useCompany();
  const [dates, setDates] = useState(dateDefaults);
  const [accountId, setAccountId] = useState("");
  const [accounts, setAccounts] = useState<CompanyPaymentAccount[]>([]);
  const [report, setReport] = useState<BankReconciliationReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !company?.companyId) return;
    let active = true;
    void listCompanyPaymentAccountsByCompany(company.companyId).then((rows) => { if (active) setAccounts(rows); }).catch(() => { if (active) setAccounts([]); });
    return () => { active = false; };
  }, [company?.companyId, open]);

  const load = async () => {
    if (!dates.from || !dates.to || dates.from > dates.to) { setError("El periodo de fechas no es válido."); return; }
    setLoading(true); setError("");
    try { setReport(await getBankReconciliationReport({ ...dates, companyPaymentAccountId: accountId || undefined })); }
    catch (cause) { setError(parseApiError(cause, "No se pudo cargar el informe de conciliación.")); }
    finally { setLoading(false); }
  };

  return <Modal open={open} onClose={loading ? () => undefined : onClose} title="Informe de conciliación bancaria" className="max-w-6xl" containerClassName="max-h-[92vh] overflow-y-auto">
    <div className="space-y-4">
      <p className="text-sm text-zinc-700">Compara los movimientos bancarios con los ingresos contabilizados. Los totales se separan por moneda.</p>
      <div className="grid gap-3 sm:grid-cols-4">
        <label className="text-sm font-medium">Desde<input aria-label="Desde" type="date" value={dates.from} onChange={(event) => setDates((current) => ({ ...current, from: event.target.value }))} className="mt-1 min-h-11 w-full rounded-lg border px-3" /></label>
        <label className="text-sm font-medium">Hasta<input aria-label="Hasta" type="date" value={dates.to} onChange={(event) => setDates((current) => ({ ...current, to: event.target.value }))} className="mt-1 min-h-11 w-full rounded-lg border px-3" /></label>
        <label className="text-sm font-medium sm:col-span-2">Cuenta receptora<select aria-label="Cuenta receptora" value={accountId} onChange={(event) => setAccountId(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border bg-white px-3"><option value="">Todas las cuentas</option>{accounts.map((account) => <option key={account.id} value={account.id}>{getCompanyPaymentAccountDisplay(account)}</option>)}</select></label>
      </div>
      <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-sky-800 px-4 font-semibold text-white disabled:opacity-50">{loading && <LoaderCircle className="h-4 w-4 animate-spin" />}{loading ? "Consultando…" : "Generar informe"}</button>
      {error && <p role="alert" className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-900">{error}</p>}
      {report && <>
        {report.truncated && <p role="status" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">Se muestran las primeras 2,000 líneas. Acota el periodo para ver el informe completo.</p>}
        <div className="grid gap-2 sm:grid-cols-2">{Object.entries(report.totalsByCurrency).map(([currency, total]) => <section key={currency} className="rounded-lg border p-3 text-sm"><h3 className="font-semibold">Totales {currency} · {total.lineCount} movimientos</h3><p>Extracto: {money(total.statementAmount, currency)} · Conciliado: {money(total.reconciledAmount, currency)} · Disponible: {money(total.availableAmount, currency)}</p></section>)}</div>
        <div className="max-h-[45vh] overflow-auto rounded-lg border"><table className="w-full min-w-[850px] text-left text-sm"><thead className="sticky top-0 bg-zinc-100"><tr>{["Fecha", "Cuenta", "Referencia", "Moneda", "Extracto", "Conciliado", "Disponible", "Estado"].map((label) => <th key={label} className="px-3 py-2">{label}</th>)}</tr></thead><tbody>{report.items.map((line) => <tr key={line.id} className="border-t"><td className="px-3 py-2">{line.operationDate}</td><td className="px-3 py-2">{line.accountName}</td><td className="px-3 py-2">{line.bankReference}</td><td className="px-3 py-2">{line.currency}</td><td className="px-3 py-2">{money(line.amount, line.currency)}</td><td className="px-3 py-2">{money(line.reconciledAmount, line.currency)}</td><td className="px-3 py-2">{money(line.availableAmount, line.currency)}</td><td className="px-3 py-2">{statusLabel[line.status]}</td></tr>)}</tbody></table>{report.items.length === 0 && <p className="p-4 text-sm text-zinc-600">No hay movimientos bancarios en este periodo.</p>}</div>
      </>}
    </div>
  </Modal>;
}
