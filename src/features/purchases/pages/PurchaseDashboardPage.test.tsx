import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PurchaseDashboardPage from "./PurchaseDashboardPage";
import type { PurchaseDashboardFilters as PurchaseDashboardFilterValue } from "@/features/purchases/types/purchase-dashboard.types";

const reloadMock = vi.fn();
const getPurchaseDashboardSearchStateMock = vi.hoisted(() => vi.fn());
const savePurchaseDashboardSearchMetricMock = vi.hoisted(() => vi.fn());

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
  savePurchaseDashboardSearchMetric: savePurchaseDashboardSearchMetricMock,
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
    onRefresh,
    onSaveMetric,
  }: {
    onChange: (filters: PurchaseDashboardFilterValue) => void;
    onRefresh: () => void;
    onSaveMetric: (name: string) => void;
  }) => (
    <section>
      <button type="button" onClick={() => onChange({ limit: 10, supplierId: "supplier-1" })}>
        Seleccionar proveedor
      </button>
      <button type="button" onClick={() => onSaveMetric("Pagadas julio")}>
        Guardar metrica
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
    savePurchaseDashboardSearchMetricMock.mockReset();
    savePurchaseDashboardSearchMetricMock.mockResolvedValue({ type: "success", message: "Filtro guardado" });
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

  it("updates active filter count as soon as filters change", () => {
    render(<PurchaseDashboardPage />);

    fireEvent.click(screen.getByRole("button", { name: "Seleccionar proveedor" }));

    expect(screen.getByText("1 filtros activos")).toBeInTheDocument();
  });

  it("saves dashboard filters with the provided metric name without using prompt", async () => {
    const promptSpy = vi.spyOn(window, "prompt").mockReturnValue("No deberia usarse");

    render(<PurchaseDashboardPage />);

    fireEvent.click(screen.getByRole("button", { name: "Seleccionar proveedor" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar metrica" }));

    await waitFor(() =>
      expect(savePurchaseDashboardSearchMetricMock).toHaveBeenCalledWith("Pagadas julio", {
        filters: [{ field: "supplierId", operator: "in", mode: "include", values: ["supplier-1"] }],
      }),
    );
    expect(promptSpy).not.toHaveBeenCalled();

    promptSpy.mockRestore();
  });
});
