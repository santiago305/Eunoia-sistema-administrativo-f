import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { SaleOrderStatisticsResponse } from "../../types/saleOrder";
import { SaleOrderStatisticsPanel } from "./SaleOrderStatisticsPanel";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({
    children,
    data,
  }: {
    children: React.ReactNode;
    data?: Array<Record<string, unknown>>;
  }) => {
    const isBankAccountChart = data?.some(
      (item) => "collected" in item && "payments" in item,
    );

    return (
      <div data-testid={isBankAccountChart ? "bank-account-bar-chart" : "bar-chart"}>
        {isBankAccountChart
          ? data?.map((item) => (
              <span key={String(item.id ?? item.name)}>
                {String(item.name)}:{String(item.payments)}:{String(item.collected)}
              </span>
            ))
          : null}
        {children}
      </div>
    );
  },
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  Legend: () => null,
  LabelList: () => null,
  Bar: ({
    children,
    dataKey,
  }: {
    children?: React.ReactNode;
    dataKey?: string;
  }) => (
    <div data-testid={dataKey ? `bank-account-bar-${dataKey}` : undefined}>
      {children}
    </div>
  ),
  Cell: ({
    onClick,
    "aria-label": ariaLabel,
  }: {
    onClick?: () => void;
    "aria-label"?: string;
  }) =>
    onClick ? (
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={onClick}
      />
    ) : null,
  PieChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Pie: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

const statistics: SaleOrderStatisticsResponse = {
  byWorkflow: [
    { id: "workflow-1", label: "Venta principal", count: 8 },
    { id: null, label: "Sin flujo", count: 2 },
  ],
  byState: [
    { id: "state-1", label: "Preparando", color: "#0ea5e9", count: 6 },
    { id: null, label: "Sin estado", color: null, count: 4 },
  ],
  byClientType: [
    { type: "NEW", label: "Nuevo", count: 5 },
    { type: "REPURCHASE", label: "Recompra", count: 5 },
  ],
  byPaymentDescription: [
    {
      description: "ADELANTO",
      label: "ADELANTO",
      payments: 7,
      collected: 700,
      byBankAccount: [
        {
          id: "account-1",
          label: "CURIER-EVA",
          number: "12323213232",
          payments: 7,
          collected: 700,
        },
      ],
    },
    {
      description: "Anticipo",
      label: "Anticipo",
      payments: 8,
      collected: 620.5,
      byBankAccount: [
        {
          id: "account-1",
          label: "CURIER-EVA",
          number: "12323213232",
          payments: 5,
          collected: 430.6,
        },
        {
          id: null,
          label: "Sin cuenta",
          number: null,
          payments: 3,
          collected: 189.9,
        },
      ],
    },
  ],
  totals: {
    orders: 10,
    total: 1500,
    collected: 900,
    pending: 600,
    deliveryCostSum: 0,
  },
};

describe("SaleOrderStatisticsPanel", () => {
  it("renders totals and all backend groups including null identifiers", () => {
    render(
      <SaleOrderStatisticsPanel
        statistics={statistics}
        loading={false}
        error={null}
        compact={false}
      />,
    );

    expect(screen.getByText(/S\/\s*1,500\.00/)).toBeTruthy();
    expect(screen.getByText(/S\/\s*0\.00/)).toBeTruthy();
    expect(screen.getByText(/S\/\s*900\.00/)).toBeTruthy();
    expect(screen.getByText(/S\/\s*600\.00/)).toBeTruthy();
    expect(screen.getByText("Venta principal")).toBeTruthy();
    expect(screen.getByText("Sin flujo")).toBeTruthy();
    expect(screen.getByText("Preparando")).toBeTruthy();
    expect(screen.getByText("Sin estado")).toBeTruthy();
    expect(screen.getByText("Nuevo")).toBeTruthy();
    expect(screen.getByText("Recompra")).toBeTruthy();
    expect(screen.getByText("Cuentas bancarias")).toBeTruthy();
  });

  it("shows loading, updating, error, empty, and compact states", () => {
    const { rerender } = render(
      <SaleOrderStatisticsPanel
        statistics={null}
        loading
        error={null}
        compact={false}
      />,
    );
    expect(screen.getByText("Cargando estadísticas...")).toBeTruthy();

    rerender(
      <SaleOrderStatisticsPanel
        statistics={statistics}
        loading
        error={null}
        compact
      />,
    );
    expect(screen.getByText("Actualizando...")).toBeTruthy();
    expect(
      screen.getByTestId("sale-order-statistics").getAttribute("data-compact"),
    ).toBe("true");

    rerender(
      <SaleOrderStatisticsPanel
        statistics={statistics}
        loading={false}
        error="No se pudieron cargar."
        compact
      />,
    );
    expect(screen.getByText("No se pudieron cargar.")).toBeTruthy();

    rerender(
      <SaleOrderStatisticsPanel
        statistics={{
          byWorkflow: [],
          byState: [],
          byClientType: [],
          byPaymentDescription: [],
          totals: { orders: 0, total: 0, collected: 0, pending: 0, deliveryCostSum: 0 },
        }}
        loading={false}
        error={null}
        compact={false}
      />,
    );
    expect(screen.getByText("No hay estadísticas para los filtros actuales.")).toBeTruthy();
  });

  it("can render charts without duplicating totals", () => {
    render(
      <SaleOrderStatisticsPanel
        statistics={statistics}
        loading={false}
        error={null}
        compact={false}
        showTotals={false}
      />,
    );

    expect(screen.queryByText("Total vendido")).toBeNull();
    expect(screen.getByText("Pedidos por tipo")).toBeTruthy();
    expect(screen.getByText("Pedidos por estado")).toBeTruthy();
    expect(screen.getByText("Pedidos por tipo de cliente")).toBeTruthy();
    expect(screen.getByText("Cuentas bancarias")).toBeTruthy();
  });

  it("renders the payment-description chart and drills down to bank-account amounts", async () => {
    const user = userEvent.setup();
    render(
      <SaleOrderStatisticsPanel
        statistics={statistics}
        loading={false}
        error={null}
        compact={false}
      />,
    );

    const chart = screen.getByTestId("bank-account-bar-chart");
    expect(screen.getByTestId("bank-account-bar-collected")).toBeTruthy();
    expect(chart).toHaveTextContent("ADELANTO:7:700");
    expect(chart).toHaveTextContent("Anticipo:8:620.5");
    expect(chart).not.toHaveTextContent("CURIER-EVA:5:430.6");
    expect(chart).not.toHaveTextContent("Sin cuenta:3:189.9");
    expect(screen.getByText(/S\/\s*900\.00/)).toBeTruthy();

    await user.click(screen.getByLabelText("Ver cuentas de Anticipo"));

    expect(chart).not.toHaveTextContent("ADELANTO:7:700");
    expect(chart).not.toHaveTextContent("Anticipo:8:620.5");
    expect(chart).toHaveTextContent("CURIER-EVA:5:430.6");
    expect(chart).toHaveTextContent("Sin cuenta:3:189.9");
    expect(screen.getByTestId("bank-account-bar-collected")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /^Descripciones$/ }));

    expect(chart).toHaveTextContent("ADELANTO:7:700");
    expect(chart).toHaveTextContent("Anticipo:8:620.5");
  });
});
