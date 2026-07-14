import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AgencyFormModal } from "./AgencyFormModal";

vi.mock("@/shared/components/modales/Modal", () => ({
  Modal: ({
    children,
    footer,
    open,
    title,
  }: {
    children: React.ReactNode;
    footer?: React.ReactNode;
    open: boolean;
    title?: string;
  }) =>
    open ? (
      <section role="dialog" aria-label={title}>
        {children}
        {footer}
      </section>
    ) : null,
}));

vi.mock("@/shared/components/components/UbigeoSelectSection", () => ({
  UbigeoSelectSection: () => <div data-testid="ubigeo-select-section" />,
}));

vi.mock("@/shared/components/components/SystemButton", () => ({
  SystemButton: ({
    children,
    loading: _loading,
    leftIcon,
    size: _size,
    tooltip: _tooltip,
    variant: _variant,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    leftIcon?: React.ReactNode;
    loading?: boolean;
    size?: string;
    tooltip?: string;
    variant?: string;
  }) => (
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
  }: {
    data: Array<Record<string, unknown>>;
    columns: Array<{
      id: string;
      header: string;
      cell: (row: Record<string, unknown>) => React.ReactNode;
    }>;
  }) => (
    <table>
      <tbody>
        {data.map((row) => (
          <tr key={String(row.rowId)}>
            {columns.map((column) => (
              <td key={column.id}>{column.cell(row)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  ),
}));

describe("AgencyFormModal", () => {
  it("autofills the first subsidiary alias from the agency name until the alias is edited", async () => {
    const user = userEvent.setup();

    render(
      <AgencyFormModal
        open
        mode="create"
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    const nameInput = screen.getByLabelText("Nombre");
    const aliasInput = screen.getByLabelText("Alias");

    await user.type(nameInput, "Olva");

    await waitFor(() => {
      expect(aliasInput).toHaveValue("Olva");
    });

    await user.clear(aliasInput);
    await user.type(aliasInput, "Principal");
    await user.clear(nameInput);
    await user.type(nameInput, "Olva Courier");

    await waitFor(() => {
      expect(aliasInput).toHaveValue("Principal");
    });
  });
});
