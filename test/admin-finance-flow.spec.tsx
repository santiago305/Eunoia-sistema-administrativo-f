import { describe, expect, it, vi, beforeEach } from "vitest";
import axiosInstance from "@/shared/common/utils/axios";
import { canAccessRoute } from "@/routes/config/routeAccess";
import { getRouteMetaByPath } from "@/routes/config/routesConfig";
import { RoutesPaths } from "@/routes/config/routesPaths";
import { getSidebarTitleByPath } from "@/shared/config/sidebarConfig";
import { getIncomeSummary, listIncome } from "@/shared/services/incomeService";
import {
  getAdminFinanceSummary,
  listAdminFinanceMovements,
} from "@/shared/services/adminFinanceService";

vi.mock("@/shared/common/utils/axios", () => ({
  default: {
    get: vi.fn(),
  },
}));

describe("administrative finance flow", () => {
  beforeEach(() => {
    vi.mocked(axiosInstance.get).mockReset();
  });

  it("protects income and admin finance routes with page plus read permissions", () => {
    const incomeMeta = getRouteMetaByPath(RoutesPaths.income);
    const adminFinanceMeta = getRouteMetaByPath(RoutesPaths.adminFinance);

    expect(canAccessRoute(incomeMeta, null, ["page.income.view"])).toBe(false);
    expect(canAccessRoute(incomeMeta, null, ["page.income.view", "income.read"])).toBe(true);
    expect(canAccessRoute(adminFinanceMeta, null, ["page.admin-finance.view"])).toBe(false);
    expect(canAccessRoute(adminFinanceMeta, null, ["page.admin-finance.view", "admin_finance.read"])).toBe(true);
  });

  it("exposes income, admin dashboard and accounts payable from navigation", () => {
    expect(getSidebarTitleByPath("/ingresos")).toBe("Ingresos");
    expect(getSidebarTitleByPath("/admin-finance")).toBe("Dashboard administrativo");
    expect(getSidebarTitleByPath("/cuentas-por-pagar")).toBe("Cuentas por pagar");
  });

  it("loads sale payment income and consolidated money flow from administrative endpoints", async () => {
    vi.mocked(axiosInstance.get)
      .mockResolvedValueOnce({
        data: {
          items: [{ incomeId: "sale-payment-1", saleOrderId: "sale-order-1", amount: 120 }],
          total: 1,
          page: 1,
          limit: 50,
        },
      })
      .mockResolvedValueOnce({
        data: {
          totalCollected: 120,
          totalPending: 80,
          ordersPaid: 1,
          ordersPending: 1,
          byMethod: [{ method: "Transferencia", amount: 120, count: 1 }],
          byAccount: [{ accountId: "account-1", label: "BCP soles", amount: 120, count: 1 }],
        },
      })
      .mockResolvedValueOnce({
        data: {
          income: { collected: 120, pending: 80 },
          expenses: { paid: 50, pending: 70, overdue: 20, scheduled: 30 },
          net: { collectedMinusPaid: 70, projectedAfterPending: 0 },
        },
      })
      .mockResolvedValueOnce({
        data: {
          items: [
            { type: "INCOME", source: "SALE_ORDER", sourceId: "sale-order-1", amount: 120 },
            { type: "EXPENSE", source: "LOGISTICS", sourceId: "account-payable-1", amount: 70 },
          ],
          total: 2,
          page: 1,
          limit: 50,
        },
      });

    await expect(listIncome({ limit: 50 })).resolves.toEqual(
      expect.objectContaining({ items: [expect.objectContaining({ incomeId: "sale-payment-1" })] }),
    );
    await expect(getIncomeSummary({ limit: 50 })).resolves.toEqual(
      expect.objectContaining({ totalCollected: 120, totalPending: 80 }),
    );
    await expect(getAdminFinanceSummary({ limit: 50 })).resolves.toEqual(
      expect.objectContaining({ income: { collected: 120, pending: 80 } }),
    );
    await expect(listAdminFinanceMovements({ type: "EXPENSE", limit: 50 })).resolves.toEqual(
      expect.objectContaining({
        items: [
          expect.objectContaining({ type: "INCOME", source: "SALE_ORDER" }),
          expect.objectContaining({ type: "EXPENSE", source: "LOGISTICS" }),
        ],
      }),
    );

    expect(axiosInstance.get).toHaveBeenNthCalledWith(1, "/income", { params: { limit: 50 } });
    expect(axiosInstance.get).toHaveBeenNthCalledWith(2, "/income/summary", { params: { limit: 50 } });
    expect(axiosInstance.get).toHaveBeenNthCalledWith(3, "/admin-finance/summary", { params: { limit: 50 } });
    expect(axiosInstance.get).toHaveBeenNthCalledWith(4, "/admin-finance/movements", {
      params: { type: "EXPENSE", limit: 50 },
    });
  });
});
