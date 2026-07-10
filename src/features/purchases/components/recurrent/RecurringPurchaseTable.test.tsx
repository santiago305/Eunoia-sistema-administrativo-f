import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RecurringPurchaseTable } from "./RecurringPurchaseTable";
import type { RecurringPurchase } from "../../types/recurring-purchase.types";

const dataTableMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/components/table/DataTable", () => ({
  DataTable: (props: unknown) => {
    dataTableMock(props);
    return <div data-testid="shared-data-table" />;
  },
}));

const item: RecurringPurchase = {
  recurringPurchaseTemplateId: "rec-1",
  supplierId: "supplier-1",
  name: "Hosting mensual",
  description: "Servidor principal",
  frequency: "MONTHLY",
  purchaseType: "SUBSCRIPTION",
  currency: "PEN",
  amount: 150,
  startDate: "2026-07-01",
  nextDueDate: "2026-08-01",
  status: "ACTIVE",
  reminderDaysBefore: [],
};

describe("RecurringPurchaseTable", () => {
  it("renders recurrent purchases through the shared DataTable component", () => {
    render(
      <RecurringPurchaseTable
        items={[item]}
        loading={false}
        page={1}
        limit={20}
        total={1}
        onPageChange={vi.fn()}
        onPause={vi.fn()}
        onResume={vi.fn()}
        onCancel={vi.fn()}
        onGenerate={vi.fn()}
      />,
    );

    expect(screen.getByTestId("shared-data-table")).toBeInTheDocument();
    expect(dataTableMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tableId: "recurring-purchases-table",
        data: [item],
        rowKey: "recurringPurchaseTemplateId",
        selectableColumns: true,
        pagination: { page: 1, limit: 20, total: 1 },
      }),
    );
  });
});
