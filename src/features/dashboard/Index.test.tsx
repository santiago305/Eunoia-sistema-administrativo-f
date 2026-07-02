import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Dashboard from "./Index";
import {
  getDashboardSaleOrdersByDepartment,
  getDashboardSaleOrdersByDistrict,
  getDashboardSaleOrdersByProvince,
} from "@/shared/services/dashboardService";
import { getSaleOrderStatistics } from "@/shared/services/saleOrderService";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  Bar: () => null,
  Cell: () => null,
  LabelList: () => null,
}));

vi.mock("@/shared/services/dashboardService", () => ({
  getDashboardSaleOrdersByDepartment: vi.fn(),
  getDashboardSaleOrdersByProvince: vi.fn(),
  getDashboardSaleOrdersByDistrict: vi.fn(),
}));

vi.mock("@/shared/services/saleOrderService", () => ({
  getSaleOrderStatistics: vi.fn(),
}));

vi.mock("@/features/sale-orders/components/statistics/SaleOrderStatisticsPanel", () => ({
  SaleOrderStatisticsPanel: ({ statistics }: { statistics: { totals?: { orders?: number } } | null }) => (
    <section aria-label="Estadísticas de pedidos">
      Pedidos estadísticos: {statistics?.totals?.orders ?? 0}
    </section>
  ),
}));

vi.mock("./components/DashboardSaleOrderSmartFilter", () => ({
  DashboardSaleOrderSmartFilter: ({
    onApplyRule,
  }: {
    onApplyRule: (rule: { field: "scheduleDate"; operator: "inWeek"; value: string }) => void;
  }) => (
    <button
      type="button"
      onClick={() =>
        onApplyRule({
          field: "scheduleDate",
          operator: "inWeek",
          value: "2026-06-29",
        })
      }
    >
      Filtros del dashboard
    </button>
  ),
}));

const departmentsResponse = {
  groups: [
    {
      id: "15",
      label: "LIMA",
      orders: 10,
      total: 1200.5,
      deliveryCostSum: 80,
      collected: 900,
      pending: 300.5,
    },
  ],
  totals: {
    orders: 10,
    total: 1200.5,
    deliveryCostSum: 80,
    collected: 900,
    pending: 300.5,
  },
};

const provincesResponse = {
  groups: [
    {
      id: "1501",
      label: "LIMA PROVINCIA",
      orders: 7,
      total: 700,
      deliveryCostSum: 50,
      collected: 500,
      pending: 200,
    },
  ],
  totals: {
    orders: 7,
    total: 700,
    deliveryCostSum: 50,
    collected: 500,
    pending: 200,
  },
};

const districtsResponse = {
  groups: [
    {
      id: "150101",
      label: "LIMA DISTRITO",
      orders: 4,
      total: 400,
      deliveryCostSum: 20,
      collected: 350,
      pending: 50,
    },
  ],
  totals: {
    orders: 4,
    total: 400,
    deliveryCostSum: 20,
    collected: 350,
    pending: 50,
  },
};

