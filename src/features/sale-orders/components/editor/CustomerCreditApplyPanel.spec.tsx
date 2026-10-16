import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { permissions, getBalances, applyCredit } = vi.hoisted(() => ({
  permissions: new Set(["customer_credits.view", "customer_credits.apply"]),
  getBalances: vi.fn(),
  applyCredit: vi.fn(),
}));

vi.mock("@/shared/hooks/usePermissions", () => ({
  usePermissions: () => ({ can: (code: string) => permissions.has(code) }),
}));
vi.mock("@/shared/hooks/useAuth", () => ({ useAuth: () => ({ userId: "user-1" }) }));
vi.mock("@/shared/services/incomeService", () => ({
  getCustomerCreditBalances: getBalances,
  applyCustomerCredit: applyCredit,
}));

import { CustomerCreditApplyPanel } from "./CustomerCreditApplyPanel";

const props = {
  clientId: "client-1",
  saleOrderId: "order-1",
  currency: "PEN",
  remainingAmount: 50,
  availableCredit: 30,
  hasUnsavedChanges: false,
};

describe("CustomerCreditApplyPanel", () => {
  it("does not render the credit action when the order has no available credit", () => {
    const { container } = render(<CustomerCreditApplyPanel {...props} availableCredit={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  beforeEach(() => {
    getBalances.mockResolvedValue([{ currency: "PEN", available: 30 }, { currency: "USD", available: 90 }]);
    applyCredit.mockResolvedValue({ type: "success" });
  });

  afterEach(() => {
    permissions.clear();
    permissions.add("customer_credits.view");
    permissions.add("customer_credits.apply");
    vi.clearAllMocks();
    getBalances.mockResolvedValue([{ currency: "PEN", available: 30 }, { currency: "USD", available: 90 }]);
    applyCredit.mockResolvedValue({ type: "success" });
    sessionStorage.clear();
  });

  it("requires both dedicated permissions before offering credit operations", () => {
    permissions.delete("customer_credits.apply");
    const { container } = render(<CustomerCreditApplyPanel {...props} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows only the order currency and requires an explicit confirmation before applying", async () => {
    const user = userEvent.setup();
    const onApplied = vi.fn();
    render(<CustomerCreditApplyPanel {...props} onApplied={onApplied} />);

    await user.click(screen.getByRole("button", { name: "Consultar y aplicar saldo a favor" }));
    await screen.findByText("Disponible en PEN:");
    expect(screen.getByText("Disponible en PEN:").parentElement?.querySelector("strong")).toHaveTextContent(/30\.00/);
    expect(screen.queryByText(/USD/)).not.toBeInTheDocument();
    expect(screen.getByLabelText("Monto a aplicar (PEN)")).toHaveValue(30);

    await user.type(screen.getByLabelText("Motivo"), "Aplicación autorizada");
    const applyButton = screen.getByRole("button", { name: "Aplicar crédito" });
    expect(applyButton).toBeDisabled();
    await user.click(screen.getByRole("checkbox"));
    await user.click(applyButton);

    await waitFor(() => expect(applyCredit).toHaveBeenCalledWith(expect.objectContaining({
      clientId: "client-1", saleOrderId: "order-1", amount: 30, reason: "Aplicación autorizada",
    })));
    expect(onApplied).toHaveBeenCalledOnce();
    expect(await screen.findByText(/El ingreso bancario original no se modificó/)).toBeInTheDocument();
  });

  it("prevents operations while the order editor has unsaved changes", async () => {
    const user = userEvent.setup();
    render(<CustomerCreditApplyPanel {...props} hasUnsavedChanges />);
    await user.click(screen.getByRole("button", { name: "Consultar y aplicar saldo a favor" }));
    expect(await screen.findByText("Guarda o descarta los cambios del pedido antes de aplicar créditos.")).toBeInTheDocument();
    expect(screen.getByLabelText("Monto a aplicar (PEN)")).toBeDisabled();
    expect(getBalances).toHaveBeenCalledWith("client-1");
  });

  it("reuses the same idempotency key after a timeout retry of the same request", async () => {
    const user = userEvent.setup();
    applyCredit.mockRejectedValueOnce(new Error("timeout")).mockResolvedValueOnce({ type: "success" });
    render(<CustomerCreditApplyPanel {...props} />);
    await user.click(screen.getByRole("button", { name: "Consultar y aplicar saldo a favor" }));
    await screen.findByText("Disponible en PEN:");
    await user.type(screen.getByLabelText("Motivo"), "AplicaciÃ³n autorizada");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /Aplicar cr/ }));
    await screen.findByRole("alert"); // network failure is retained for idempotent recovery
    await user.click(screen.getByRole("button", { name: "Recuperar aplicación del saldo" }));
    await waitFor(() => expect(applyCredit).toHaveBeenCalledTimes(2));
    expect(applyCredit.mock.calls[0][0].idempotencyKey).toBe(applyCredit.mock.calls[1][0].idempotencyKey);
  });

  it("recovers the exact credit application after remount when the response was lost", async () => {
    const user = userEvent.setup();
    const onApplied = vi.fn();
    applyCredit.mockRejectedValueOnce(new Error("network disconnected")).mockResolvedValueOnce({ type: "success" });
    const first = render(<CustomerCreditApplyPanel {...props} />);
    await user.click(screen.getByRole("button", { name: "Consultar y aplicar saldo a favor" }));
    await screen.findByText("Disponible en PEN:");
    await user.type(screen.getByLabelText("Motivo"), "Aplicación autorizada");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Aplicar crédito" }));
    await screen.findByRole("status", { name: "Aplicación de saldo pendiente" });
    const request = applyCredit.mock.calls[0][0];
    first.unmount();

    render(<CustomerCreditApplyPanel {...props} onApplied={onApplied} />);
    const recovery = await screen.findByRole("status", { name: "Aplicación de saldo pendiente" });
    await user.click(within(recovery).getByRole("button", { name: "Recuperar aplicación del saldo" }));

    await waitFor(() => expect(applyCredit).toHaveBeenCalledTimes(2));
    expect(applyCredit.mock.calls[1][0]).toEqual(request);
    expect(onApplied).toHaveBeenCalledOnce();
    expect(sessionStorage.getItem(`eunoia:customer-credit-apply:user-1:${props.saleOrderId}`)).toBeNull();
  });
});
