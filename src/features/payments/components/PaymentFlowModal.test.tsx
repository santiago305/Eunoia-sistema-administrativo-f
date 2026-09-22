import { describe, expect, it, vi } from "vitest";
import { PaymentFlowModal } from "./PaymentFlowModal";

vi.mock("./PaymentFormModal", () => ({
  PaymentFormModal: (props: any) => <div data-testid="payment-form-adapter" data-mode={props.mode} data-po-id={props.initialPayment.poId} />,
}));

describe("PaymentFlowModal", () => {
  it("translates business context into the canonical payment form", async () => {
    const { render, screen } = await import("@testing-library/react");
    render(<PaymentFlowModal open context={{ source: "PURCHASE", mode: "IMMEDIATE", purchaseId: "po-1", currency: "PEN", suggestedAmount: 100 }} onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.getByTestId("payment-form-adapter")).toHaveAttribute("data-mode", "create");
    expect(screen.getByTestId("payment-form-adapter")).toHaveAttribute("data-po-id", "po-1");
  });
});
