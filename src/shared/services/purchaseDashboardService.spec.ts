import { beforeEach, describe, expect, it, vi } from "vitest";
import axiosInstance from "@/shared/common/utils/axios";
import {
  deletePurchaseDashboardSearchMetric,
  getPurchaseDashboardData,
  getPurchaseDashboardSearchState,
  savePurchaseDashboardSearchMetric,
} from "./purchaseDashboardService";

vi.mock("@/shared/common/utils/axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("purchaseDashboardService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads only the default dashboard endpoints with the base permission", async () => {
    vi.mocked(axiosInstance.get).mockResolvedValue({ data: [] });
    vi.mocked(axiosInstance.get).mockResolvedValueOnce({ data: { totalPurchased: 100 } });

    const params = {
      from: "2026-06-01",
      to: "2026-06-30",
      supplierId: "supplier-1",
      purchaseType: "SERVICE",
    };

    const data = await getPurchaseDashboardData(params, ["purchases_dashboard.view"]);

    expect(axiosInstance.get).toHaveBeenCalledWith("/purchases/dashboard/summary", { params });
    expect(axiosInstance.get).toHaveBeenCalledWith("/purchases/dashboard/by-type", { params });
    expect(axiosInstance.get).toHaveBeenCalledWith("/purchases/dashboard/by-status", { params });
    expect(axiosInstance.get).toHaveBeenCalledTimes(3);
    expect(data.summary.totalPurchased).toBe(100);
    expect(data.monthlySpending).toBeUndefined();
  });

  it("loads purchase dashboard groups allowed by permissions", async () => {
    vi.mocked(axiosInstance.get).mockResolvedValue({ data: [] });

    const params = { from: "2026-06-01", limit: 10 };
    await getPurchaseDashboardData(params, [
      "purchases_dashboard.view",
      "purchases_dashboard.view_costs",
      "purchases_dashboard.view_payments",
      "purchases_dashboard.view_suppliers",
      "purchases_dashboard.view_items",
      "purchases_dashboard.view_operations",
    ]);

    expect(axiosInstance.get).toHaveBeenCalledWith("/purchases/dashboard/summary", { params });
    expect(axiosInstance.get).toHaveBeenCalledWith("/purchases/dashboard/by-type", { params });
    expect(axiosInstance.get).toHaveBeenCalledWith("/purchases/dashboard/by-status", { params });
    expect(axiosInstance.get).toHaveBeenCalledWith("/purchases/dashboard/monthly-spending", { params });
    expect(axiosInstance.get).toHaveBeenCalledWith("/purchases/dashboard/upcoming-payments", { params });
    expect(axiosInstance.get).toHaveBeenCalledWith("/purchases/dashboard/overdue-payments", { params });
    expect(axiosInstance.get).toHaveBeenCalledWith("/purchases/dashboard/payment-method-usage", { params });
    expect(axiosInstance.get).toHaveBeenCalledWith("/purchases/dashboard/top-suppliers", { params });
    expect(axiosInstance.get).toHaveBeenCalledWith("/purchases/dashboard/top-items", { params });
    expect(axiosInstance.get).toHaveBeenCalledWith("/purchases/dashboard/internal-vs-inventory", { params });
    expect(axiosInstance.get).toHaveBeenCalledTimes(10);
  });

  it("loads payment endpoints only with the payments dashboard permission", async () => {
    vi.mocked(axiosInstance.get).mockResolvedValue({ data: [] });

    await getPurchaseDashboardData({}, ["purchases_dashboard.view"]);

    expect(calledUrls()).not.toContain("/purchases/dashboard/upcoming-payments");
    expect(calledUrls()).not.toContain("/purchases/dashboard/overdue-payments");
    expect(calledUrls()).not.toContain("/purchases/dashboard/payment-method-usage");

    vi.clearAllMocks();
    vi.mocked(axiosInstance.get).mockResolvedValue({ data: [] });

    await getPurchaseDashboardData({}, ["purchases_dashboard.view", "purchases_dashboard.view_payments"]);

    expect(calledUrls()).toContain("/purchases/dashboard/upcoming-payments");
    expect(calledUrls()).toContain("/purchases/dashboard/overdue-payments");
    expect(calledUrls()).toContain("/purchases/dashboard/payment-method-usage");
  });

  it("loads top suppliers only with the suppliers dashboard permission", async () => {
    vi.mocked(axiosInstance.get).mockResolvedValue({ data: [] });

    await getPurchaseDashboardData({}, ["purchases_dashboard.view"]);

    expect(calledUrls()).not.toContain("/purchases/dashboard/top-suppliers");

    vi.clearAllMocks();
    vi.mocked(axiosInstance.get).mockResolvedValue({ data: [] });

    await getPurchaseDashboardData({}, ["purchases_dashboard.view", "purchases_dashboard.view_suppliers"]);

    expect(calledUrls()).toContain("/purchases/dashboard/top-suppliers");
  });

  it("loads top items only with the items dashboard permission", async () => {
    vi.mocked(axiosInstance.get).mockResolvedValue({ data: [] });

    await getPurchaseDashboardData({}, ["purchases_dashboard.view"]);

    expect(calledUrls()).not.toContain("/purchases/dashboard/top-items");

    vi.clearAllMocks();
    vi.mocked(axiosInstance.get).mockResolvedValue({ data: [] });

    await getPurchaseDashboardData({}, ["purchases_dashboard.view", "purchases_dashboard.view_items"]);

    expect(calledUrls()).toContain("/purchases/dashboard/top-items");
  });

  it("loads dashboard saved filter state from the dashboard endpoint", async () => {
    vi.mocked(axiosInstance.get).mockResolvedValueOnce({
      data: {
        recent: [],
        saved: [
          {
            metricId: "metric-1",
            name: "Con fechas",
            snapshot: {
              filters: [{ field: "supplierId", operator: "in", values: ["supplier-1"] }],
              dateRange: { mode: "absolute", from: "2026-07-01", to: "2026-07-09" },
            },
            updatedAt: "2026-07-09T10:00:00.000Z",
          },
        ],
      },
    });

    const response = await getPurchaseDashboardSearchState();

    expect(axiosInstance.get).toHaveBeenCalledWith("/purchases/dashboard/search-state");
    expect(response.saved[0].snapshot.dateRange).toEqual({
      mode: "absolute",
      from: "2026-07-01",
      to: "2026-07-09",
    });
  });

  it("saves dashboard search metrics with name and snapshot", async () => {
    vi.mocked(axiosInstance.post).mockResolvedValueOnce({
      data: { type: "success", message: "Metrica guardada correctamente" },
    });
    const snapshot = {
      filters: [{ field: "paymentStatus" as const, operator: "in" as const, values: ["PAID"] }],
      dateRange: { mode: "absolute" as const, from: "2026-07-01" },
    };

    const response = await savePurchaseDashboardSearchMetric("Pagadas julio", snapshot);

    expect(axiosInstance.post).toHaveBeenCalledWith("/purchases/dashboard/search-metrics", {
      name: "Pagadas julio",
      snapshot,
    });
    expect(response.type).toBe("success");
  });

  it("deletes dashboard search metrics by metric id", async () => {
    vi.mocked(axiosInstance.delete).mockResolvedValueOnce({
      data: { type: "success", message: "Metrica eliminada correctamente" },
    });

    const response = await deletePurchaseDashboardSearchMetric("metric-1");

    expect(axiosInstance.delete).toHaveBeenCalledWith("/purchases/dashboard/search-metrics/metric-1");
    expect(response.type).toBe("success");
  });
});

function calledUrls() {
  return vi.mocked(axiosInstance.get).mock.calls.map(([url]) => url);
}
