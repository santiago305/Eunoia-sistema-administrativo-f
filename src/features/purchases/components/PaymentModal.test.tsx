import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PaymentModal } from "./PaymentModal";

const paymentFlowModalMock = vi.hoisted(() => vi.fn((_props: unknown) => null));

vi.mock("@/features/payments/components/PaymentFlowModal", () => ({
  PaymentFlowModal: (props: unknown) => {
    paymentFlowModalMock(props);
    return null;
  },
}));

describe("PaymentModal compatibility adapter", () => {
  it("delegates purchase payments to the unified flow", () => {
    render(<PaymentModal title="Formulario de Pago" close={vi.fn()} open poId="purchase-1" totalToPay={100} />);
    expect(paymentFlowModalMock).toHaveBeenCalledWith(
      expect.objectContaining({
        open: true,
        context: expect.objectContaining({ source: "PURCHASE", mode: "IMMEDIATE", purchaseId: "purchase-1", suggestedAmount: 100 }),
      }),
    );
  });

  it("uses quota context and forwards lifecycle callbacks", async () => {
    const close = vi.fn();
    const onSaved = vi.fn();
    const loadPurchases = vi.fn();
    const loadQuotas = vi.fn();
    render(
      <PaymentModal title="Cuota" close={close} open poId="purchase-1" quotaId="quota-1" supplierId="supplier-1" totalToPay={50} loadPurchases={loadPurchases} loadQuotas={loadQuotas} onSaved={onSaved} />,
    );
    const props = paymentFlowModalMock.mock.calls.at(-1)?.[0] as unknown as { context: Record<string, unknown>; onClose: () => void; onSaved: () => Promise<void> };
    expect(props.context).toEqual(expect.objectContaining({ source: "QUOTA", quotaId: "quota-1", supplierId: "supplier-1" }));
    props.onClose();
    expect(close).toHaveBeenCalled();
    await props.onSaved();
    expect(loadPurchases).toHaveBeenCalled();
    expect(loadQuotas).toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalled();
  });
});
