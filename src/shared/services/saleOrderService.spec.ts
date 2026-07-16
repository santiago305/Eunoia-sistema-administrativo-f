import { beforeEach, describe, expect, it, vi } from "vitest";
import axiosInstance from "@/shared/common/utils/axios";
import { getSaleOrderEditorCatalogs } from "./saleOrderService";

vi.mock("@/shared/common/utils/axios", () => ({
  default: {
    get: vi.fn(),
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
});
