import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PaymentMethodListModal } from "./PaymentMethodListModal";

const canMock = vi.hoisted(() => vi.fn());
const getPaymentMethodsByCompanyMock = vi.hoisted(() => vi.fn());
const getAllPaymentMethodsMock = vi.hoisted(() => vi.fn());
const deleteCompanyMethodMock = vi.hoisted(() => vi.fn());
const createCompanyMethodMock = vi.hoisted(() => vi.fn());
const showFeedbackMock = vi.hoisted(() => vi.fn());
const clearFeedbackMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/hooks/usePermissions", () => ({
  usePermissions: () => ({ can: canMock }),
}));

vi.mock("@/shared/hooks/useFeedbackToast", () => ({
  useFeedbackToast: () => ({
    showFeedback: showFeedbackMock,
    clearFeedback: clearFeedbackMock,
  }),
}));

vi.mock("@/shared/services/paymentMethodService", () => ({
  createCompanyMethod: createCompanyMethodMock,
  deleteCompanyMethod: deleteCompanyMethodMock,
  getAllPaymentMethods: getAllPaymentMethodsMock,
  getPaymentMethodsByCompany: getPaymentMethodsByCompanyMock,
}));

vi.mock("@/shared/components/settings/modal", () => ({
  Modal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/shared/components/modales/Modal", () => ({
  Modal: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div role="dialog">{children}</div> : null,
}));

vi.mock("@/shared/components/table/DataTable", () => ({
  DataTable: ({
    data,
    columns,
  }: {
    data: Array<Record<string, unknown>>;
    columns: Array<{
      id: string;
      header?: string;
      accessorKey?: string;
      cell?: (row: Record<string, unknown>) => React.ReactNode;
    }>;
  }) => (
    <div data-testid="company-methods-table">
      <div>
        {columns.map((column) => (
          <span key={column.id}>{column.header}</span>
        ))}
      </div>
      {data.map((row) => (
        <div key={String(row.companyMethodId)}>
          {columns.map((column) => (
            <div key={column.id}>
              {column.cell?.(row) ??
                (column.accessorKey
                  ? String(row[column.accessorKey] ?? "")
                  : null)}
            </div>
          ))}
        </div>
      ))}
    </div>
  ),
}));

vi.mock(
  "@/features/payment-methods/components/PaymentMethodSelectComposed",
  () => ({
    PaymentMethodSelectComposed: ({
      label,
      options,
      onCreate,
      onEdit,
    }: {
      label: string;
      options: Array<{ label: string }>;
      onCreate?: () => void;
      onEdit?: (methodId: string) => void;
    }) => (
      <div>
        <span>{label}</span>
        <div data-testid="available-methods">
          {options.map((option) => option.label).join(",")}
        </div>
        {onCreate ? (
          <button type="button" aria-label="Nuevo método" onClick={onCreate}>
            Nuevo
          </button>
        ) : null}
        {onEdit ? (
          <button
            type="button"
            aria-label="Editar método"
            onClick={() => onEdit("method-card")}
          >
            Editar
          </button>
        ) : null}
      </div>
    ),
  }),
);

vi.mock("@/features/payment-methods/components/PaymentMethodFormModal", () => ({
  PaymentMethodFormModal: () => null,
}));

