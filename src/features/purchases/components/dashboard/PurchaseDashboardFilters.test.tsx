import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PurchaseDashboardFilters } from "./PurchaseDashboardFilters";

const listSuppliersMock = vi.hoisted(() => vi.fn());
const listUsersMock = vi.hoisted(() => vi.fn());
const listActiveWarehousesMock = vi.hoisted(() => vi.fn());
const getAllPaymentMethodsMock = vi.hoisted(() => vi.fn());
const listCompanyPaymentAccountsByCompanyMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/services/supplierService", () => ({ listSuppliers: listSuppliersMock }));
vi.mock("@/shared/services/userService", () => ({ listUsers: listUsersMock }));
vi.mock("@/shared/services/warehouseServices", () => ({ listActiveWarehouses: listActiveWarehousesMock }));
vi.mock("@/shared/services/paymentMethodService", () => ({ getAllPaymentMethods: getAllPaymentMethodsMock }));
vi.mock("@/shared/services/companyPaymentAccountService", () => ({
  listCompanyPaymentAccountsByCompany: listCompanyPaymentAccountsByCompanyMock,
}));
vi.mock("@/shared/hooks/useCompany", () => ({
  useCompany: () => ({ company: { companyId: "company-1" } }),
}));
vi.mock("@/shared/components/components/date-picker/FloatingDateRangePicker", () => ({
  FloatingDateRangePicker: ({
    label,
    startDate,
    endDate,
    onChange,
  }: {
    label: string;
    startDate?: Date | null;
    endDate?: Date | null;
    onChange: (range: { startDate: Date | null; endDate: Date | null }) => void;
  }) => {
    const formatDate = (date?: Date | null) => {
      if (!date) return "";
      const pad = (value: number) => String(value).padStart(2, "0");
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    };

    return (
      <div>
        <button
          type="button"
          aria-label={label}
          onClick={() => onChange({ startDate: new Date(2026, 6, 1), endDate: new Date(2026, 6, 9) })}
        >
          {formatDate(startDate)} / {formatDate(endDate)}
        </button>
        <button type="button" onClick={() => onChange({ startDate: null, endDate: null })}>
          Limpiar rango
        </button>
      </div>
    );
  },
}));
vi.mock("@/shared/components/components/FloatingSelect", () => ({
  FloatingSelect: ({
    label,
    value,
    options,
    onChange,
    disabled,
  }: {
    label: string;
    value: string;
    options: Array<{ value: string; label: string }>;
    onChange: (value: string) => void;
    disabled?: boolean;
  }) => (
    <select aria-label={label} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));

describe("PurchaseDashboardFilters", () => {
  it("loads catalog options and applies selected filters only when requested", async () => {
    listSuppliersMock.mockResolvedValue({
      items: [{ supplierId: "supplier-1", tradeName: "Proveedor Norte", documentNumber: "20111111111" }],
    });
    listUsersMock.mockResolvedValue({ items: [{ id: "user-1", name: "Ana Operaciones", email: "ana@eunoia.test" }] });
    listActiveWarehousesMock.mockResolvedValue({ items: [{ warehouseId: "warehouse-1", name: "Almacen Central" }] });
    getAllPaymentMethodsMock.mockResolvedValue([{ methodId: "method-1", name: "Transferencia", isActive: true }]);
    listCompanyPaymentAccountsByCompanyMock.mockResolvedValue([
      {
        id: "account-1",
        companyId: "company-1",
        type: "BANK_ACCOUNT",
        name: "BCP",
        maskedLabel: "BCP ****1234",
        currency: "PEN",
        isActive: true,
      },
    ]);
    const onChange = vi.fn();
    const onApply = vi.fn();
    const onClear = vi.fn();

    render(
      <PurchaseDashboardFilters
        value={{ limit: 10 }}
        loading={false}
        onChange={onChange}
        onApply={onApply}
        onClear={onClear}
      />,
    );

    await waitFor(() => expect(listSuppliersMock).toHaveBeenCalledWith({ page: 1, limit: 100, isActive: "true" }));
    expect(listUsersMock).toHaveBeenCalledWith({ status: "active", page: 1 });
    expect(listActiveWarehousesMock).toHaveBeenCalledWith({ page: 1, limit: 100 });
    expect(listCompanyPaymentAccountsByCompanyMock).toHaveBeenCalledWith("company-1");

    expect(screen.queryByPlaceholderText(/uuid/i)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Proveedor"), { target: { value: "supplier-1" } });
    fireEvent.change(screen.getByLabelText("Usuario"), { target: { value: "user-1" } });
    fireEvent.change(screen.getByLabelText("Almacén"), { target: { value: "warehouse-1" } });
    fireEvent.change(screen.getByLabelText("Método de pago"), { target: { value: "method-1" } });
    fireEvent.change(screen.getByLabelText("Cuenta o tarjeta"), { target: { value: "account-1" } });
    fireEvent.change(screen.getByLabelText("Filas por cuadro"), { target: { value: "20" } });

    expect(onApply).not.toHaveBeenCalled();
    expect(onChange).toHaveBeenLastCalledWith({ limit: 20 });

    fireEvent.click(screen.getByRole("button", { name: /aplicar filtros/i }));
    fireEvent.click(screen.getByRole("button", { name: /^limpiar$/i }));

    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("uses the shared date range picker and maps selected dates to dashboard filters", () => {
    listSuppliersMock.mockResolvedValue({ items: [] });
    listUsersMock.mockResolvedValue({ items: [] });
    listActiveWarehousesMock.mockResolvedValue({ items: [] });
    getAllPaymentMethodsMock.mockResolvedValue([]);
    listCompanyPaymentAccountsByCompanyMock.mockResolvedValue([]);
    const onChange = vi.fn();

    render(
      <PurchaseDashboardFilters
        value={{ limit: 10, supplierId: "supplier-1", from: "2026-07-03", to: "2026-07-08" }}
        loading={false}
        onChange={onChange}
        onApply={vi.fn()}
        onClear={vi.fn()}
      />,
    );

    expect(screen.queryAllByDisplayValue(/2026-07-/)).toHaveLength(0);
    expect(screen.getByRole("button", { name: "Desde / Hasta" })).toHaveTextContent("2026-07-03 / 2026-07-08");

    fireEvent.click(screen.getByRole("button", { name: "Desde / Hasta" }));

    expect(onChange).toHaveBeenLastCalledWith({
      limit: 10,
      supplierId: "supplier-1",
      from: "2026-07-01",
      to: "2026-07-09",
    });

    fireEvent.click(screen.getByRole("button", { name: "Limpiar rango" }));

    expect(onChange).toHaveBeenLastCalledWith({ limit: 10, supplierId: "supplier-1" });
  });
});
