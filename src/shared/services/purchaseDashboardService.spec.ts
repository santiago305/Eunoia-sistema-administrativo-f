import { beforeEach, describe, expect, it, vi } from "vitest";
import axiosInstance from "@/shared/common/utils/axios";
import { getPurchaseDashboardData } from "./purchaseDashboardService";

vi.mock("@/shared/common/utils/axios", () => ({
  default: {
    get: vi.fn(),
  },
}));

describe("purchaseDashboardService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads every purchase dashboard endpoint with the same filters", async () => {
    vi.mocked(axiosInstance.get).mockResolvedValue({ data: [] });
    vi.mocked(axiosInstance.get).mockResolvedValueOnce({ data: { totalPurchased: 100 } });

    const params = {
      from: "2026-06-01",
      to: "2026-06-30",
      supplierId: "supplier-1",
      purchaseType: "SERVICE",
    };

    const data = await getPurchaseDashboardData(params);

    expect(axiosInstance.get).toHaveBeenCalledWith("/purchases/dashboard/summary", { params });
    expect(axiosInstance.get).toHaveBeenCalledWith("/purchases/dashboard/by-type", { params });
    expect(axiosInstance.get).toHaveBeenCalledWith("/purchases/dashboard/by-status", { params });
    expect(axiosInstance.get).toHaveBeenCalledWith("/purchases/dashboard/top-items", { params });
    expect(axiosInstance.get).toHaveBeenCalledWith("/purchases/dashboard/top-suppliers", { params });
    expect(axiosInstance.get).toHaveBeenCalledWith("/purchases/dashboard/monthly-spending", { params });
    expect(axiosInstance.get).toHaveBeenCalledWith("/purchases/dashboard/upcoming-payments", { params });
    expect(axiosInstance.get).toHaveBeenCalledWith("/purchases/dashboard/overdue-payments", { params });
    expect(axiosInstance.get).toHaveBeenCalledWith("/purchases/dashboard/payment-method-usage", { params });
    expect(axiosInstance.get).toHaveBeenCalledWith("/purchases/dashboard/internal-vs-inventory", { params });
    expect(data.summary.totalPurchased).toBe(100);
  });
});
