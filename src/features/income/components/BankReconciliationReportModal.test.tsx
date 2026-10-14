import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BankReconciliationReportModal } from "./BankReconciliationReportModal";

const { getReport, listAccounts } = vi.hoisted(() => ({ getReport: vi.fn(), listAccounts: vi.fn() }));
vi.mock("@/shared/components/modales/Modal", () => ({ Modal: ({ open, title, children }: any) => open ? <div role="dialog" aria-label={title}>{children}</div> : null }));
vi.mock("@/shared/hooks/useCompany", () => ({ useCompany: () => ({ company: { companyId: "company-1" } }) }));
vi.mock("@/shared/services/companyPaymentAccountService", () => ({ listCompanyPaymentAccountsByCompany: listAccounts }));
vi.mock("@/features/payments/paymentAccountView", () => ({ getCompanyPaymentAccountDisplay: () => "Cuenta PEN" }));
vi.mock("@/shared/services/incomeService", () => ({ getBankReconciliationReport: getReport }));

describe("BankReconciliationReportModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listAccounts.mockResolvedValue([{ id: "account-1", currency: "PEN", usage: "BOTH", isActive: true }]);
    getReport.mockResolvedValue({
      from: "2026-10-01", to: "2026-10-12", truncated: false,
      totalsByCurrency: { PEN: { statementAmount: 100, reconciledAmount: 70, availableAmount: 30, lineCount: 1 } },
      items: [{ id: "line-1", accountName: "Cuenta PEN", bankReference: "REF-1", operationDate: "2026-10-12", currency: "PEN", amount: "100.00", reconciledAmount: "70.00", availableAmount: "30.00", status: "PARTIALLY_RECONCILED", activeAllocationCount: 2 }],
    });
  });

  it("shows bank lines, states, and separated currency totals after filtering", async () => {
    render(<BankReconciliationReportModal open onClose={vi.fn()} />);
    fireEvent.change(await screen.findByLabelText("Cuenta receptora"), { target: { value: "account-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Generar informe" }));
    expect(await screen.findByText("REF-1")).toBeInTheDocument();
    expect(screen.getByText(/Totales PEN/)).toBeInTheDocument();
    expect(screen.getByText("Parcial")).toBeInTheDocument();
    expect(getReport).toHaveBeenCalledWith(expect.objectContaining({ companyPaymentAccountId: "account-1" }));
  });
});
