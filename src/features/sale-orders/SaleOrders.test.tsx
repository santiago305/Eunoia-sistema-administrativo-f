import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import SaleOrders from "@/features/sale-orders/SaleOrders";
import { TooltipProvider } from "@/shared/components/ui/tooltip";

vi.mock("@/shared/hooks/useCompany", () => ({
  useCompany: () => ({ hasCompany: true, company: { companyId: "company-1" } }),
}));

vi.mock("@/shared/hooks/useAuth", () => ({
  useAuth: () => ({ isAuthenticated: false, userId: null }),
}));

vi.mock("@/shared/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

const { getSaleOrderStatisticsMock } = vi.hoisted(() => ({
  getSaleOrderStatisticsMock: vi.fn().mockResolvedValue({
    byWorkflow: [],
    byState: [],
    byClientType: [],
    totals: { orders: 0, total: 0, collected: 0, pending: 0 },
  }),
}));

vi.mock("@/shared/services/saleOrderService", async () => {
  const actual = await vi.importActual<typeof import("@/shared/services/saleOrderService")>(
    "@/shared/services/saleOrderService",
  );

  return {
    ...actual,
    listSaleOrders: vi.fn().mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 10,
    }),
    getSaleOrderSearchState: vi.fn().mockResolvedValue({
      recent: [],
      saved: [],
      catalogs: {
        clients: [],
        warehouses: [],
        paymentStatuses: [],
        workflows: [],
        states: [],
      },
    }),
    getSaleOrderStatistics: getSaleOrderStatisticsMock,
  };
});

describe("SaleOrders", () => {
  it("shows actions and reloads statistics when cancelled orders are included", async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider>
        <SaleOrders />
      </TooltipProvider>,
    );

    expect(screen.getByRole("button", { name: /nuevo pedido/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /flujos/i })).toBeTruthy();

    await waitFor(() =>
      expect(getSaleOrderStatisticsMock).toHaveBeenCalledWith({
        q: undefined,
        filters: [],
        includeCancelled: false,
      }),
    );

    await user.click(screen.getByText("Incluir cancelados"));

    await waitFor(() =>
      expect(getSaleOrderStatisticsMock).toHaveBeenLastCalledWith({
        q: undefined,
        filters: [],
        includeCancelled: true,
      }),
    );
  });
});
