import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SaleOrder } from "@/features/sale-orders/types/saleOrder";
import { SaleOrderAuditHistoryModal } from "./SaleOrderAuditHistoryModal";

const { listAuditMock } = vi.hoisted(() => ({
  listAuditMock: vi.fn(),
}));

vi.mock("@/shared/services/saleOrderService", () => ({
  listSaleOrderAudit: listAuditMock,
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
  SystemButton: ({ children, leftIcon, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { leftIcon?: React.ReactNode }) => (
    <button type="button" {...props}>
      {leftIcon}
      {children}
    </button>
  ),
}));

vi.mock("@/shared/components/table/DataTable", () => ({
  DataTable: ({
    data,
    columns,
    tableId,
  }: {
    data: Record<string, unknown>[];
    columns: Array<{ id: string; header: string; cell?: (row: Record<string, unknown>) => React.ReactNode }>;
    tableId: string;
  }) => (
    <table data-testid={tableId}>
      <tbody>
        {data.map((row) => (
          <tr key={String(row.id)}>
            {columns.map((column) => (
              <td key={column.id}>{column.cell ? column.cell(row) : String(row[column.id] ?? "")}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  ),
}));

const order = {
  id: "order-1",
  serie: "F001",
  correlative: 12,
} as SaleOrder;

describe("SaleOrderAuditHistoryModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listAuditMock.mockResolvedValue([
      {
        id: "audit-1",
        saleOrderId: "order-1",
        createdAt: "2026-07-31T10:00:00.000Z",
        executedBy: { id: "user-1", name: "Admin", email: "admin@example.test" },
        actionExecution: "delete",
      },
    ]);
  });

  it("loads and renders sale order audit rows", async () => {
    render(<SaleOrderAuditHistoryModal open order={order} onClose={vi.fn()} />);

    expect(await screen.findByTestId("sale-order-audit-table")).toBeInTheDocument();
    expect(listAuditMock).toHaveBeenCalledWith("order-1");
    expect(screen.getByText("Auditoria pedido F001-12")).toBeInTheDocument();
    expect(screen.getByText("admin@example.test")).toBeInTheDocument();
    expect(screen.getByText("Eliminar")).toBeInTheDocument();
  });
});
