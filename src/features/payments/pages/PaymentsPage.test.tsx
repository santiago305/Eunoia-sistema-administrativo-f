import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Payments from "../Payments";

const {
  approvePaymentMock,
  createPaymentMock,
  deletePaymentSearchMetricMock,
  deletePaymentExportPresetMock,
  exportPaymentsExcelMock,
  getPaymentExportColumnsMock,
  getPaymentExportPresetsMock,
  getPaymentSearchStateMock,
  listPaymentsMock,
  rejectPaymentMock,
  removePaymentMock,
  savePaymentExportPresetMock,
  savePaymentSearchMetricMock,
} = vi.hoisted(() => ({
  approvePaymentMock: vi.fn(),
  createPaymentMock: vi.fn(),
  deletePaymentSearchMetricMock: vi.fn(),
  deletePaymentExportPresetMock: vi.fn(),
  exportPaymentsExcelMock: vi.fn(),
  getPaymentExportColumnsMock: vi.fn(),
  getPaymentExportPresetsMock: vi.fn(),
  getPaymentSearchStateMock: vi.fn(),
  listPaymentsMock: vi.fn(),
  rejectPaymentMock: vi.fn(),
  removePaymentMock: vi.fn(),
  savePaymentExportPresetMock: vi.fn(),
  savePaymentSearchMetricMock: vi.fn(),
}));

vi.mock("@/shared/services/paymentService", () => ({
  approvePayment: approvePaymentMock,
  createPayment: createPaymentMock,
  deletePaymentSearchMetric: deletePaymentSearchMetricMock,
  deletePaymentExportPreset: deletePaymentExportPresetMock,
  exportPaymentsExcel: exportPaymentsExcelMock,
  getPaymentExportColumns: getPaymentExportColumnsMock,
  getPaymentExportPresets: getPaymentExportPresetsMock,
  getPaymentSearchState: getPaymentSearchStateMock,
  listPayments: listPaymentsMock,
  rejectPayment: rejectPaymentMock,
  removePayment: removePaymentMock,
  savePaymentExportPreset: savePaymentExportPresetMock,
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

vi.mock("@/shared/components/components/ExportPopover", () => ({
  ExportPopover: ({
    columns,
    presets,
    onExport,
  }: {
    columns: Array<{ key: string; label: string }>;
    presets: Array<{ name: string }>;
    onExport: (columns: Array<{ key: string; label: string }>) => void;
  }) => (
    <div data-testid="payments-export-popover">
      <span data-testid="payments-export-columns">{columns.map((column) => column.label).join(",")}</span>
      <span data-testid="payments-export-presets">{presets.map((preset) => preset.name).join(",")}</span>
      <button type="button" onClick={() => onExport(columns)}>
        Exportar pagos
      </button>
    </div>
  ),
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
    getPaymentExportColumnsMock.mockResolvedValue([
      { key: "status", label: "Estado" },
      { key: "amount", label: "Monto" },
    ]);
    getPaymentExportPresetsMock.mockResolvedValue([
      { metricId: "preset-1", name: "Basico", snapshot: { columns: [{ key: "status", label: "Estado" }] } },
    ]);
    exportPaymentsExcelMock.mockResolvedValue({
      blob: new Blob(["excel"]),
      filename: "pagos-2026-07-13.xlsx",
    });
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
    expect(screen.getByTestId("payments-export-popover")).toBeInTheDocument();
    expect(screen.getByTestId("payments-export-columns")).toHaveTextContent("Estado,Monto");
    expect(screen.getByTestId("payments-export-presets")).toHaveTextContent("Basico");

    await waitFor(() => {
      expect(getPaymentSearchStateMock).toHaveBeenCalledTimes(1);
      expect(getPaymentExportColumnsMock).toHaveBeenCalledTimes(1);
      expect(getPaymentExportPresetsMock).toHaveBeenCalledTimes(1);
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

  it("exports payments with the executed smart filters", async () => {
    render(<Payments />);

    fireEvent.click(await screen.findByRole("button", { name: "Exportar pagos" }));

    await waitFor(() => {
      expect(exportPaymentsExcelMock).toHaveBeenCalledWith({
        columns: [
          { key: "status", label: "Estado" },
          { key: "amount", label: "Monto" },
        ],
        q: undefined,
        filters: [],
      });
    });
  });
});
