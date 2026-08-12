import { beforeEach, describe, expect, it, vi } from "vitest";
import axiosInstance from "@/shared/common/utils/axios";
import {
  getSaleOrderEditorCatalogs,
  matchSaleOrderProductPack,
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
});
