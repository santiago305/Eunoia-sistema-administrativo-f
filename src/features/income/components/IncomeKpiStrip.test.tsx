import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { IncomeKpiStrip } from "./IncomeKpiStrip";

describe("IncomeKpiStrip customer credit", () => {
  it("renders financial KPIs separately for each currency instead of summing unlike currencies", () => {
    render(<IncomeKpiStrip
      summary={{
        totalCollected: 400, totalPending: 60, ordersPaid: 1, ordersPending: 2,
        byMethod: [], byAccount: [],
        currencyMetrics: [
          { currency: "PEN", totalCollected: 100, totalPending: 40, ordersPaid: 1, ordersPending: 1, postedPaymentsCount: 2, averageCollectedPayment: 50, collectionEffectiveness: 71.4, observedPaymentsCount: 1, observedPaymentsAmount: 10, voidedPaymentsCount: 1, voidedPaymentsAmount: 5 },
          { currency: "USD", totalCollected: 300, totalPending: 20, ordersPaid: 0, ordersPending: 1, postedPaymentsCount: 1, averageCollectedPayment: 300, collectionEffectiveness: 93.75, observedPaymentsCount: 0, observedPaymentsAmount: 0, voidedPaymentsCount: 0, voidedPaymentsAmount: 0 },
        ],
      }}
    />);

    expect(screen.getByRole("button", { name: /ingresos cobrados \(pen\)/i })).toHaveTextContent("100.00");
    expect(screen.getByRole("button", { name: /ingresos cobrados \(usd\)/i })).toHaveTextContent("300.00");
    expect(screen.getByText(/saldo pendiente \(pen\)/i).closest("article")).toHaveTextContent("40.00");
    expect(screen.getByText(/saldo pendiente \(usd\)/i).closest("article")).toHaveTextContent("20.00");
    expect(screen.queryByText(/Ingresos cobrados$/i)).not.toBeInTheDocument();
  });

  it("shows available customer credit and filters to incomes with a positive balance", () => {
    const onCustomerCreditFilter = vi.fn();
    render(<IncomeKpiStrip
      summary={{
        totalCollected: 100, totalPending: 0, ordersPaid: 1, ordersPending: 0,
        byMethod: [], byAccount: [], customerCreditByCurrency: [
          { currency: "PEN", availableAmount: 20, incomesCount: 1 },
          { currency: "USD", availableAmount: 35.5, incomesCount: 2 },
        ],
      }}
      onCustomerCreditFilter={onCustomerCreditFilter}
    />);

    const credit = screen.getByRole("button", { name: /saldo a favor \(usd\)/i });
    expect(credit).toHaveTextContent("35.50");
    expect(credit).toHaveTextContent("2 ingresos");
    expect(screen.getByRole("button", { name: /saldo a favor \(pen\)/i })).toHaveTextContent("20.00");
    fireEvent.click(credit);
    expect(onCustomerCreditFilter).toHaveBeenCalledTimes(1);
  });
});
