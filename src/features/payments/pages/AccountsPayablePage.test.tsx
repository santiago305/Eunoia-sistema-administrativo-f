import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AccountsPayablePage from "./AccountsPayablePage";

const listAccountPayablesMock = vi.hoisted(() => vi.fn());
const markOverdueAccountPayablesMock = vi.hoisted(() => vi.fn());
const showFeedbackMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/services/accountsPayableService", () => ({
  listAccountPayables: listAccountPayablesMock,
  markOverdueAccountPayables: markOverdueAccountPayablesMock,
}));

vi.mock("@/shared/hooks/usePermissions", () => ({
  usePermissions: () => ({ can: () => true }),
}));

vi.mock("@/shared/hooks/useFeedbackToast", () => ({
  useFeedbackToast: () => ({ showFeedback: showFeedbackMock }),
}));

vi.mock("@/shared/layouts/PageShell", () => ({
  PageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("../components/AccountsPayableTable", () => ({
  AccountsPayableTable: ({ toolbarSearchContent }: { toolbarSearchContent: React.ReactNode }) => (
    <div>
      <div>{toolbarSearchContent}</div>
      <div data-testid="accounts-payable-table" />
    </div>
  ),
}));

vi.mock("../components/PaymentFormModal", () => ({
  PaymentFormModal: () => null,
}));

describe("AccountsPayablePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    listAccountPayablesMock.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });
    markOverdueAccountPayablesMock.mockResolvedValue({ updated: 0 });
  });

  it("uses purchaseId from the URL query as the initial payable filter", async () => {
    render(
      <MemoryRouter initialEntries={["/cuentas-por-pagar?purchaseId=purchase-1"]}>
        <AccountsPayablePage />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(listAccountPayablesMock).toHaveBeenCalledWith(
        expect.objectContaining({ purchaseId: "purchase-1" }),
      ),
    );
  });

  it("saves payable smart search metrics locally and renders them in the panel", async () => {
    render(
      <MemoryRouter initialEntries={["/cuentas-por-pagar"]}>
        <AccountsPayablePage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("Busca cuentas por pagar"), {
      target: { value: "proveedor norte" },
    });
    fireEvent.click(screen.getByLabelText("Buscar"));
    fireEvent.focus(screen.getByLabelText("Busca cuentas por pagar"));

    const saveButton = await screen.findByRole("button", { name: "Guardar" });
    expect(saveButton).not.toBeDisabled();
    fireEvent.click(saveButton);
    fireEvent.change(screen.getByLabelText("Nombre de la metrica"), {
      target: { value: "Pendientes proveedor norte" },
    });
    const dialog = screen.getByRole("dialog", { name: "Guardar metrica" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Guardar" }));
    fireEvent.focus(screen.getByLabelText("Busca cuentas por pagar"));

    await waitFor(() => {
      expect(screen.getByText("Pendientes proveedor norte")).toBeInTheDocument();
    });
  });
});
