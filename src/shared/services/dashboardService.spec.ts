import { beforeEach, describe, expect, it, vi } from "vitest";
import axiosInstance from "@/shared/common/utils/axios";
import {
  getDashboardSaleOrdersByDepartment,
  getDashboardSaleOrdersByDistrict,
  getDashboardSaleOrdersByProvince,
} from "./dashboardService";

vi.mock("@/shared/common/utils/axios", () => ({
  default: {
    get: vi.fn(),
  },
}));

const emptyResponse = {
  data: {
    groups: [],
    totals: {
      orders: 0,
      total: 0,
      deliveryCostSum: 0,
      collected: 0,
      pending: 0,
    },
  },
};

describe("dashboardService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requests departments with month and cancelBool params", async () => {
    vi.mocked(axiosInstance.get).mockResolvedValueOnce(emptyResponse);

    await getDashboardSaleOrdersByDepartment({
      month: "2026-06",
      cancelBool: true,
    });

    expect(axiosInstance.get).toHaveBeenCalledWith(
      "/dashboard/sale-orders/ubigeo/departments",
      {
        params: {
          month: "2026-06",
          cancelBool: true,
        },
      },
    );
  });

  it("omits month and sends cancelBool false when provided", async () => {
    vi.mocked(axiosInstance.get).mockResolvedValueOnce(emptyResponse);

    await getDashboardSaleOrdersByDepartment({ cancelBool: false });

    expect(axiosInstance.get).toHaveBeenCalledWith(
      "/dashboard/sale-orders/ubigeo/departments",
      {
        params: {
          month: undefined,
          cancelBool: false,
        },
      },
    );
  });

  it("requests provinces for the selected department", async () => {
    vi.mocked(axiosInstance.get).mockResolvedValueOnce(emptyResponse);

    await getDashboardSaleOrdersByProvince("15", {
      month: "2026-06",
      cancelBool: false,
    });

    expect(axiosInstance.get).toHaveBeenCalledWith(
      "/dashboard/sale-orders/ubigeo/departments/15/provinces",
      {
        params: {
          month: "2026-06",
          cancelBool: false,
        },
      },
    );
  });

  it("requests districts for the selected province", async () => {
    vi.mocked(axiosInstance.get).mockResolvedValueOnce(emptyResponse);

    await getDashboardSaleOrdersByDistrict("1501", {
      month: "2026-06",
      cancelBool: true,
    });

    expect(axiosInstance.get).toHaveBeenCalledWith(
      "/dashboard/sale-orders/ubigeo/provinces/1501/districts",
      {
        params: {
          month: "2026-06",
          cancelBool: true,
        },
      },
    );
  });
});
