import { render, screen, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { IncomeTable } from "./IncomeTable";
import type { Income } from "../types/income.types";

vi.mock("@/shared/components/table/DataTable", () => ({
  DataTable: ({ data, columns }: { data: Income[]; columns: Array<{ id: string; cell?: (row: Income) => ReactNode }> }) => <div>{data.map((row) => <div key={row.incomeId}>{columns.map((column) => <div key={column.id}>{column.cell?.(row)}</div>)}</div>)}</div>,
}));
vi.mock("@/shared/components/components/ActionsPopover", () => ({
  ActionsPopover: ({ actions }: { actions: Array<{ id: string; label: string; hidden?: boolean; onClick?: () => void }> }) => <div>{actions.filter((action) => !action.hidden).map((action) => <button key={action.id} type="button" onClick={action.onClick}>{action.label}</button>)}</div>,
}));

const pendingIncome = {
  incomeId: "income-1", version: 1, saleOrderId: "order-1", saleOrderNumber: "SO-1", clientName: "Cliente",
  amount: 100, method: "Transferencia", paymentMethodId: "method-1", companyPaymentAccountId: "account-1",
  companyPaymentAccountLabel: "Cuenta", operationNumber: null, detail: null, date: "2026-10-01", createdAt: "2026-10-01",
  evidenceUrl: null, status: "PENDING_CONFIRMATION" as const, evidence: { available: false, status: "MISSING_OPTIONAL" as const, attachmentId: null, url: null, originalName: null, mimeType: null, sizeBytes: null, createdAt: null, canView: true, canUpload: true },
};

describe("IncomeTable pending edit entry points", () => {
  it("opens the edit modal from the missing-evidence action and exposes Editar ingreso", () => {
    const onEdit = vi.fn();
    render(<IncomeTable rows={[pendingIncome]} canEditPending onEdit={onEdit} />);

    fireEvent.click(screen.getByRole("button", { name: "Editar ingreso y agregar evidencia" }));
    fireEvent.click(screen.getByRole("button", { name: "Editar ingreso" }));

    expect(onEdit).toHaveBeenCalledTimes(2);
    expect(onEdit).toHaveBeenCalledWith(pendingIncome);
  });

  it("offers transfer only for pending income when the dedicated permission is present", () => {
    const onTransfer = vi.fn();
    const { rerender } = render(<IncomeTable rows={[pendingIncome]} canTransferPending onTransfer={onTransfer} />);

    fireEvent.click(screen.getByRole("button", { name: "Transferir a otro pedido" }));
    expect(onTransfer).toHaveBeenCalledWith(pendingIncome);

    rerender(<IncomeTable rows={[pendingIncome]} canTransferPending={false} onTransfer={onTransfer} />);
    expect(screen.queryByRole("button", { name: "Transferir a otro pedido" })).not.toBeInTheDocument();
  });

  it("does not expose pending edits to users without the permission", () => {
    render(<IncomeTable rows={[pendingIncome]} canEditPending={false} />);

    expect(screen.queryByRole("button", { name: "Editar ingreso" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Evidencia no disponible" })).toBeDisabled();
  });
});

describe("IncomeTable posted correction action", () => {
  it("shows the correction action only with its dedicated permission", () => {
    const posted = { ...pendingIncome, status: "POSTED" as const };
    const onCorrect = vi.fn();
    const { rerender } = render(<IncomeTable rows={[posted]} canCorrectPosted onCorrect={onCorrect} />);
    fireEvent.click(screen.getByRole("button", { name: "Corregir ingreso" }));
    expect(onCorrect).toHaveBeenCalledWith(posted);

    rerender(<IncomeTable rows={[posted]} canCorrectPosted={false} onCorrect={onCorrect} />);
    expect(screen.queryByRole("button", { name: "Corregir ingreso" })).not.toBeInTheDocument();
  });

  it("offers evidence recovery for an already-corrected posted payment without creating a second correction", () => {
    const corrected = { ...pendingIncome, status: "POSTED" as const, correctedFromPaymentId: "income-original" };
    const onCorrect = vi.fn();
    render(<IncomeTable rows={[corrected]} canReplaceCorrectedEvidence onCorrect={onCorrect} />);
    fireEvent.click(screen.getByRole("button", { name: "Actualizar evidencia corregida" }));
    expect(onCorrect).toHaveBeenCalledWith(corrected);
  });
});

describe("IncomeTable unknown financial state", () => {
  it("does not label a payment without a state as posted or expose posted-only actions", () => {
    const unknownState = { ...pendingIncome, status: undefined } as unknown as Income;
    render(<IncomeTable rows={[unknownState]} canViewRefunds canViewReconciliation canCorrectPosted />);

    expect(screen.getByText("Estado desconocido")).toBeInTheDocument();
    expect(screen.queryByText("Contabilizado")).not.toBeInTheDocument();
    expect(screen.getByText("No aplica")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ver reembolsos" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Conciliación bancaria" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Corregir ingreso" })).not.toBeInTheDocument();
  });

  it("treats legacy VOIDED as unclassified and does not offer re-entry", () => {
    const legacy = { ...pendingIncome, status: "VOIDED" as const };
    render(<IncomeTable rows={[legacy]} canReenter />);

    expect(screen.getByText("Estado desconocido")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reingresar" })).not.toBeInTheDocument();
  });
});

describe("IncomeTable refund action", () => {
  it("shows refund management only for posted incomes when the read permission exists", () => {
    const posted = { ...pendingIncome, status: "POSTED" as const };
    const onRefunds = vi.fn();
    const { rerender } = render(<IncomeTable rows={[posted]} canViewRefunds onRefunds={onRefunds} />);
    fireEvent.click(screen.getByRole("button", { name: "Ver reembolsos" }));
    expect(onRefunds).toHaveBeenCalledWith(posted);

    rerender(<IncomeTable rows={[pendingIncome]} canViewRefunds onRefunds={onRefunds} />);
    expect(screen.queryByRole("button", { name: "Ver reembolsos" })).not.toBeInTheDocument();

    rerender(<IncomeTable rows={[posted]} canViewRefunds={false} onRefunds={onRefunds} />);
    expect(screen.queryByRole("button", { name: "Ver reembolsos" })).not.toBeInTheDocument();
  });
});

describe("IncomeTable bank reconciliation action", () => {
  it("exposes reconciliation only for posted incomes when view permission exists", () => {
    const posted = { ...pendingIncome, status: "POSTED" as const };
    const onReconciliation = vi.fn();
    const { rerender } = render(<IncomeTable rows={[posted]} canViewReconciliation onReconciliation={onReconciliation} />);
    fireEvent.click(screen.getByRole("button", { name: "Conciliación bancaria" }));
    expect(onReconciliation).toHaveBeenCalledWith(posted);

    rerender(<IncomeTable rows={[pendingIncome]} canViewReconciliation onReconciliation={onReconciliation} />);
    expect(screen.queryByRole("button", { name: "Conciliación bancaria" })).not.toBeInTheDocument();

    rerender(<IncomeTable rows={[posted]} canViewReconciliation={false} onReconciliation={onReconciliation} />);
    expect(screen.queryByRole("button", { name: "Conciliación bancaria" })).not.toBeInTheDocument();
  });

  it("shows reconciliation as a separate dimension and a precise partial amount", () => {
    const posted = { ...pendingIncome, status: "POSTED" as const, reconciledAmount: 25.5, reconciliationStatus: "PARTIALLY_RECONCILED" as const };
    render(<IncomeTable rows={[posted]} />);
    expect(screen.getByText("Conciliación parcial")).toBeInTheDocument();
    expect(screen.getByText(/25/)).toBeInTheDocument();
    expect(screen.queryByText("No aplica")).not.toBeInTheDocument();
  });

  it("marks reconciliation as not applicable to pending payments", () => {
    render(<IncomeTable rows={[pendingIncome]} />);
    expect(screen.getByText("No aplica")).toBeInTheDocument();
  });
});
