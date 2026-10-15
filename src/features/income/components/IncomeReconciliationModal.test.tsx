import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IncomeReconciliationModal } from "./IncomeReconciliationModal";
import type { Income } from "../types/income.types";

const { listLines, listReconciliations, createLine, reconcile, unreconcile, listAccounts, showFeedback } = vi.hoisted(() => ({
  listLines: vi.fn(), listReconciliations: vi.fn(), createLine: vi.fn(), reconcile: vi.fn(), unreconcile: vi.fn(), listAccounts: vi.fn(), showFeedback: vi.fn(),
}));

vi.mock("@/shared/components/modales/Modal", () => ({ Modal: ({ open, title, description, children }: { open: boolean; title: string; description?: string; children?: ReactNode }) => open ? <div role="dialog" aria-label={title}><p>{description}</p>{children}</div> : null }));
vi.mock("@/shared/components/components/FloatingSelect", () => ({ FloatingSelect: ({ label, name, value, options, onChange, disabled }: any) => <label>{label}<select aria-label={label} name={name} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}>{options.map((option: any) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label> }));
vi.mock("@/shared/components/components/date-picker/FloatingDatePicker", () => ({ FloatingDatePicker: ({ label, name, value, onChange }: any) => <label>{label}<input aria-label={label} name={name} type="date" value={value ? value.toISOString().slice(0, 10) : ""} onChange={(event) => onChange(event.target.value ? new Date(`${event.target.value}T12:00:00`) : null)} /></label> }));
vi.mock("@/shared/hooks/useCompany", () => ({ useCompany: () => ({ company: { companyId: "company-1" } }) }));
vi.mock("@/shared/hooks/useAuth", () => ({ useAuth: () => ({ userId: "user-1" }) }));
vi.mock("@/shared/hooks/useFeedbackToast", () => ({ useFeedbackToast: () => ({ showFeedback }) }));
vi.mock("@/shared/services/companyPaymentAccountService", () => ({ listCompanyPaymentAccountsByCompany: listAccounts }));
vi.mock("@/features/payments/paymentAccountView", () => ({ getCompanyPaymentAccountDisplay: () => "Cuenta bancaria PEN" }));
vi.mock("@/shared/services/incomeService", () => ({
  listAvailableBankStatementLines: listLines,
  listIncomeReconciliations: listReconciliations,
  createBankStatementLine: createLine,
  reconcileIncome: reconcile,
  unreconcileIncome: unreconcile,
}));

const income = {
  incomeId: "income-1", amount: 100, currency: "PEN", saleOrderNumber: "SO-1", clientName: "Cliente",
  companyPaymentAccountId: "account-1", status: "POSTED", version: 2,
} as unknown as Income;
const statementLine = {
  id: "line-1", companyPaymentAccountId: "account-1", bankReference: "BANK-1", operationDate: "2026-10-12",
  amount: "75.00", currency: "PEN", available: "75.00",
};

describe("IncomeReconciliationModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    listAccounts.mockResolvedValue([{ id: "account-1", currency: "PEN", usage: "BOTH", isActive: true, maskedLabel: "•••• 1234" }]);
    listLines.mockResolvedValue([statementLine]);
    listReconciliations.mockResolvedValue({ items: [], reconciledAmount: 0, status: "UNRECONCILED" });
    createLine.mockResolvedValue({ type: "success" });
    reconcile.mockResolvedValue({ type: "success" });
    unreconcile.mockResolvedValue({ type: "success" });
  });

  it("shows posted balance, loads compatible bank lines, and allocates a partial amount", async () => {
    const onSaved = vi.fn();
    render(<IncomeReconciliationModal open income={income} canReconcile canUnreconcile={false} onClose={vi.fn()} onSaved={onSaved} />);
    expect(await screen.findByText("Sin conciliar")).toBeInTheDocument();
    expect(await screen.findByRole("option", { name: /BANK-1/ }, { timeout: 5_000 })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Importe a conciliar/), { target: { value: "25.50" } });
    fireEvent.click(screen.getByRole("button", { name: "Conciliar importe" }));

    await waitFor(() => expect(reconcile).toHaveBeenCalledWith("income-1", expect.objectContaining({ bankStatementLineId: "line-1", amount: 25.5 })));
    expect(onSaved).toHaveBeenCalled();
    expect(showFeedback).toHaveBeenCalled();
  });

  it("requires a reason and explicit confirmation before desconciliation", async () => {
    listReconciliations.mockResolvedValue({
      items: [{ id: "allocation-1", amount: "20.00", createdAt: "2026-10-12", unreconciledAt: null, unreconcileReason: null, bankReference: "BANK-1", operationDate: "2026-10-12", statementAmount: "75.00", currency: "PEN", companyPaymentAccountId: "account-1" }],
      reconciledAmount: 20, status: "PARTIALLY_RECONCILED",
    });
    render(<IncomeReconciliationModal open income={income} canReconcile={false} canUnreconcile onClose={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "Desconciliar" }));
    fireEvent.change(screen.getByLabelText("Motivo de desconciliación"), { target: { value: "Referencia bancaria incorrecta" } });
    fireEvent.click(screen.getByLabelText(/Confirmo retirar esta asignación/));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar desconciliación" }));

    await waitFor(() => expect(unreconcile).toHaveBeenCalledWith("income-1", "allocation-1", "Referencia bancaria incorrecta", expect.any(String)));
  });

  it("creates a statement line with the selected account, currency, and idempotency key", async () => {
    render(<IncomeReconciliationModal open income={income} canReconcile canUnreconcile={false} onClose={vi.fn()} />);
    await screen.findByRole("option", { name: /BANK-1/ }, { timeout: 5_000 });
    fireEvent.click(screen.getByText("Registrar una línea bancaria manualmente"));
    fireEvent.change(screen.getByLabelText("Referencia bancaria"), { target: { value: "BANK-NEW" } });
    fireEvent.change(screen.getByLabelText(/Importe de la línea/), { target: { value: "40.25" } });
    fireEvent.click(screen.getByRole("button", { name: "Registrar línea" }));
    await waitFor(() => expect(createLine).toHaveBeenCalledWith(expect.objectContaining({
      companyPaymentAccountId: "account-1", bankReference: "BANK-NEW", amount: 40.25, currency: "PEN", idempotencyKey: expect.any(String),
    })));
  });

  it("recovers a reconciliation after remount with the original idempotency key", async () => {
    reconcile.mockRejectedValueOnce(new Error("Respuesta de red perdida"));
    const firstRender = render(<IncomeReconciliationModal open income={income} canReconcile canUnreconcile={false} onClose={vi.fn()} />);
    await screen.findByRole("option", { name: /BANK-1/ }, { timeout: 5_000 });
    fireEvent.change(screen.getByLabelText(/Importe a conciliar/), { target: { value: "25.50" } });
    fireEvent.click(screen.getByRole("button", { name: "Conciliar importe" }));
    await screen.findByRole("region", { name: "Operaciones por recuperar" });
    const firstInput = reconcile.mock.calls[0][1];
    expect(firstInput.idempotencyKey).toEqual(expect.any(String));

    firstRender.unmount();
    render(<IncomeReconciliationModal open income={income} canReconcile canUnreconcile={false} onClose={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "Recuperar operación pendiente" }));

    await waitFor(() => expect(reconcile).toHaveBeenCalledTimes(2));
    expect(reconcile.mock.calls[1]).toEqual(["income-1", firstInput]);
    await waitFor(() => expect(sessionStorage.length).toBe(0));
  });
});
