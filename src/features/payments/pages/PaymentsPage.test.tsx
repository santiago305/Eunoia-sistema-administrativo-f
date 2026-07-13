import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Payments from "../Payments";

const {
  approvePaymentMock,
  createPaymentMock,
  deletePaymentSearchMetricMock,
  getPaymentSearchStateMock,
  listPaymentsMock,
  rejectPaymentMock,
  removePaymentMock,
  savePaymentSearchMetricMock,
} = vi.hoisted(() => ({
  approvePaymentMock: vi.fn(),
  createPaymentMock: vi.fn(),
  deletePaymentSearchMetricMock: vi.fn(),
  getPaymentSearchStateMock: vi.fn(),
  listPaymentsMock: vi.fn(),
  rejectPaymentMock: vi.fn(),
  removePaymentMock: vi.fn(),
  savePaymentSearchMetricMock: vi.fn(),
}));

vi.mock("@/shared/services/paymentService", () => ({
  approvePayment: approvePaymentMock,
  createPayment: createPaymentMock,
  deletePaymentSearchMetric: deletePaymentSearchMetricMock,
  getPaymentSearchState: getPaymentSearchStateMock,
  listPayments: listPaymentsMock,
  rejectPayment: rejectPaymentMock,
  removePayment: removePaymentMock,
  savePaymentSearchMetric: savePaymentSearchMetricMock,
}));

vi.mock("@/shared/hooks/usePermissions", () => ({
  usePermissions: () => ({ can: () => true }),
}));

vi.mock("@/shared/hooks/useFeedbackToast", () => ({
  useFeedbackToast: () => ({ showFeedback: vi.fn() }),
}));

vi.mock("@/shared/layouts/PageShell", () => ({
  PageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/shared/components/table/DataTable", () => ({
  DataTable: (props: {
    tableId: string;
    data?: Array<Record<string, unknown>>;
    columns?: Array<{
      id: string;
      cell?: (row: Record<string, unknown>, index: number) => React.ReactNode;
    }>;
    selectableColumns?: boolean;
    toolbarSearchContent?: React.ReactNode;
    pagination?: { page: number; limit: number; total: number };
  }) => (
    <section data-testid="payments-data-table" data-table-id={props.tableId}>
      {props.selectableColumns ? <span data-testid="selectable-columns" /> : null}
      {props.pagination ? (
        <span data-testid="table-pagination">
          {props.pagination.page}-{props.pagination.limit}-{props.pagination.total}
        </span>
      ) : null}
      {props.toolbarSearchContent}
      {(props.data ?? []).map((row, rowIndex) => (
        <div key={String(row.payDocId ?? rowIndex)}>
          {(props.columns ?? []).map((column) => (
            <div key={column.id}>{column.cell?.(row, rowIndex)}</div>
          ))}
        </div>
      ))}
    </section>
  ),
}));

vi.mock("@/shared/components/components/ActionsPopover", () => ({
  ActionsPopover: ({ actions }: { actions: Array<{ id: string; label: string; hidden?: boolean; onClick?: () => void }> }) => (
    <div data-testid="payment-actions-popover">
      {actions.filter((action) => !action.hidden).map((action) => (
        <button key={action.id} type="button" onClick={action.onClick}>
          {action.label}
        </button>
      ))}
    </div>
  ),
}));

vi.mock("@/shared/components/table/search", () => ({
  DataTableSearchBar: ({
    children,
    onSubmitSearch,
  }: {
    children?: React.ReactNode;
    onSubmitSearch?: () => void;
  }) => (
    <div data-testid="payments-search-bar">
      <button type="button" onClick={onSubmitSearch}>
        Ejecutar busqueda
      </button>
      {children}
    </div>
  ),
  DataTableSearchChips: () => <div data-testid="payments-search-chips" />,
}));

vi.mock("../components/PaymentSmartSearchPanel", () => ({
  PaymentSmartSearchPanel: () => <div data-testid="payments-smart-search-panel" />,
}));

