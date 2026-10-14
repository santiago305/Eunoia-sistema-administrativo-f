import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TransferPendingIncomeModal } from "./TransferPendingIncomeModal";
import { listAllPendingIncomeOperations } from "../services/income-operation-recovery";

const mocks = vi.hoisted(() => ({
  listTargets: vi.fn(),
  transfer: vi.fn(),
  showFeedback: vi.fn(),
}));

vi.mock("@/shared/components/modales/Modal", () => ({
  Modal: ({ open, title, description, children, footer }: any) => open ? <section role="dialog" aria-label={title}><p>{description}</p>{children}{footer}</section> : null,
}));
vi.mock("@/shared/hooks/useFeedbackToast", () => ({ useFeedbackToast: () => ({ showFeedback: mocks.showFeedback }) }));
vi.mock("@/shared/hooks/useAuth", () => ({ useAuth: () => ({ userId: "user-1" }) }));
vi.mock("@/shared/services/incomeService", () => ({
  listIncomeTransferTargets: mocks.listTargets,
  transferPendingIncome: mocks.transfer,
}));

const income = {
  incomeId: "income-1", version: 2, saleOrderId: "order-origin", saleOrderNumber: "SO-1", clientName: "Cliente Uno",
  amount: 25, currency: "PEN", method: "Transferencia", paymentMethodId: "method-1", companyPaymentAccountId: "account-1",
  companyPaymentAccountLabel: "Cuenta", operationNumber: null, detail: null, date: "2026-10-01", createdAt: "2026-10-01",
  evidenceUrl: null, status: "PENDING_CONFIRMATION" as const,
};

describe("TransferPendingIncomeModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mocks.listTargets.mockResolvedValue([{ saleOrderId: "order-target", saleOrderNumber: "SO-2", clientName: "Cliente Uno", total: 100, available: 75, currency: "PEN" }]);
    mocks.transfer.mockResolvedValue({ type: "success" });
  });

  it("requires a compatible destination and reason before transferring, then refreshes the list", async () => {
    const onClose = vi.fn();
    const onTransferred = vi.fn();
    render(<TransferPendingIncomeModal open income={income as any} onClose={onClose} onTransferred={onTransferred} />);

    await screen.findByText("SO-2");
    const submit = screen.getByRole("button", { name: "Transferir pago" });
    expect(submit).toBeDisabled();
    fireEvent.click(screen.getByRole("radio", { name: /SO-2/ }));
    fireEvent.change(screen.getByLabelText(/Motivo de la transferencia/), { target: { value: "Pedido asociado incorrecto" } });
    expect(submit).toBeEnabled();
    fireEvent.click(submit);

    await waitFor(() => expect(mocks.transfer).toHaveBeenCalledWith(income, "order-target", "Pedido asociado incorrecto", expect.any(String)));
    expect(onTransferred).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
    expect(listAllPendingIncomeOperations("user-1")).toEqual([]);
  });

  it("retains the exact idempotent command when the transfer response is lost", async () => {
    mocks.transfer.mockRejectedValueOnce(new Error("network disconnected"));
    render(<TransferPendingIncomeModal open income={income as any} onClose={vi.fn()} onTransferred={vi.fn()} />);

    await screen.findByText("SO-2");
    fireEvent.click(screen.getByRole("radio", { name: /SO-2/ }));
    fireEvent.change(screen.getByLabelText(/Motivo de la transferencia/), { target: { value: "Pedido asociado incorrecto" } });
    fireEvent.click(screen.getByRole("button", { name: "Transferir pago" }));

    await waitFor(() => expect(mocks.transfer).toHaveBeenCalledOnce());
    const [sentIncome, targetId, reason, sentKey] = mocks.transfer.mock.calls[0];
    const [pending] = listAllPendingIncomeOperations("user-1");
    expect(pending).toMatchObject({
      operationId: "income.transfer:income-1",
      incomeId: "income-1",
      kind: "income.transfer",
      idempotencyKey: sentKey,
      payload: { version: 2, targetSaleOrderId: "order-target", reason: "Pedido asociado incorrecto" },
    });
    expect([sentIncome, targetId, reason]).toEqual([income, "order-target", "Pedido asociado incorrecto"]);
  });
});
