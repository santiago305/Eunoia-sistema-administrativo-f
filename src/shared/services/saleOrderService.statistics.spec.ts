import { beforeEach, describe, expect, it, vi } from "vitest";
import axiosInstance from "@/shared/common/utils/axios";
import { getSaleOrderStatistics } from "./saleOrderService";

vi.mock("@/shared/common/utils/axios", () => ({
  default: {
    get: vi.fn(),
  },
}));

describe("getSaleOrderStatistics", () => {
  beforeEach(() => vi.clearAllMocks());

  it("serializes filters and sends includeCancelled", async () => {
    vi.mocked(axiosInstance.get).mockResolvedValueOnce({
      data: {
        byWorkflow: [],
        byState: [],
        byClientType: [],
        totals: { orders: 0, total: 0, collected: 0, pending: 0 },
      },
    });
    const filters = [
      {
        field: "workflowId" as const,
        operator: "in" as const,
        mode: "include" as const,
        values: ["workflow-1"],
      },
    ];

    await getSaleOrderStatistics({
      q: " pedido ",
      filters,
      includeCancelled: true,
    });

    expect(axiosInstance.get).toHaveBeenCalledWith("/sale-orders/statistics", {
      params: {
        q: "pedido",
        filters: JSON.stringify(filters),
        includeCancelled: true,
      },
    });
  });

  it("omits empty search values and defaults includeCancelled to false", async () => {
    vi.mocked(axiosInstance.get).mockResolvedValueOnce({
      data: {
        byWorkflow: [],
        byState: [],
        byClientType: [],
        totals: { orders: 0, total: 0, collected: 0, pending: 0 },
      },
    });

    await getSaleOrderStatistics({ q: " ", filters: [] });

    expect(axiosInstance.get).toHaveBeenCalledWith("/sale-orders/statistics", {
      params: {
        q: undefined,
        filters: undefined,
        includeCancelled: false,
      },
    });
  });
});
