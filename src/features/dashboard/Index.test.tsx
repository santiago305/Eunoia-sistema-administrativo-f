import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Dashboard from "./Index";
import {
  getDashboardSaleOrdersByDepartment,
  getDashboardSaleOrdersByDistrict,
  getDashboardSaleOrdersByProvince,
} from "@/shared/services/dashboardService";

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
    vi.mocked(getDashboardSaleOrdersByDepartment).mockResolvedValue(
      departmentsResponse,
    );
    vi.mocked(getDashboardSaleOrdersByProvince).mockResolvedValue(
      provincesResponse,
    );
    vi.mocked(getDashboardSaleOrdersByDistrict).mockResolvedValue(
      districtsResponse,
    );
  });

  it("loads departments on mount and renders backend totals", async () => {
    render(<Dashboard />);

    expect(
      await screen.findByRole("region", {
        name: /distribuci.n por departamentos/i,
      }),
    ).toBeInTheDocument();

    expect(getDashboardSaleOrdersByDepartment).toHaveBeenCalledWith({
      month: undefined,
      cancelBool: false,
    });

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
    expect(
      screen.getByLabelText(/mes del dashboard/i),
    ).toBeInTheDocument();
  });

  it("loads provinces and districts from chart group selection", async () => {
    const user = userEvent.setup();
    render(<Dashboard />);

    await user.click(
      await screen.findByRole("button", { name: /ver provincias de lima/i }),
    );

    await waitFor(() => {
      expect(getDashboardSaleOrdersByProvince).toHaveBeenCalledWith("15", {
        month: undefined,
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
        month: undefined,
        cancelBool: false,
      });
    });

    await user.click(
      screen.getByRole("button", { name: /volver a provincias/i }),
    );

    await waitFor(() => {
      expect(getDashboardSaleOrdersByProvince).toHaveBeenLastCalledWith("15", {
        month: undefined,
        cancelBool: false,
      });
    });
  });

  it("refetches the current level when filters change", async () => {
    const user = userEvent.setup();
    render(<Dashboard />);

    await screen.findByRole("button", { name: /ver provincias de lima/i });
    await user.click(
      screen.getByRole("button", { name: /mes del dashboard/i }),
    );
    await user.click(
      await screen.findByRole("button", { name: /junio/i }),
    );
    await user.click(screen.getByLabelText(/incluir cancelados: no/i));
    await user.click(await screen.findByRole("option", { name: "Sí" }));

    await waitFor(() => {
      expect(getDashboardSaleOrdersByDepartment).toHaveBeenLastCalledWith({
        month: "2026-06",
        cancelBool: true,
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

  it("keeps dashboard filters inside the chart panel", async () => {
    render(<Dashboard />);

    const chartPanel = await screen.findByRole("region", {
      name: /distribuci.n por departamentos/i,
    });

    expect(
      within(chartPanel).getByLabelText(/mes del dashboard/i),
    ).toBeInTheDocument();
    expect(
      within(chartPanel).getByLabelText(/incluir cancelados: no/i),
    ).toBeInTheDocument();
  });
});
