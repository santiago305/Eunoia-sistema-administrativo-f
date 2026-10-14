import { beforeEach, describe, expect, it, vi } from "vitest";
import axiosInstance from "@/shared/common/utils/axios";
import {
  getSaleOrderEditorCatalogs,
  matchSaleOrderProductPack,
  previewCorrectSaleOrderTotal,
} from "./saleOrderService";

vi.mock("@/shared/common/utils/axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe("saleOrderService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads editor catalogs from one sale-orders endpoint", async () => {
    vi.mocked(axiosInstance.get).mockResolvedValueOnce({
      data: {
        clients: [],
        warehouses: [],
        subsidiaries: [],
        sources: [],
        workflows: [],
        advisers: [],
        paymentMethods: [],
        companyPaymentAccounts: [],
      },
    });

    await getSaleOrderEditorCatalogs("company-1");

    expect(axiosInstance.get).toHaveBeenCalledWith(
      "/sale-orders/editor-catalogs",
      { params: { companyId: "company-1" } },
    );
  });

  it("matches only the requested SKU composition", async () => {
    const components = [
      {
        skuId: "11111111-1111-4111-8111-111111111111",
        quantity: 1,
      },
      {
        skuId: "22222222-2222-4222-8222-222222222222",
        quantity: 2,
      },
    ];
    const match = {
      status: "UNIQUE" as const,
      composition: components,
      matches: [
        {
          id: "33333333-3333-4333-8333-333333333333",
          description: "Pack Exacto",
          total: 50,
        },
      ] as const,
      pack: {
        id: "33333333-3333-4333-8333-333333333333",
        description: "Pack Exacto",
        total: 50,
        components: [],
      },
    };
    vi.mocked(axiosInstance.post).mockResolvedValueOnce({ data: match });

    await expect(matchSaleOrderProductPack(components)).resolves.toEqual(match);
    expect(axiosInstance.post).toHaveBeenCalledWith(
      "/sale-orders/products/match-pack",
      { components },
    );
  });

  it("previews a corrected total through the read-only financial analysis endpoint", async () => {
    const preview = {
      saleOrderId: "order-1", currency: "USD" as const, currentTotal: 100, correctedTotal: 70,
      appliedAmount: 100, pendingAmount: 0, customerCreditCreated: 30,
      releasedByIncome: [{ paymentId: "payment-1", currency: "USD" as const, amount: 30 }],
      previewToken: "a".repeat(64),
    };
    vi.mocked(axiosInstance.post).mockResolvedValueOnce({ data: preview });

    await expect(previewCorrectSaleOrderTotal("order-1", 70)).resolves.toEqual(preview);
    expect(axiosInstance.post).toHaveBeenCalledWith("/sale-orders/order-1/correct-total/preview", { total: 70 });
  });
});
