import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
        onRegisterPayment={vi.fn()}
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

  it("adds the register payment action when allowed", async () => {
    const user = userEvent.setup();
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
        onRegisterPayment={vi.fn()}
        permissions={{
          canPause: false,
          canCancel: false,
          canGenerate: false,
          canRegisterPayment: true,
        }}
      />,
    );

    const props = dataTableMock.mock.calls.at(-1)?.[0] as { columns: Array<{ id: string; cell: (row: RecurringPurchase) => React.ReactNode }> };
    const actionsColumn = props.columns.find((column) => column.id === "actions");

    render(<>{actionsColumn?.cell(item)}</>);
    await user.click(screen.getByLabelText("Abrir acciones"));

    expect(screen.getByText("Registrar pago")).toBeInTheDocument();
  });

  it("adds the edit action when allowed", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
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
        onRegisterPayment={vi.fn()}
        onEdit={onEdit}
        permissions={{
          canPause: false,
          canCancel: false,
          canGenerate: false,
          canRegisterPayment: false,
          canEdit: true,
        }}
      />,
    );

    const props = dataTableMock.mock.calls.at(-1)?.[0] as { columns: Array<{ id: string; cell: (row: RecurringPurchase) => React.ReactNode }> };
    const actionsColumn = props.columns.find((column) => column.id === "actions");

    render(<>{actionsColumn?.cell(item)}</>);
    await user.click(screen.getByLabelText("Abrir acciones"));
    await user.click(screen.getByText("Editar"));

    await waitFor(() => expect(onEdit).toHaveBeenCalledWith(item));
  });

  it("hides the edit action when edit permission is missing", async () => {
    const user = userEvent.setup();
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
        onRegisterPayment={vi.fn()}
        permissions={{
          canPause: false,
          canCancel: false,
          canGenerate: false,
          canRegisterPayment: false,
          canEdit: false,
        }}
      />,
    );

    const props = dataTableMock.mock.calls.at(-1)?.[0] as { columns: Array<{ id: string; cell: (row: RecurringPurchase) => React.ReactNode }> };
    const actionsColumn = props.columns.find((column) => column.id === "actions");

    render(<>{actionsColumn?.cell(item)}</>);
    await user.click(screen.getByLabelText("Abrir acciones"));

    expect(screen.queryByText("Editar")).not.toBeInTheDocument();
  });

  it("centers the actions header and popover trigger", () => {
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
        onRegisterPayment={vi.fn()}
      />,
    );

    const props = dataTableMock.mock.calls.at(-1)?.[0] as {
      columns: Array<{ id: string; className?: string; headerClassName?: string }>;
    };
    const actionsColumn = props.columns.find((column) => column.id === "actions");

    expect(actionsColumn).toEqual(
      expect.objectContaining({
        className: expect.stringContaining("text-center"),
        headerClassName: expect.stringContaining("justify-center"),
      }),
    );
  });
});