describe("Dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(getDashboardSaleOrdersByDepartment).mockResolvedValue(
      departmentsResponse,
    );
    vi.mocked(getDashboardSaleOrdersByProvince).mockResolvedValue(
      provincesResponse,
    );
    vi.mocked(getDashboardSaleOrdersByDistrict).mockResolvedValue(
      districtsResponse,
    );
    vi.mocked(getSaleOrderStatistics).mockResolvedValue({
      byWorkflow: [],
      byState: [],
      byClientType: [],
      byBankAccount: [],
      totals: {
        orders: 10,
        total: 1200.5,
        deliveryCostSum: 80,
        collected: 900,
        pending: 300.5,
      },
    });
  });

  it("loads departments on mount and renders backend totals", async () => {
    render(<Dashboard />);

    expect(
      await screen.findByRole("region", {
        name: /distribuci.n por departamentos/i,
      }),
    ).toBeInTheDocument();

    expect(getDashboardSaleOrdersByDepartment).toHaveBeenCalledWith({
      filters: [],
      cancelBool: false,
    });
    expect(getSaleOrderStatistics).toHaveBeenCalledWith({
      filters: [],
      includeCancelled: false,
    });
    expect(screen.getByRole("region", { name: /estadísticas de pedidos/i })).toBeInTheDocument();

    expect(
      await screen.findByRole("button", { name: /ver provincias de lima/i }),
    ).toBeInTheDocument();
    const chartPanel = screen.getByRole("region", {
      name: /distribuci.n por departamentos/i,
    });
    const summaryLegend = within(chartPanel).getByRole("list", {
      name: /resumen del gráfico/i,
    });
    expect(
      within(summaryLegend).getByText("10", { exact: true }),
    ).toBeInTheDocument();
    expect(
      within(summaryLegend).getByText("S/ 1,200.50"),
    ).toBeInTheDocument();
    expect(
      within(chartPanel).getAllByText(/lima/i).length,
    ).toBeGreaterThan(0);
    expect(
      within(chartPanel).getAllByText(/10 pedidos/i).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText("Total Tarifa")).not.toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/mes del dashboard/i)).not.toBeInTheDocument();
  });

  it("loads provinces and districts from chart group selection", async () => {
    const user = userEvent.setup();
    render(<Dashboard />);

    await user.click(
      await screen.findByRole("button", { name: /ver provincias de lima/i }),
    );

    await waitFor(() => {
      expect(getDashboardSaleOrdersByProvince).toHaveBeenCalledWith("15", {
        filters: [],
        cancelBool: false,
      });
    });

    expect(
      screen.getByRole("button", { name: /volver a departamentos/i }),
    ).toBeInTheDocument();

    await user.click(
      await screen.findByRole("button", {
        name: /ver distritos de lima provincia/i,
      }),
    );

    await waitFor(() => {
      expect(getDashboardSaleOrdersByDistrict).toHaveBeenCalledWith("1501", {
        filters: [],
        cancelBool: false,
      });
    });

    await user.click(
      screen.getByRole("button", { name: /volver a provincias/i }),
    );

    await waitFor(() => {
      expect(getDashboardSaleOrdersByProvince).toHaveBeenLastCalledWith("15", {
        filters: [],
        cancelBool: false,
      });
    });
  });

  it("refetches the current level when filters change", async () => {
    const user = userEvent.setup();
    render(<Dashboard />);

    await screen.findByRole("button", { name: /ver provincias de lima/i });
    await user.click(screen.getByRole("button", { name: /filtros del dashboard/i }));
    await user.click(screen.getByLabelText(/incluir cancelados: no/i));
    await user.click(await screen.findByRole("option", { name: "Sí" }));

    await waitFor(() => {
      expect(getDashboardSaleOrdersByDepartment).toHaveBeenLastCalledWith({
        filters: [
          {
            field: "scheduleDate",
            operator: "inWeek",
            value: "2026-06-29",
          },
        ],
        cancelBool: true,
      });
      expect(getSaleOrderStatistics).toHaveBeenLastCalledWith({
        filters: [
          {
            field: "scheduleDate",
            operator: "inWeek",
            value: "2026-06-29",
          },
        ],
        includeCancelled: true,
      });
    });
  });

  it("renders district rows as terminal labels", async () => {
    const user = userEvent.setup();
    render(<Dashboard />);

    await user.click(
      await screen.findByRole("button", { name: /ver provincias de lima/i }),
    );
    await user.click(
      await screen.findByRole("button", {
        name: /ver distritos de lima provincia/i,
      }),
    );

    expect(
      await screen.findByText(/LIMA DISTRITO/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /ver distritos de lima distrito/i }),
    ).not.toBeInTheDocument();
  });

  it("persists include cancelled and keeps global controls above the charts", async () => {
    localStorage.setItem("dashboard-sale-orders-include-cancelled", "true");
    const user = userEvent.setup();
    render(<Dashboard />);

    await waitFor(() => {
      expect(getSaleOrderStatistics).toHaveBeenCalledWith({
        filters: [],
        includeCancelled: true,
      });
    });

    expect(screen.getByRole("button", { name: /filtros del dashboard/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/incluir cancelados: sí/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/mes del dashboard/i)).not.toBeInTheDocument();

    await user.click(screen.getByLabelText(/incluir cancelados: sí/i));
    await user.click(await screen.findByRole("option", { name: "No" }));
    expect(localStorage.getItem("dashboard-sale-orders-include-cancelled")).toBe("false");
  });
});
