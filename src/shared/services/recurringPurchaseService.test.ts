import { describe, expect, it, vi } from "vitest";
import { CurrencyTypes } from "@/features/purchases/types/purchaseEnums";
import type { ListRecurringPurchasesQuery } from "@/features/purchases/types/recurring-purchase.types";
import { listRecurringPurchases, registerRecurringPurchasePayment } from "./recurringPurchaseService";

const { getMock, postMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
}));

vi.mock("@/shared/common/utils/axios", () => ({
  default: {
    get: getMock,
    post: postMock,
  },
}));

describe("recurringPurchaseService", () => {
  it("serializes smart filters when listing recurring purchases", async () => {
    getMock.mockResolvedValueOnce({
      data: {
        items: [],
        total: 0,
        page: 1,
        limit: 25,
      },
    });

    const query: ListRecurringPurchasesQuery = {
      page: 1,
      limit: 25,
      q: "hosting",
      filters: [
        {
          field: "status",
          operator: "in",
          values: ["ACTIVE"],
        },
      ],
    };

    await listRecurringPurchases(query);

    expect(getMock).toHaveBeenCalledWith("/recurring-purchases", {
      params: {
        page: 1,
        limit: 25,
        q: "hosting",
        filters: JSON.stringify([
          {
            field: "status",
            operator: "in",
            values: ["ACTIVE"],
          },
        ]),
      },
    });
  });

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
