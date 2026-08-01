import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SaleOrderBulkActionsBar } from "./SaleOrderBulkActionsBar";

vi.mock("@/shared/components/components/SystemButton", () => ({
  SystemButton: ({
    children,
    leftIcon,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { leftIcon?: React.ReactNode }) => (
    <button type="button" {...props}>
      {leftIcon}
      {children}
    </button>
  ),
}));

describe("SaleOrderBulkActionsBar", () => {
  it("shows delete action in active mode", () => {
    const onOpenToggleActive = vi.fn();

    render(
      <SaleOrderBulkActionsBar
        selectedCount={2}
        onOpenAssign={vi.fn()}
        onOpenChangeState={vi.fn()}
        onOpenToggleActive={onOpenToggleActive}
        onClearSelection={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Eliminar pedidos" }));

    expect(screen.getByText("2 pedido(s) seleccionado(s)")).toBeInTheDocument();
    expect(onOpenToggleActive).toHaveBeenCalledTimes(1);
  });

  it("shows restore action in deleted mode", () => {
    render(
      <SaleOrderBulkActionsBar
        selectedCount={1}
        restoreMode
        onOpenAssign={vi.fn()}
        onOpenChangeState={vi.fn()}
        onOpenToggleActive={vi.fn()}
        onClearSelection={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Restaurar pedidos" })).toBeInTheDocument();
  });

  it("does not expose a separate tracking action", () => {
    render(
      <SaleOrderBulkActionsBar
        selectedCount={1}
        onOpenAssign={vi.fn()}
        onOpenChangeState={vi.fn()}
        onOpenToggleActive={vi.fn()}
        onClearSelection={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: "Seguimiento" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cambiar estado" })).toBeInTheDocument();
  });
});
