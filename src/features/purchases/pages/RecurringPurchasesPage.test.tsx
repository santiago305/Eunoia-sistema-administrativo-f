import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RecurringPurchasesPage from "./RecurringPurchasesPage";

const {
  listRecurringPurchasesMock,
  createRecurringPurchaseMock,
  pauseRecurringPurchaseMock,
  resumeRecurringPurchaseMock,
  cancelRecurringPurchaseMock,
  generateCurrentRecurringPayableMock,
  listSuppliersMock,
} = vi.hoisted(() => ({
  listRecurringPurchasesMock: vi.fn(),
  createRecurringPurchaseMock: vi.fn(),
  pauseRecurringPurchaseMock: vi.fn(),
  resumeRecurringPurchaseMock: vi.fn(),
  cancelRecurringPurchaseMock: vi.fn(),
  generateCurrentRecurringPayableMock: vi.fn(),
  listSuppliersMock: vi.fn(),
}));

vi.mock("@/shared/services/recurringPurchaseService", () => ({
  listRecurringPurchases: listRecurringPurchasesMock,
  createRecurringPurchase: createRecurringPurchaseMock,
  pauseRecurringPurchase: pauseRecurringPurchaseMock,
  resumeRecurringPurchase: resumeRecurringPurchaseMock,
  cancelRecurringPurchase: cancelRecurringPurchaseMock,
  generateCurrentRecurringPayable: generateCurrentRecurringPayableMock,
}));

vi.mock("@/shared/services/supplierService", () => ({
  listSuppliers: listSuppliersMock,
}));

vi.mock("@/shared/hooks/useFeedbackToast", () => ({
  useFeedbackToast: () => ({ showFeedback: vi.fn() }),
}));

vi.mock("@/shared/hooks/usePermissions", () => ({
  usePermissions: () => ({ can: () => true }),
}));

vi.mock("@/shared/components/components/PageTitle", () => ({
  PageTitle: () => null,
}));

vi.mock("@/shared/components/table/DataTable", () => ({
  DataTable: (props: {
    tableId: string;
    toolbarSearchContent?: React.ReactNode;
    pagination?: { page: number; limit: number; total: number };
  }) => (
    <section data-testid="recurring-data-table" data-table-id={props.tableId}>
      {props.toolbarSearchContent}
      {props.pagination ? (
        <span data-testid="recurring-pagination">
          {props.pagination.page}-{props.pagination.limit}-{props.pagination.total}
        </span>
      ) : null}
    </section>
  ),
}));

vi.mock("@/shared/components/table/search", () => ({
  DataTableSearchBar: ({
    value,
    onChange,
    onSubmitSearch,
    children,
  }: {
    value: string;
    onChange: (value: string) => void;
    onSubmitSearch: () => void;
    children?: React.ReactNode;
  }) => (
    <div data-testid="recurring-search-bar">
      <input
        aria-label="Buscar recurrente"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <button type="button" onClick={onSubmitSearch}>
        Buscar
      </button>
      {children}
    </div>
  ),
  DataTableSearchChips: ({ chips }: { chips: Array<{ label: string }> }) => (
    <div data-testid="recurring-search-chips">
      {chips.map((chip) => (
        <span key={chip.label}>{chip.label}</span>
      ))}
    </div>
  ),
  SmartSearchPanel: ({
    onApplyRule,
  }: {
    onApplyRule: (rule: { field: string; operator: string; values: string[] }) => void;
  }) => (
    <button
      type="button"
      onClick={() => onApplyRule({ field: "status", operator: "in", values: ["ACTIVE"] })}
    >
      Filtrar activas
    </button>
  ),
}));

vi.mock("../components/recurrent/RecurringPurchaseFormModal", () => ({
  RecurringPurchaseFormModal: () => null,
}));

vi.mock("../components/recurrent/RecurringPurchasePaymentModal", () => ({
  RecurringPurchasePaymentModal: () => null,
}));

describe("RecurringPurchasesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listRecurringPurchasesMock.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 25,
    });
    listSuppliersMock.mockResolvedValue({
      items: [{ supplierId: "supplier-1", tradeName: "Proveedor Uno", name: null, lastName: null }],
      total: 1,
      page: 1,
      limit: 100,
    });
  });

  it("uses smart search with 25 pagination and removes the old heading and refresh button", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <RecurringPurchasesPage />
      </MemoryRouter>,
    );

    expect(await screen.findByTestId("recurring-data-table")).toHaveAttribute(
      "data-table-id",
      "recurring-purchases-table",
    );
    expect(screen.getByTestId("recurring-search-bar")).toBeInTheDocument();
    expect(screen.getByTestId("recurring-pagination")).toHaveTextContent("1-25-0");
    expect(screen.queryByRole("heading", { name: "Compras recurrentes" })).not.toBeInTheDocument();
    expect(screen.queryByText("Membresias, servicios y suscripciones que generan cuentas por pagar por periodo.")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Actualizar" })).not.toBeInTheDocument();

    await waitFor(() => {
      expect(listRecurringPurchasesMock).toHaveBeenCalledWith({
        page: 1,
        limit: 25,
        q: undefined,
        filters: undefined,
      });
    });

    await user.type(screen.getByLabelText("Buscar recurrente"), "hosting");
    await user.click(screen.getByRole("button", { name: "Filtrar activas" }));
    await user.click(screen.getByRole("button", { name: "Buscar" }));

    await waitFor(() => {
      expect(listRecurringPurchasesMock).toHaveBeenLastCalledWith({
        page: 1,
        limit: 25,
        q: "hosting",
        filters: [
          {
            field: "status",
            operator: "in",
            mode: "include",
            values: ["ACTIVE"],
          },
        ],
      });
    });
  });
});
