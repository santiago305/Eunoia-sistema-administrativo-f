import type { PurchaseOrderDetailOutput } from "@/features/purchases/types/itemPurchaseEdit";

type Props = {
  detail: PurchaseOrderDetailOutput;
};

const money = (value?: number | null, currency = "PEN") =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency }).format(Number(value ?? 0));

const Field = ({ label, value }: { label: string; value?: string | number | null }) => (
  <div className="rounded-sm border border-black/10 bg-white px-3 py-2">
    <dt className="text-[11px] font-medium uppercase text-black/45">{label}</dt>
    <dd className="mt-1 text-sm font-medium text-black">{value || "-"}</dd>
  </div>
);

export function PurchaseSummaryTab({ detail }: Props) {
  const code = [detail.serie, detail.correlative].filter(Boolean).join("-") || detail.poId || "-";

  return (
    <section className="space-y-4">
      <dl className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Documento" value={`${detail.documentType} ${code}`} />
        <Field label="Estado" value={detail.status} />
        <Field label="Pago" value={detail.paymentStatus ?? detail.paymentForm} />
        <Field label="Recepción" value={detail.receptionStatus ?? "Pendiente"} />
        <Field label="Emisión" value={detail.dateIssue ? new Date(detail.dateIssue).toLocaleDateString() : null} />
        <Field label="Vencimiento" value={detail.dateExpiration ? new Date(detail.dateExpiration).toLocaleDateString() : null} />
        <Field label="Moneda" value={detail.currency} />
        <Field label="Tipo" value={detail.purchaseType ?? "Compra"} />
      </dl>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-sm border border-black/10 bg-black/[0.02] p-3">
          <p className="text-[11px] font-medium uppercase text-black/45">Valor compra</p>
          <p className="mt-1 text-lg font-semibold text-black">{money(detail.purchaseValue, detail.currency)}</p>
        </div>
        <div className="rounded-sm border border-black/10 bg-black/[0.02] p-3">
          <p className="text-[11px] font-medium uppercase text-black/45">IGV</p>
          <p className="mt-1 text-lg font-semibold text-black">{money(detail.totalIgv, detail.currency)}</p>
        </div>
        <div className="rounded-sm border border-black/10 bg-black/[0.02] p-3">
          <p className="text-[11px] font-medium uppercase text-black/45">Total</p>
          <p className="mt-1 text-lg font-semibold text-black">{money(detail.total, detail.currency)}</p>
        </div>
        <div className="rounded-sm border border-black/10 bg-black/[0.02] p-3">
          <p className="text-[11px] font-medium uppercase text-black/45">Saldo</p>
          <p className="mt-1 text-lg font-semibold text-black">{money(detail.totalToPay ?? detail.total, detail.currency)}</p>
        </div>
      </div>

      {detail.note ? (
        <div className="rounded-sm border border-black/10 bg-white p-3">
          <p className="text-[11px] font-medium uppercase text-black/45">Nota</p>
          <p className="mt-1 text-sm text-black/70">{detail.note}</p>
        </div>
      ) : null}
    </section>
  );
}
