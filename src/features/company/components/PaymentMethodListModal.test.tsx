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
  useFeedbackToast: () => ({ showFeedback: showFeedbackMock, clearFeedback: clearFeedbackMock }),
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
  DataTable: ({ data, columns }: { data: Array<Record<string, unknown>>; columns: Array<{ id: string; cell?: (row: Record<string, unknown>) => React.ReactNode }> }) => (
    <div data-testid="company-methods-table">
      {data.map((row) => (
        <div key={String(row.companyMethodId)}>
          {columns.map((column) => <div key={column.id}>{column.cell?.(row)}</div>)}
        </div>
      ))}
    </div>
  ),
}));

vi.mock("@/features/payment-methods/components/PaymentMethodSelectComposed", () => ({
  PaymentMethodSelectComposed: ({ options }: { options: Array<{ label: string }> }) => (
    <div data-testid="available-methods">{options.map((option) => option.label).join(",")}</div>
  ),
}));

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
      .mockResolvedValueOnce([{
        companyMethodId: "company-method-card",
        methodId: "method-card",
        name: "Tarjeta",
        isActive: true,
      }])
      .mockResolvedValueOnce([]);

    render(<PaymentMethodListModal title="Métodos" close={vi.fn()} companyId="company-1" />);

    await waitFor(() => expect(screen.getByRole("button", { name: "Desvincular método" })).toBeInTheDocument());
    expect(screen.getByTestId("available-methods")).not.toHaveTextContent("Tarjeta");

    fireEvent.click(screen.getByRole("button", { name: "Desvincular método" }));
    expect(deleteCompanyMethodMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Desvincular" }));

    await waitFor(() => {
      expect(deleteCompanyMethodMock).toHaveBeenCalledTimes(1);
      expect(deleteCompanyMethodMock).toHaveBeenCalledWith("company-method-card");
      expect(getPaymentMethodsByCompanyMock).toHaveBeenCalledTimes(2);
    });
    expect(screen.getByTestId("available-methods")).toHaveTextContent("Tarjeta");
  });

  it("cancelar la confirmación no llama al DELETE", async () => {
    getPaymentMethodsByCompanyMock.mockResolvedValue([{
      companyMethodId: "company-method-card",
      methodId: "method-card",
      name: "Tarjeta",
      isActive: true,
    }]);

    render(<PaymentMethodListModal title="Métodos" close={vi.fn()} companyId="company-1" />);

    await waitFor(() => expect(screen.getByRole("button", { name: "Desvincular método" })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Desvincular método" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(deleteCompanyMethodMock).not.toHaveBeenCalled();
  });

  it("muestra la lista sin acciones de gestión cuando falta payment-methods.manage", async () => {
    canMock.mockImplementation((permission: string) => permission === "payment-methods.read");
    getPaymentMethodsByCompanyMock.mockResolvedValue([{
      companyMethodId: "company-method-card",
      methodId: "method-card",
      name: "Tarjeta",
      isActive: true,
    }]);

    render(<PaymentMethodListModal title="Métodos" close={vi.fn()} companyId="company-1" />);

    await waitFor(() => expect(screen.getByTestId("company-methods-table")).toHaveTextContent(""));
    expect(screen.queryByRole("button", { name: "Desvincular método" })).not.toBeInTheDocument();
  });
});
