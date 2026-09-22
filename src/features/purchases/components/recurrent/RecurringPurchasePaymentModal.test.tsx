import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CurrencyTypes } from "../../types/purchaseEnums";
import type { RecurringPurchase } from "../../types/recurring-purchase.types";
import { RecurringPurchasePaymentModal } from "./RecurringPurchasePaymentModal";

const generatePayableMock = vi.hoisted(() => vi.fn());
const paymentFlowModalMock = vi.hoisted(() => vi.fn((_props: unknown) => null));
const showFeedbackMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/services/recurringPurchaseService", () => ({ generateCurrentRecurringPayable: generatePayableMock }));
vi.mock("@/features/payments/components/PaymentFlowModal", () => ({
  PaymentFlowModal: (props: unknown) => {
    paymentFlowModalMock(props);
    return null;
  },
}));
vi.mock("@/shared/hooks/useFeedbackToast", () => ({ useFeedbackToast: () => ({ showFeedback: showFeedbackMock, clearFeedback: vi.fn() }) }));

const item: RecurringPurchase = {
  recurringPurchaseTemplateId: "rec-1",
  supplierId: "supplier-1",
  name: "Hosting mensual",
  frequency: "MONTHLY",
  purchaseType: "SUBSCRIPTION",
  currency: CurrencyTypes.PEN,
  amount: 120,
  startDate: "2026-06-10",
  nextDueDate: "2026-07-10",
  status: "ACTIVE",
  reminderDaysBefore: [7, 3, 1, 0],
};

describe("RecurringPurchasePaymentModal", () => {
  it("resolves the payable and delegates to the unified payment flow", async () => {
    generatePayableMock.mockResolvedValue({ purchaseId: "purchase-1", accountPayableId: "payable-1" });
    render(<RecurringPurchasePaymentModal open item={item} onClose={vi.fn()} onSaved={vi.fn()} />);
    await waitFor(() => expect(paymentFlowModalMock).toHaveBeenCalled());
    expect(generatePayableMock).toHaveBeenCalledWith("rec-1");
    expect(paymentFlowModalMock).toHaveBeenCalledWith(
      expect.objectContaining({ context: expect.objectContaining({ source: "RECURRING", mode: "IMMEDIATE", purchaseId: "purchase-1", accountPayableId: "payable-1", supplierId: "supplier-1", currency: CurrencyTypes.PEN, suggestedAmount: 120 }) }),
    );
  });

  it("does not render the flow when payable generation fails", async () => {
    generatePayableMock.mockRejectedValue(new Error("failed"));
    render(<RecurringPurchasePaymentModal open item={item} onClose={vi.fn()} onSaved={vi.fn()} />);
    await waitFor(() => expect(generatePayableMock).toHaveBeenCalled());
    expect(paymentFlowModalMock).not.toHaveBeenCalled();
  });
});
