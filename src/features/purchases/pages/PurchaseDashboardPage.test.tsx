import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PurchaseDashboardPage from "./PurchaseDashboardPage";
import type { PurchaseDashboardFilters as PurchaseDashboardFilterValue } from "@/features/purchases/types/purchase-dashboard.types";

const reloadMock = vi.fn();
const getPurchaseDashboardSearchStateMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/layouts/PageShell", () => ({
  PageShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));

vi.mock("sileo", () => ({
  sileo: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("@/shared/services/purchaseDashboardService", () => ({
  getPurchaseDashboardSearchState: getPurchaseDashboardSearchStateMock,
  savePurchaseDashboardSearchMetric: vi.fn(),
  deletePurchaseDashboardSearchMetric: vi.fn(),
}));

vi.mock("@/features/purchases/hooks/usePurchaseDashboard", () => ({
  usePurchaseDashboard: () => ({
    data: null,
    loading: false,
    error: null,
    reload: reloadMock,
  }),
}));

vi.mock("@/features/purchases/components/dashboard/PurchaseDashboardFilters", () => ({
  PurchaseDashboardFilters: ({
    onChange,
    onApply,
    onRefresh,
  }: {
    onChange: (filters: PurchaseDashboardFilterValue) => void;
    onApply: () => void;
    onRefresh: () => void;
  }) => (
    <section>
      <button type="button" onClick={() => onChange({ limit: 10, supplierId: "supplier-1" })}>
        Seleccionar proveedor
      </button>
      <button type="button" onClick={onApply}>
        Aplicar filtros
      </button>
      <button type="button" onClick={onRefresh}>
        Actualizar dashboard de compras
      </button>
    </section>
  ),
}));

vi.mock("@/features/purchases/components/dashboard/PurchaseKpiGrid", () => ({
  PurchaseKpiGrid: () => <div data-testid="purchase-kpi-grid" />,
}));

vi.mock("@/features/purchases/components/dashboard/PurchaseSpendingChart", () => ({
  PurchaseSpendingChart: () => <div data-testid="purchase-spending-chart" />,
}));

vi.mock("@/features/purchases/components/dashboard/PurchaseTypeChart", () => ({
  PurchaseTypeChart: () => <div data-testid="purchase-type-chart" />,
}));

vi.mock("@/features/purchases/components/dashboard/PurchasePaymentStatusChart", () => ({
  PurchasePaymentStatusChart: () => <div data-testid="purchase-payment-status-chart" />,
}));

vi.mock("@/features/purchases/components/dashboard/UpcomingPaymentsTable", () => ({
  UpcomingPaymentsTable: () => <div data-testid="upcoming-payments-table" />,
}));

vi.mock("@/features/purchases/components/dashboard/OverduePaymentsTable", () => ({
  OverduePaymentsTable: () => <div data-testid="overdue-payments-table" />,
}));

vi.mock("@/features/purchases/components/dashboard/PurchaseDashboardRankingTable", () => ({
  PurchaseDashboardRankingTable: () => <div data-testid="purchase-dashboard-ranking-table" />,
}));

describe("PurchaseDashboardPage", () => {
  beforeEach(() => {
    reloadMock.mockClear();
    getPurchaseDashboardSearchStateMock.mockResolvedValue({ recent: [], saved: [] });
  });

  it("keeps the page title out of the dashboard body and wires refresh through the toolbar", () => {
    render(<PurchaseDashboardPage />);

    expect(screen.queryByRole("heading", { name: "Dashboard Compras" })).not.toBeInTheDocument();

    const refreshButton = screen.getByRole("button", { name: "Actualizar dashboard de compras" });
    expect(refreshButton).toBeInTheDocument();

    fireEvent.click(refreshButton);
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });

  it("keeps showing the active filter count when filters are applied", () => {
    render(<PurchaseDashboardPage />);

    fireEvent.click(screen.getByRole("button", { name: "Seleccionar proveedor" }));
    fireEvent.click(screen.getByRole("button", { name: "Aplicar filtros" }));

    expect(screen.getByText("1 filtros activos")).toBeInTheDocument();
  });
});
