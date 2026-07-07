import type { SaleOrderEditorForm } from "./saleOrderEditorForm";
import { calculateSaleOrderTotals } from "./saleOrderEditorForm";
import { SaleOrderEditorSection } from "./SaleOrderEditorSection";

type Props = {
  form: SaleOrderEditorForm;
};

const money = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
});

export function SaleOrderTotalsSection({ form }: Props) {
  const totals = calculateSaleOrderTotals(
    form.items,
    form.deliveryCost,
    form.discount,
  );

  return (
    <SaleOrderEditorSection title="Valor del pedido">
      <dl className="mt-3 space-y-1.5 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd className="tabular-nums">{money.format(totals.subTotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Tarifa</dt>
          <dd className="tabular-nums">{money.format(totals.deliveryCost)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Descuento</dt>
          <dd className="tabular-nums text-rose-600">
            -{money.format(totals.discount)}
          </dd>
        </div>
        <div className="flex justify-between rounded-lg bg-muted/60 px-2 py-2 text-base font-semibold">
          <dt>Total</dt>
          <dd className="tabular-nums">{money.format(totals.total)}</dd>
        </div>
      </dl>
    </SaleOrderEditorSection>
  );
}