describe("PaymentMethodListModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    canMock.mockImplementation((permission: string) =>
      ["payment-methods.read", "payment-methods.manage"].includes(permission),
    );
    getAllPaymentMethodsMock.mockResolvedValue([
      { methodId: "method-card", name: "Tarjeta", isActive: true },
      { methodId: "method-cash", name: "Efectivo", isActive: true },
    ]);
    deleteCompanyMethodMock.mockResolvedValue(undefined);
    createCompanyMethodMock.mockResolvedValue(undefined);
  });

  it("desvincula exactamente la relación empresarial tras confirmar y recarga la lista", async () => {
    getPaymentMethodsByCompanyMock
      .mockResolvedValueOnce([
        {
          companyMethodId: "company-method-card",
          methodId: "method-card",
          name: "Tarjeta",
          isActive: true,
        },
      ])
      .mockResolvedValueOnce([]);

    render(
      <PaymentMethodListModal
        title="Métodos"
        close={vi.fn()}
        companyId="company-1"
      />,
    );

    const unlinkButton = await screen.findByRole("button", {
      name: "Desvincular Tarjeta",
    });
    expect(screen.getByTestId("available-methods")).not.toHaveTextContent(
      "Tarjeta",
    );

    fireEvent.click(unlinkButton);
    expect(deleteCompanyMethodMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Desvincular" }));

    await waitFor(() => {
      expect(deleteCompanyMethodMock).toHaveBeenCalledWith(
        "company-method-card",
      );
      expect(getPaymentMethodsByCompanyMock).toHaveBeenCalledTimes(2);
    });
    expect(screen.getByTestId("available-methods")).toHaveTextContent("Tarjeta");
  });

  it("cancelar la confirmación no llama al DELETE", async () => {
    getPaymentMethodsByCompanyMock.mockResolvedValue([
      {
        companyMethodId: "company-method-card",
        methodId: "method-card",
        name: "Tarjeta",
        isActive: true,
      },
    ]);

    render(
      <PaymentMethodListModal
        title="Métodos"
        close={vi.fn()}
        companyId="company-1"
      />,
    );

    fireEvent.click(
      await screen.findByRole("button", { name: "Desvincular Tarjeta" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(deleteCompanyMethodMock).not.toHaveBeenCalled();
  });

  it("muestra la lista sin acciones de gestión cuando falta el permiso", async () => {
    canMock.mockImplementation(
      (permission: string) => permission === "payment-methods.read",
    );
    getPaymentMethodsByCompanyMock.mockResolvedValue([
      {
        companyMethodId: "company-method-card",
        methodId: "method-card",
        name: "Tarjeta",
        isActive: true,
      },
    ]);

    render(
      <PaymentMethodListModal
        title="Métodos"
        close={vi.fn()}
        companyId="company-1"
      />,
    );

    const table = await screen.findByTestId("company-methods-table");
    expect(table).toHaveTextContent("Tarjeta");
    expect(
      screen.queryByRole("button", { name: "Desvincular Tarjeta" }),
    ).not.toBeInTheDocument();
  });

  it("muestra solo las columnas útiles y los métodos configurados", async () => {
    getPaymentMethodsByCompanyMock.mockResolvedValue([
      {
        companyMethodId: "company-method-card",
        methodId: "method-card",
        name: "Tarjeta",
        requiresVoucher: true,
        isActive: true,
      },
    ]);

    render(
      <PaymentMethodListModal
        title="Métodos"
        close={vi.fn()}
        companyId="company-1"
      />,
    );

    const table = await screen.findByTestId("company-methods-table");
    expect(table).toHaveTextContent("Tarjeta");
    expect(table).toHaveTextContent("Método de pago");
    expect(table).toHaveTextContent("Comprobante");
    expect(table).not.toHaveTextContent("Código");
    expect(table).not.toHaveTextContent("Estado");
  });

  it("organiza los controles en un formulario accesible y responsivo", async () => {
    canMock.mockImplementation(
      (permission: string) => permission === "payment-methods.read",
    );
    getPaymentMethodsByCompanyMock.mockResolvedValue([]);

    render(
      <PaymentMethodListModal
        title="Métodos"
        close={vi.fn()}
        companyId="company-1"
      />,
    );

    const form = await screen.findByTestId("company-payment-method-form");
    expect(form.tagName).toBe("FORM");
    expect(form).toHaveClass(
      "grid-cols-1",
      "lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.65fr)_auto]",
    );
    expect(
      screen.getByRole("region", { name: "Agregar método" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Método de pago")).toHaveLength(2);
    expect(screen.getByLabelText("Comprobante obligatorio")).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "Nuevo método" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Editar método" }),
    ).not.toBeInTheDocument();
  });
});
