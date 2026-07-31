import { describe, expect, it, vi } from "vitest";
import axiosInstance from "@/shared/common/utils/axios";
import { bulkSetSaleOrdersTracking, setSaleOrderTracking } from "./saleOrderService";

vi.mock("@/shared/common/utils/axios", () => ({ default: { patch: vi.fn() } }));

describe("sale order tracking service", () => {
  it("does not serialize unspecified flags", async () => {
    vi.mocked(axiosInstance.patch).mockResolvedValue({ data: { id: "1" } });
    await setSaleOrderTracking("1", { preguide: true });
    await bulkSetSaleOrdersTracking({ saleOrderIds: ["1"], prepared: false });
    expect(axiosInstance.patch).toHaveBeenNthCalledWith(1, "/sale-orders/1/tracking", { preguide: true });
    expect(axiosInstance.patch).toHaveBeenNthCalledWith(2, "/sale-orders/bulk/tracking", { saleOrderIds: ["1"], prepared: false });
  });
});
