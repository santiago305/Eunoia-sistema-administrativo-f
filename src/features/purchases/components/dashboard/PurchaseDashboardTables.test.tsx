import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UpcomingPaymentsTable } from "./UpcomingPaymentsTable";
import { OverduePaymentsTable } from "./OverduePaymentsTable";
import { PurchaseDashboardRankingTable } from "./PurchaseDashboardRankingTable";

const dataTableCalls: Array<{ tableId: string; data: unknown[]; columns: Array<{ header: string }> }> = [];

vi.mock("@/shared/components/table/DataTable", () => ({
  DataTable: (props: { tableId: string; data: unknown[]; columns: Array<{ header: string }>; emptyMessage?: string }) => {
    dataTableCalls.push(props);
    return <div data-testid={`datatable-${props.tableId}`}>{props.emptyMessage}</div>;
  },
}));

describe("dashboard purchase tables", () => {
  it("renders upcoming payments with the shared DataTable", () => {
    dataTableCalls.length = 0;

    render(
      <UpcomingPaymentsTable
        title="Próximos pagos"
        limit={20}
        rows={[
          {
            accountPayableId: "payable-1",
            purchaseId: "purchase-1",
            supplierId: "supplier-1",
            supplierName: "Proveedor Norte",
            dueDate: "2026-07-10",
            amountPending: 120,
            currency: "PEN",
            status: "PENDING",
          },
        ]}
      />,
    );

    expect(screen.getByTestId("datatable-purchase-dashboard-payments-proximos-pagos")).toBeInTheDocument();
    expect(screen.getByText("Mostrando top 20")).toBeInTheDocument();
    expect(dataTableCalls[0].columns.map((column) => column.header)).toEqual(["Proveedor", "Vence", "Estado", "Pendiente"]);
    expect(dataTableCalls[0].data).toHaveLength(1);
  });

  it("renders ranking rows with the shared DataTable", () => {
    dataTableCalls.length = 0;

    render(
      <PurchaseDashboardRankingTable
        title="Top ítems"
        tableId="purchase-dashboard-top-items"
        limit={50}
        rows={[
          { id: "item-1", item: "Jabón de cúrcuma", type: "Materia prima", total: "S/ 120.00" },
        ]}
      />,
    );

    expect(screen.getByTestId("datatable-purchase-dashboard-top-items")).toBeInTheDocument();
    expect(screen.getByText("Mostrando top 50")).toBeInTheDocument();
    expect(dataTableCalls[0].columns.map((column) => column.header)).toEqual(["Item", "Tipo", "Total"]);
    expect(dataTableCalls[0].data).toHaveLength(1);
  });

  it("keeps visible payment columns and empty text for overdue payments", () => {
    dataTableCalls.length = 0;

    render(<OverduePaymentsTable rows={[]} />);

    expect(screen.getByTestId("datatable-purchase-dashboard-payments-pagos-vencidos")).toHaveTextContent(
      "Sin cuentas para mostrar.",
    );
    expect(dataTableCalls[0].columns.map((column) => column.header)).toEqual(["Proveedor", "Vence", "Estado", "Pendiente"]);
    expect(dataTableCalls[0].data).toHaveLength(0);
  });

  it("keeps visible ranking columns and empty text", () => {
    dataTableCalls.length = 0;

    render(
      <PurchaseDashboardRankingTable
        title="Top proveedores"
        tableId="purchase-dashboard-top-suppliers"
        rows={[]}
        headers={["Proveedor", "Compras", "Total"]}
      />,
    );

    expect(screen.getByTestId("datatable-purchase-dashboard-top-suppliers")).toHaveTextContent(
      "Sin datos para mostrar.",
    );
    expect(dataTableCalls[0].columns.map((column) => column.header)).toEqual(["Proveedor", "Compras", "Total"]);
    expect(dataTableCalls[0].data).toHaveLength(0);
  });
});
