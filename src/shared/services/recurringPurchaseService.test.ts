import { describe, expect, it, vi } from "vitest";
import { CurrencyTypes } from "@/features/purchases/types/purchaseEnums";
import { registerRecurringPurchasePayment } from "./recurringPurchaseService";

const postMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/common/utils/axios", () => ({
  default: {
    post: postMock,
  },
}));

describe("recurringPurchaseService", () => {
  it("registers a recurring purchase payment", async () => {
    postMock.mockResolvedValueOnce({
      data: {
        type: "success",
        paymentId: "payment-1",
        purchaseId: "purchase-1",
        accountPayableId: "payable-1",
      },
    });

    const result = await registerRecurringPurchasePayment("rec-1", {
      method: "Transferencia",
      date: "2026-07-10",
      currency: CurrencyTypes.PEN,
      amount: 120,
      paymentEvidenceFileId: "file-1",
    });

    expect(postMock).toHaveBeenCalledWith("/recurring-purchases/rec-1/register-payment", {
      method: "Transferencia",
      date: "2026-07-10",
      currency: CurrencyTypes.PEN,
      amount: 120,
      paymentEvidenceFileId: "file-1",
    });
    expect(result.paymentId).toBe("payment-1");
  });
});
