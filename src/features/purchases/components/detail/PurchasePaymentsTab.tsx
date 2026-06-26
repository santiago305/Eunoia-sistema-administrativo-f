import type { Payment } from "@/features/purchases/types/purchase";

type Props = {
  payments: Payment[];
  loading?: boolean;
};

export function PurchasePaymentsTab({ payments, loading = false }: Props) {
  return (
    <section className="overflow-hidden rounded-sm border border-black/10 bg-white">
      <div className="grid grid-cols-[120px_1fr_120px_120px] gap-3 border-b border-black/10 bg-black/[0.03] px-3 py-2 text-[11px] font-semibold uppercase text-black/55">
        <span>Fecha</span>
        <span>Método</span>
        <span>Estado</span>
        <span className="text-right">Monto</span>
      </div>
      {loading ? (
        <div className="px-3 py-6 text-sm text-black/50">Cargando pagos...</div>
      ) : payments.length ? payments.map((payment, index) => (
        <div key={payment.payDocId ?? index} className="grid grid-cols-[120px_1fr_120px_120px] gap-3 border-b border-black/5 px-3 py-2 text-sm last:border-b-0">
          <span className="text-black/65">{payment.date ? new Date(payment.date).toLocaleDateString() : "-"}</span>
          <div className="min-w-0">
            <p className="truncate font-medium text-black">{payment.method || payment.paymentMethodId || "Pago"}</p>
            <p className="truncate text-xs text-black/50">{payment.operationNumber || payment.operationCode || "Sin operación"}</p>
          </div>
          <span className="text-black/65">{payment.status ?? "-"}</span>
          <span className="text-right tabular-nums font-medium text-black">{Number(payment.amount ?? 0).toFixed(2)}</span>
        </div>
      )) : (
        <div className="px-3 py-6 text-sm text-black/50">Sin pagos registrados.</div>
      )}
    </section>
  );
}
