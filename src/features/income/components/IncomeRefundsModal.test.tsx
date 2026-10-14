import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IncomeRefundsModal } from "./IncomeRefundsModal";

const { listRefunds, createRefund, postRefund, cancelRefund, reverseRefund, listAccounts, showFeedback } = vi.hoisted(() => ({
  listRefunds: vi.fn(), createRefund: vi.fn(), postRefund: vi.fn(), cancelRefund: vi.fn(), reverseRefund: vi.fn(), listAccounts: vi.fn(), showFeedback: vi.fn(),
}));

vi.mock("@/shared/components/modales/Modal", () => ({ Modal: ({ open, title, description, children }: any) => open ? <div role="dialog" aria-label={title}><p>{description}</p>{children}</div> : null }));
vi.mock("@/shared/hooks/useCompany", () => ({ useCompany: () => ({ company: { companyId: "company-1" } }) }));
vi.mock("@/shared/hooks/useAuth", () => ({ useAuth: () => ({ userId: "user-1" }) }));
vi.mock("@/shared/hooks/useFeedbackToast", () => ({ useFeedbackToast: () => ({ showFeedback }) }));
vi.mock("@/shared/services/companyPaymentAccountService", () => ({ listCompanyPaymentAccountsByCompany: listAccounts }));
vi.mock("@/features/payments/paymentAccountView", () => ({ getCompanyPaymentAccountDisplay: () => "Cuenta de salida PEN" }));
vi.mock("@/shared/services/incomeService", () => ({
  listIncomeRefunds: listRefunds, createIncomeRefund: createRefund, postIncomeRefund: postRefund, cancelIncomeRefund: cancelRefund, reverseIncomeRefund: reverseRefund,
}));

const income = { incomeId: "income-1", amount: 20, currency: "PEN", saleOrderNumber: "SO-1", clientName: "Cliente" } as any;
const pendingRefund = { id: "refund-1", amount: 12.5, currency: "PEN", status: "PENDING", operationNumber: null, reason: "Devolución acordada", createdByUserId: "user-1", postedByUserId: null, postedAt: null, reversedByUserId: null, reversedAt: null, createdAt: "2026-10-12", companyPaymentAccountId: null };

describe("IncomeRefundsModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    listRefunds.mockResolvedValue({ items: [pendingRefund], availableCredit: 20 });
    createRefund.mockResolvedValue({ status: "PENDING" });
    listAccounts.mockResolvedValue([{ id: "out-account", currency: "PEN", usage: "OUTFLOW", isActive: true }]);
    postRefund.mockResolvedValue({ status: "POSTED" });
    cancelRefund.mockResolvedValue({ status: "CANCELLED" });
    reverseRefund.mockResolvedValue({ status: "REVERSED" });
  });

  it("confirms a real refund only after selecting an outflow account and reviewing its details", async () => {
    render(<IncomeRefundsModal open income={income} canCreate={false} canPost canCancel={false} canReverse={false} onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: /Confirmar devolución/ }));
    fireEvent.change(await screen.findByLabelText("Cuenta de salida"), { target: { value: "out-account" } });
    fireEvent.change(screen.getByLabelText("Número de operación"), { target: { value: "REF-1" } });
    fireEvent.click(screen.getByLabelText(/Confirmo que revisé/));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar operación" }));

    await waitFor(() => expect(postRefund).toHaveBeenCalledWith("refund-1", expect.objectContaining({ companyPaymentAccountId: "out-account", operationNumber: "REF-1" })));
    expect(showFeedback).toHaveBeenCalled();
  });

  it("requires a reason and confirmation before releasing a pending refund reservation", async () => {
    render(<IncomeRefundsModal open income={income} canCreate={false} canPost={false} canCancel canReverse={false} onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: /Cancelar reserva/ }));
    fireEvent.change(screen.getByLabelText(/Motivo/), { target: { value: "El cliente ya no requiere devolución" } });
    fireEvent.click(screen.getByLabelText(/Confirmo que revisé/));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar operación" }));

    await waitFor(() => expect(cancelRefund).toHaveBeenCalledWith("refund-1", "El cliente ya no requiere devolución", expect.any(String)));
  });

  it("creates a pending reservation only up to the available customer credit", async () => {
    render(<IncomeRefundsModal open income={income} canCreate canPost={false} canCancel={false} canReverse={false} onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "Nuevo reembolso" }));
    fireEvent.change(screen.getByLabelText(/Importe a reservar/), { target: { value: "15.25" } });
    fireEvent.change(screen.getByLabelText("Motivo"), { target: { value: "Devolución parcial acordada" } });
    fireEvent.click(screen.getByLabelText(/solo reserva el saldo/));
    fireEvent.click(screen.getByRole("button", { name: "Crear reembolso pendiente" }));

    await waitFor(() => expect(createRefund).toHaveBeenCalledWith("income-1", expect.objectContaining({ amount: 15.25, reason: "Devolución parcial acordada" })));
  });

  it("recovers a create request after remount by replaying the saved payload and idempotency key", async () => {
    createRefund.mockRejectedValueOnce(new Error("Respuesta de red perdida"));
    const firstRender = render(<IncomeRefundsModal open income={income} canCreate canPost={false} canCancel={false} canReverse={false} onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "Nuevo reembolso" }));
    fireEvent.change(screen.getByLabelText(/Importe a reservar/), { target: { value: "10.25" } });
    fireEvent.change(screen.getByLabelText("Motivo"), { target: { value: "Devolución de prueba" } });
    fireEvent.click(screen.getByLabelText(/solo reserva el saldo/));
    fireEvent.click(screen.getByRole("button", { name: "Crear reembolso pendiente" }));
    await screen.findByRole("region", { name: "Operaciones por recuperar" });
    const firstPayload = createRefund.mock.calls[0][1];
    expect(firstPayload.idempotencyKey).toEqual(expect.any(String));

    firstRender.unmount();
    render(<IncomeRefundsModal open income={income} canCreate canPost={false} canCancel={false} canReverse={false} onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "Recuperar operación pendiente" }));

    await waitFor(() => expect(createRefund).toHaveBeenCalledTimes(2));
    expect(createRefund.mock.calls[1]).toEqual(["income-1", firstPayload]);
    await waitFor(() => expect(sessionStorage.length).toBe(0));
  });
});