vi.mock("../components/PaymentFormModal", () => ({
  PaymentFormModal: ({
    open,
    mode,
    onSaved,
  }: {
    open: boolean;
    mode: "create" | "schedule";
    onSaved: () => void;
  }) =>
    open ? (
      <div data-testid={`payment-form-modal-${mode}`}>
        <button type="button" onClick={onSaved}>
          Guardar modal
        </button>
      </div>
    ) : null,
}));

vi.mock("../components/RejectPaymentModal", () => ({
  RejectPaymentModal: ({
    open,
    onConfirm,
  }: {
    open: boolean;
    onConfirm: (reason: string) => void;
  }) =>
    open ? (
      <div data-testid="reject-payment-modal">
        <button type="button" onClick={() => onConfirm("Documento duplicado")}>
          Confirmar rechazo
        </button>
      </div>
    ) : null,
}));

vi.mock("../components/PaymentEvidenceModal", () => ({
  PaymentEvidenceModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="payment-evidence-modal" /> : null,
}));

vi.mock("../components/PaymentDetailModal", () => ({
  PaymentDetailModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="payment-detail-modal" /> : null,
}));

describe("PaymentsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listPaymentsMock.mockResolvedValue({
      items: [
        {
          payDocId: "payment-1",
          poId: "purchase-1",
          method: "Transferencia",
          date: "2026-07-13T10:00:00.000Z",
          currency: "PEN",
          amount: 120,
          status: "PENDING_APPROVAL",
          companyPaymentAccountMaskedLabel: "BCP **** 1234",
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    });
    getPaymentSearchStateMock.mockResolvedValue({
      recent: [],
      saved: [],
      catalogs: {
        statuses: [],
        currencies: [],
        documentTypes: [],
        evidenceStates: [],
        paymentMethods: [],
        companyPaymentAccounts: [],
      },
    });
    approvePaymentMock.mockResolvedValue({ type: "success", message: "Pago aprobado." });
    rejectPaymentMock.mockResolvedValue({ type: "success", message: "Pago rechazado." });
    removePaymentMock.mockResolvedValue({ type: "success", message: "Pago eliminado." });
    savePaymentSearchMetricMock.mockResolvedValue({ type: "success", message: "Metrica guardada." });
    deletePaymentSearchMetricMock.mockResolvedValue({ type: "success", message: "Metrica eliminada." });
  });

  it("renders the redesigned payments page with smart search, selectable table and KPI strip", async () => {
    render(<Payments />);

    expect(await screen.findByTestId("payments-data-table")).toHaveAttribute("data-table-id", "payments-table");
    expect(screen.getByTestId("payments-search-bar")).toBeInTheDocument();
    expect(screen.getByTestId("payments-search-chips")).toBeInTheDocument();
    expect(screen.getByTestId("payments-smart-search-panel")).toBeInTheDocument();
    expect(screen.getByTestId("selectable-columns")).toBeInTheDocument();
    expect(screen.getByText("Por aprobar")).toBeInTheDocument();
    expect(screen.getAllByText("S/ 120.00").length).toBeGreaterThan(0);
    expect(screen.getByText("BCP **** 1234")).toBeInTheDocument();
    expect(screen.getByTestId("payment-actions-popover")).toBeInTheDocument();

    await waitFor(() => {
      expect(getPaymentSearchStateMock).toHaveBeenCalledTimes(1);
      expect(listPaymentsMock).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        q: undefined,
        filters: undefined,
      });
    });
  });

  it("rejects a payment from the actions menu using a reason modal", async () => {
    const promptSpy = vi.spyOn(window, "prompt");

    render(<Payments />);

    fireEvent.click(await screen.findByRole("button", { name: "Rechazar" }));
    expect(screen.getByTestId("reject-payment-modal")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Confirmar rechazo" }));

    await waitFor(() => {
      expect(rejectPaymentMock).toHaveBeenCalledWith("payment-1", "Documento duplicado");
    });
    expect(promptSpy).not.toHaveBeenCalled();

    promptSpy.mockRestore();
  });
});
