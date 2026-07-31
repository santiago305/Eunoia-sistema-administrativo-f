import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SaleOrderImportLotesModal } from "./SaleOrderImportLotesModal";

const { listLotesMock, setActiveMock, listAuditMock } = vi.hoisted(() => ({
  listLotesMock: vi.fn(),
  setActiveMock: vi.fn(),
  listAuditMock: vi.fn(),
}));

vi.mock("@/shared/services/saleOrderService", () => ({
  listSaleOrderImportLotes: listLotesMock,
  setSaleOrderImportLoteActive: setActiveMock,
  listSaleOrderImportLoteAudit: listAuditMock,
}));

vi.mock("@/shared/components/modales/Modal", () => ({
  Modal: ({ open, title, children }: { open: boolean; title?: string; children: React.ReactNode }) =>
    open ? (
      <section>
        {title ? <h1>{title}</h1> : null}
        {children}
      </section>
    ) : null,
}));

vi.mock("@/shared/components/components/SystemButton", () => ({
  SystemButton: ({
    children,
    leftIcon,
    rightIcon,
    tooltip,
    loading,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    tooltip?: string;
    loading?: boolean;
  }) => (
    <button type="button" aria-label={tooltip} disabled={props.disabled || loading} {...props}>
      {leftIcon}
      {children}
      {rightIcon}
    </button>
  ),
}));

vi.mock("@/shared/components/components/AlertModal", () => ({
  AlertModal: ({
    open,
    title,
    message,
    confirmText,
    onConfirm,
  }: {
    open: boolean;
    title?: string;
    message?: string;
    confirmText?: string;
    onConfirm: () => void;
  }) =>
    open ? (
      <section role="alertdialog">
        {title ? <h2>{title}</h2> : null}
        {message ? <p>{message}</p> : null}
        <button type="button" onClick={onConfirm}>{confirmText ?? "Confirmar"}</button>
      </section>
    ) : null,
}));

vi.mock("@/shared/components/table/DataTable", () => ({
  DataTable: ({
    data,
    columns,
    emptyMessage,
    tableId,
  }: {
    data: Record<string, unknown>[];
    columns: Array<{
      id: string;
      header: string;
      accessorKey?: string;
      cell?: (row: Record<string, unknown>, index: number) => React.ReactNode;
    }>;
    emptyMessage?: string;
    tableId: string;
  }) => (
    <table data-testid={tableId}>
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column.id}>{column.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.length ? (
          data.map((row, index) => (
            <tr key={String(row.id ?? index)}>
              {columns.map((column) => (
                <td key={column.id}>
                  {column.cell
                    ? column.cell(row, index)
                    : String(row[column.accessorKey ?? column.id] ?? "")}
                </td>
              ))}
            </tr>
          ))
        ) : (
          <tr>
            <td>{emptyMessage}</td>
          </tr>
        )}
      </tbody>
    </table>
  ),
}));

describe("SaleOrderImportLotesModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listLotesMock.mockResolvedValue([
      {
        id: "lote-1",
        lote: 5,
        createdAt: "2026-07-30T10:00:00.000Z",
        createdBy: { id: "user-1", name: "Ana", email: "ana@example.test" },
        isActive: true,
      },
    ]);
    setActiveMock.mockResolvedValue({
      id: "lote-1",
      lote: 5,
      createdAt: "2026-07-30T10:00:00.000Z",
      createdBy: { id: "user-1", name: "Ana", email: "ana@example.test" },
      isActive: false,
    });
    listAuditMock.mockResolvedValue([]);
  });

  it("asks confirmation before toggling an active lote to inactive", async () => {
    const onChanged = vi.fn();
    render(
      <SaleOrderImportLotesModal
        open
        onClose={vi.fn()}
        onChanged={onChanged}
      />,
    );

    expect(await screen.findByText("5")).toBeInTheDocument();
    expect(screen.getByTestId("sale-order-import-lotes-table")).toBeInTheDocument();
    expect(screen.getByText("ana@example.test")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Eliminar lote" }));

    expect(setActiveMock).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toHaveTextContent("Eliminar lote");
    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));

    await waitFor(() => {
      expect(setActiveMock).toHaveBeenCalledWith("lote-1", false);
    });
    expect(onChanged).toHaveBeenCalledWith(expect.objectContaining({ id: "lote-1", isActive: false }));
  });

  it("renders lote audit history with the shared data table", async () => {
    listAuditMock.mockResolvedValue([
      {
        id: "audit-1",
        loteId: "lote-1",
        createdAt: "2026-07-30T11:00:00.000Z",
        executedBy: { id: "user-2", name: "Luis", email: "luis@example.test" },
        actionExecution: "delete",
      },
    ]);

    render(
      <SaleOrderImportLotesModal
        open
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Historial" }));

    expect(await screen.findByTestId("sale-order-import-lote-audit-table")).toBeInTheDocument();
    expect(screen.getByText("luis@example.test")).toBeInTheDocument();
    expect(screen.getByText("Eliminar")).toBeInTheDocument();
  });
});
