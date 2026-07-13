import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PaymentMethodsPage from "./PaymentMethodsPage";

const usePaymentMethodsMock = vi.hoisted(() => vi.fn());
const canMock = vi.hoisted(() => vi.fn());
const setActiveMock = vi.hoisted(() => vi.fn());
const refreshMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/hooks/usePermissions", () => ({
  usePermissions: () => ({ can: canMock }),
}));

vi.mock("@/shared/hooks/usePaymentMethods", () => ({
  usePaymentMethods: (params: unknown) => usePaymentMethodsMock(params),
}));

vi.mock("@/shared/layouts/PageShell", () => ({
  PageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/features/payment-methods/components/PaymentMethodFormModal", () => ({
  PaymentMethodFormModal: ({
    open,
    mode,
    paymentMethodId,
    onClose,
  }: {
    open: boolean;
    mode: "create" | "edit";
    paymentMethodId?: string | null;
    onClose: () => void;
  }) =>
    open ? (
      <div role="dialog" aria-label={mode === "edit" ? "Editar metodo" : "Nuevo metodo"}>
        <span>{paymentMethodId ?? "new"}</span>
        <button type="button" onClick={onClose}>
          Cerrar
        </button>
      </div>
    ) : null,
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
      cell?: (row: Record<string, unknown>) => React.ReactNode;
    }>;
    toolbarSearchContent?: React.ReactNode;
  }) => (
    <div>
      <div>{toolbarSearchContent}</div>
      <div data-testid="payment-methods-table">
        {data.map((row) => (
          <div data-testid="payment-method-row" key={String(row.methodId)}>
            {columns.map((column) => (
              <div key={column.id} data-testid={`cell-${column.id}`}>
                {column.cell?.(row)}
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

const methods = [
  {
    methodId: "method-1",
    name: "Transferencia bancaria",
    isActive: true,
    requiresVoucher: true,
    createdAt: "2026-07-01T00:00:00.000Z",
  },
  {
    methodId: "method-2",
    name: "Efectivo",
    isActive: false,
    requiresVoucher: false,
    createdAt: "2026-07-02T00:00:00.000Z",
  },
];

describe("PaymentMethodsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    canMock.mockImplementation((permission: string) =>
      ["payment-methods.read", "payment-methods.manage"].includes(permission),
    );
    setActiveMock.mockResolvedValue(undefined);
    refreshMock.mockResolvedValue(undefined);
    usePaymentMethodsMock.mockReturnValue({
      items: methods,
      total: methods.length,
      page: 1,
      limit: 20,
      loading: false,
      error: null,
      refresh: refreshMock,
      setActive: setActiveMock,
    });
  });

  it("lists and filters payment methods by visible text", async () => {
    render(<PaymentMethodsPage />);

    expect(screen.getByText("Transferencia bancaria")).toBeInTheDocument();
    expect(screen.getByText("Efectivo")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Buscar metodos de pago"), {
      target: { value: "efectivo" },
    });

    await waitFor(() => {
      expect(screen.queryByText("Transferencia bancaria")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Efectivo")).toBeInTheDocument();
  });

  it("opens create and edit modals only when the user can manage payment methods", async () => {
    render(<PaymentMethodsPage />);

    fireEvent.click(screen.getByRole("button", { name: "Nuevo metodo" }));
    expect(screen.getByRole("dialog", { name: "Nuevo metodo" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    const firstRow = screen.getAllByTestId("payment-method-row")[0];
    fireEvent.click(within(firstRow).getByRole("button", { name: "Editar" }));

    expect(screen.getByRole("dialog", { name: "Editar metodo" })).toHaveTextContent("method-1");
  });

  it("activates or deactivates methods from the actions menu", async () => {
    render(<PaymentMethodsPage />);

    const secondRow = screen.getAllByTestId("payment-method-row")[1];
    fireEvent.click(within(secondRow).getByRole("button", { name: "Activar" }));

    await waitFor(() => {
      expect(setActiveMock).toHaveBeenCalledWith("method-2", true);
    });
  });

  it("renders a read-only table without management actions when manage permission is missing", () => {
    canMock.mockImplementation((permission: string) => permission === "payment-methods.read");

    render(<PaymentMethodsPage />);

    expect(screen.getByText("Transferencia bancaria")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Nuevo metodo" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Editar" })).not.toBeInTheDocument();
  });
});
