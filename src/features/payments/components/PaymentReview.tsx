import type { PaymentContract } from "../types/payment-contract.types";

type Props = {
  payment: PaymentContract;
  methodLabel: string;
  accountLabel?: string | null;
  destinationLabel?: string | null;
  evidenceName?: string | null;
};

export function PaymentReview({ payment, methodLabel, accountLabel, destinationLabel, evidenceName }: Props) {
  return (
    <section aria-labelledby="payment-review-title" className="rounded-lg border border-border bg-muted/20 p-3">
      <h2 id="payment-review-title" className="text-sm font-semibold text-foreground">Revisión del pago</h2>
      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
        <div><dt className="text-xs text-muted-foreground">Monto</dt><dd className="font-semibold">{payment.currency} {payment.amount.toFixed(2)}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Método</dt><dd>{methodLabel}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Cuenta de origen</dt><dd>{accountLabel || "No seleccionada"}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Destino del proveedor</dt><dd>{destinationLabel || "No aplica"}</dd></div>
        <div className="sm:col-span-2"><dt className="text-xs text-muted-foreground">Evidencia</dt><dd>{evidenceName || "No adjunta"}</dd></div>
      </dl>
    </section>
  );
}
