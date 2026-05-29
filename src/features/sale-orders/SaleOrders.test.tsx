import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SaleOrders from "@/features/sale-orders/SaleOrders";
import { TooltipProvider } from "@/shared/components/ui/tooltip";

vi.mock("@/shared/hooks/useCompany", () => ({
  useCompany: () => ({ hasCompany: true, company: { companyId: "company-1" } }),
}));

vi.mock("@/shared/hooks/useAuth", () => ({
  useAuth: () => ({ isAuthenticated: false, userId: null }),
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
        agendaStatuses: [],
        deliveryStatuses: [],
        deliveryTypes: [],
        paymentStatuses: [],
      },
    }),
  };
});

describe("SaleOrders", () => {
  it("muestra el botón Nuevo pedido", () => {
    render(
      <TooltipProvider>
        <SaleOrders />
      </TooltipProvider>,
    );
    expect(screen.getByRole("button", { name: /nuevo pedido/i })).toBeTruthy();
  });
});
