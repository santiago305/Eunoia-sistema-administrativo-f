import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PaymentAccountsPage from "./PaymentAccountsPage";

const listAccountsMock = vi.hoisted(() => vi.fn());
const updateAccountMock = vi.hoisted(() => vi.fn());
const setActiveMock = vi.hoisted(() => vi.fn());
const createAccountMock = vi.hoisted(() => vi.fn());
const canMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/hooks/useCompany", () => ({
  useCompany: () => ({ company: { companyId: "company-1" } }),
}));

vi.mock("@/shared/hooks/usePermissions", () => ({
  usePermissions: () => ({ can: canMock }),
}));

vi.mock("@/shared/layouts/PageShell", () => ({
  PageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/shared/services/companyPaymentAccountService", () => ({
  createCompanyPaymentAccount: createAccountMock,
  listCompanyPaymentAccountsByCompany: listAccountsMock,
  setCompanyPaymentAccountActive: setActiveMock,
  updateCompanyPaymentAccount: updateAccountMock,
}));

vi.mock("@/shared/components/table/DataTable", () => ({
  DataTable: ({
    data,
    columns,
    toolbarSearchContent,
  }: {
    data: Array<Record<string, unknown>>;
    columns: Array<{
      id: string;
      header: string;
      cell: (row: Record<string, unknown>) => React.ReactNode;
    }>;
    toolbarSearchContent?: React.ReactNode;
  }) => (
    <div>
      <div>{toolbarSearchContent}</div>
      <div data-testid="payment-accounts-table">
        {data.map((row) => (
          <div data-testid="payment-account-row" key={String(row.id)}>
            {columns.map((column) => (
              <div key={column.id} data-testid={`cell-${column.id}`}>
                {column.cell(row)}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  ),
}));

vi.mock("@/shared/components/components/ActionsPopover", () => ({
  ActionsPopover: ({
    actions,
  }: {
    actions: Array<{ id: string; label: string; hidden?: boolean; disabled?: boolean; onClick?: () => void }>;
  }) => (
    <div>
      {actions
        .filter((action) => !action.hidden)
        .map((action) => (
          <button key={action.id} type="button" disabled={action.disabled} onClick={action.onClick}>
            {action.label}
          </button>
        ))}
    </div>
  ),
}));

const accounts = [
  {
    id: "account-1",
    companyId: "company-1",
    type: "BANK_ACCOUNT",
    name: "BCP Operaciones",
    bankName: "BCP",
    accountNumber: "0011223344556677",
    accountLastFour: "6677",
    maskedLabel: "BCP Operaciones ****6677",
    currency: "PEN",
    isActive: true,
    isDefault: true,
  },
  {
    id: "account-2",
    companyId: "company-1",
    type: "CREDIT_CARD",
    name: "Visa compras",
    bankName: "Interbank",
    cardLastFour: "1234",
    maskedLabel: "Visa compras ****1234",
    currency: "USD",
    isActive: false,
    isDefault: false,
  },
];

describe("PaymentAccountsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    canMock.mockImplementation((permission: string) => permission !== "payment_accounts.view_sensitive");
    listAccountsMock.mockResolvedValue(accounts);
    createAccountMock.mockResolvedValue(accounts[0]);
    updateAccountMock.mockResolvedValue(accounts[0]);
    setActiveMock.mockResolvedValue({ type: "success", message: "ok" });
  });

  it("filters payment accounts by visible account text", async () => {
    render(<PaymentAccountsPage />);

    expect(await screen.findByText("BCP Operaciones ****6677 · PEN")).toBeInTheDocument();
    expect(screen.getByText("Visa compras ****1234 · USD")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Buscar cuentas de pago"), {
      target: { value: "visa" },
    });

    await waitFor(() => {
      expect(screen.queryByText("BCP Operaciones ****6677 · PEN")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Visa compras ****1234 · USD")).toBeInTheDocument();
  });

  it("edits an existing payment account from the actions menu", async () => {
    render(<PaymentAccountsPage />);

    const firstRow = (await screen.findAllByTestId("payment-account-row"))[0];
    fireEvent.click(within(firstRow).getByRole("button", { name: "Editar" }));

    const nameInput = await screen.findByLabelText("Nombre visible");
    expect(nameInput).toHaveValue("BCP Operaciones");
    fireEvent.change(nameInput, { target: { value: "BCP Tesoreria" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => {
      expect(updateAccountMock).toHaveBeenCalledWith(
        "account-1",
        expect.objectContaining({ name: "BCP Tesoreria", isDefault: true }),
      );
    });
  });

  it("does not render raw sensitive account numbers without sensitive permission", async () => {
    render(<PaymentAccountsPage />);

    await screen.findByText("BCP Operaciones ****6677 · PEN");

    expect(screen.queryByText("0011223344556677")).not.toBeInTheDocument();
  });
});
