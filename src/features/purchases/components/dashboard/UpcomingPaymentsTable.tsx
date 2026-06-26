import type { PurchaseDashboardPaymentRow } from "@/features/purchases/types/purchase-dashboard.types";
import { money } from "@/shared/utils/functionPurchases";

type Props = {
  title: string;
  rows: PurchaseDashboardPaymentRow[];
};

export function UpcomingPaymentsTable({ title, rows }: Props) {
  return (
    <section className="rounded-md border border-black/10 bg-white p-4">
      <h2 className="text-sm font-semibold text-black">{title}</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="min-w-full text-left text-xs">
          <thead className="border-b border-black/10 text-black/55">
            <tr>
              <th className="py-2 pr-3 font-medium">Proveedor</th>
              <th className="py-2 pr-3 font-medium">Vence</th>
              <th className="py-2 pr-3 font-medium">Estado</th>
              <th className="py-2 text-right font-medium">Pendiente</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {rows.map((row) => (
              <tr key={row.accountPayableId}>
                <td className="py-2 pr-3 text-black">{row.supplierName ?? "Proveedor sin nombre"}</td>
                <td className="py-2 pr-3 tabular-nums text-black/70">{row.dueDate ?? "Sin fecha"}</td>
                <td className="py-2 pr-3 text-black/70">{row.status}</td>
                <td className="py-2 text-right font-medium tabular-nums text-black">{money(row.amountPending, row.currency === "USD" ? "USD" : "PEN")}</td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={4} className="py-6 text-center text-black/45">Sin cuentas para mostrar.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

