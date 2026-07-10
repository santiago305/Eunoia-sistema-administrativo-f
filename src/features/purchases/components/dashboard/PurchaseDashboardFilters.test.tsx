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
    iconOnly,
    containerClassName,
    onChange,
  }: {
    label: string;
    startDate?: Date | null;
    endDate?: Date | null;
    iconOnly?: boolean;
    containerClassName?: string;
    onChange: (range: { startDate: Date | null; endDate: Date | null }) => void;
  }) => {
    const formatDate = (date?: Date | null) => {
      if (!date) return "";
      const pad = (value: number) => String(value).padStart(2, "0");
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    };

    return (
      <div data-testid="date-range-container" className={containerClassName}>
        <button
          type="button"
          aria-label={label}
          data-icon-only={iconOnly ? "true" : "false"}
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
vi.mock("@/shared/components/components/FloatingMultiSelect", () => ({
  FloatingMultiSelect: ({
    label,
    value,
    options,
    onChange,
  }: {
    label: string;
    value: string[];
    options: Array<{ value: string; label: string }>;
    onChange: (value: string[]) => void;
  }) => (
    <div>
      <button type="button" aria-label={label} onClick={() => onChange([options[0]?.value ?? ""])}>
        {value.length ? value.join(",") : label}
      </button>
      {options.map((option) => (
        <span key={option.value}>{option.label}</span>
      ))}
    </div>
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
    const onRefresh = vi.fn();

    render(
      <PurchaseDashboardFilters
        value={{ limit: 10 }}
        loading={false}
        onRefresh={onRefresh}
        onChange={onChange}
        onApply={onApply}
        onClear={onClear}
      />,
    );

    await waitFor(() => expect(listSuppliersMock).toHaveBeenCalledWith({ page: 1, limit: 100, isActive: "true" }));
    expect(listUsersMock).toHaveBeenCalledWith({ status: "active", page: 1 });
    expect(listActiveWarehousesMock).toHaveBeenCalledWith({ page: 1, limit: 100 });
    expect(listCompanyPaymentAccountsByCompanyMock).toHaveBeenCalledWith("company-1");
    expect(screen.getByRole("region", { name: "Filtros del dashboard" })).toHaveClass("flex-nowrap");
    expect(screen.getByRole("button", { name: "Actualizar dashboard de compras" })).toHaveClass("border-border");
    expect(screen.getByTestId("date-range-container")).toHaveClass("w-10", "shrink-0");
    expect(screen.queryByRole("button", { name: /aplicar filtros/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^limpiar$/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Actualizar dashboard de compras" }));
    expect(onRefresh).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Filtros del dashboard de compras" }));
    fireEvent.click(screen.getByRole("button", { name: /Proveedores/i }));
    fireEvent.click(screen.getByRole("button", { name: "Proveedores" }));
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));

    expect(onApply).not.toHaveBeenCalled();
    expect(onChange).toHaveBeenLastCalledWith({ limit: 10, supplierId: "supplier-1" });
    expect(screen.queryByPlaceholderText(/uuid/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Filas por cuadro")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /aplicar filtros/i }));
    fireEvent.click(screen.getByRole("button", { name: "Filtros del dashboard de compras" }));
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
    expect(screen.getByRole("button", { name: "Desde / Hasta" })).toHaveAttribute("data-icon-only", "true");

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

  it("opens a smart filter popover with dashboard filter options and no column search entry", async () => {
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

    render(
      <PurchaseDashboardFilters
        value={{ limit: 10 }}
        loading={false}
        onChange={vi.fn()}
        onApply={vi.fn()}
        onClear={vi.fn()}
      />,
    );

    await waitFor(() => expect(listSuppliersMock).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: "Filtros del dashboard de compras" }));

    expect(screen.getByText("Filtros")).toBeInTheDocument();
    expect(screen.getByText("Selecciona filtros para el dashboard de compras.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tipo de compra/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Estado de pago/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Proveedores/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Usuarios/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Almacenes/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Metodos de pago/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cuenta o tarjeta/i })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/buscar columnas/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
  });

  it("shows saved dashboard metrics and applies their snapshot with date range", async () => {
    listSuppliersMock.mockResolvedValue({ items: [] });
    listUsersMock.mockResolvedValue({ items: [] });
    listActiveWarehousesMock.mockResolvedValue({ items: [] });
    getAllPaymentMethodsMock.mockResolvedValue([]);
    listCompanyPaymentAccountsByCompanyMock.mockResolvedValue([]);
    const onApplySavedSnapshot = vi.fn();
    const savedSnapshot = {
      filters: [{ field: "paymentStatus" as const, operator: "in" as const, values: ["PAID"] }],
      dateRange: { mode: "absolute" as const, from: "2026-07-01", to: "2026-07-09" },
    };

    render(
      <PurchaseDashboardFilters
        value={{ limit: 10 }}
        loading={false}
        savedMetrics={[
          {
            id: "metric-1",
            name: "Pagadas julio",
            label: "Fecha: 01/07/2026 - 09/07/2026 | Estado de pago: Pagado",
            snapshot: savedSnapshot,
          },
        ]}
        onChange={vi.fn()}
        onApply={vi.fn()}
        onClear={vi.fn()}
        onApplySavedSnapshot={onApplySavedSnapshot}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Filtros del dashboard de compras" }));
    fireEvent.click(screen.getByRole("button", { name: /Pagadas julio/ }));

    expect(onApplySavedSnapshot).toHaveBeenCalledWith(savedSnapshot);
  });
});
