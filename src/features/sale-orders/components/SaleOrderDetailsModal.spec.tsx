import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SaleOrderDetailsModal } from "./SaleOrderDetailsModal";

vi.mock("./editor/SaleOrderEditor", () => ({
  SaleOrderEditor: (props: {
    mode: "create" | "edit";
    onDirtyChange?: (dirty: boolean) => void;
    onSaved: (id: string) => void;
  }) => (
    <div>
      <span>editor-{props.mode}</span>
      <button onClick={() => props.onDirtyChange?.(true)}>mark-dirty</button>
      <button onClick={() => props.onSaved("order-1")}>save-order</button>
    </div>
  ),
}));

describe("SaleOrderDetailsModal", () => {
  const Component = SaleOrderDetailsModal as unknown as React.ComponentType<{
    open: boolean;
    mode: "create" | "edit";
    order: null;
    onClose: () => void;
    onSaved: (id: string) => void;
  }>;

  it("uses the same editor for create mode", () => {
    render(
      <Component
        open
        mode="create"
        order={null}
        onClose={() => undefined}
        onSaved={() => undefined}
      />,
    );

    expect(screen.getByText("Nuevo pedido")).toBeInTheDocument();
    expect(screen.getByText("editor-create")).toBeInTheDocument();
  });

  it("uses AlertModal before closing a dirty editor", async () => {
    const onClose = vi.fn();
    render(
      <Component
        open
        mode="create"
        order={null}
        onClose={onClose}
        onSaved={() => undefined}
      />,
    );

    fireEvent.click(screen.getByText("mark-dirty"));
    fireEvent.click(screen.getByLabelText("Cerrar modal"));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText("Cambios sin guardar")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Seguir editando" }));
    await waitFor(() =>
      expect(
        screen.queryByText("Cambios sin guardar"),
      ).not.toBeInTheDocument(),
    );
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText("Cerrar modal"));
    fireEvent.click(screen.getByRole("button", { name: "Cerrar pedido" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("forwards one successful save", () => {
    const onSaved = vi.fn();
    render(
      <Component
        open
        mode="create"
        order={null}
        onClose={() => undefined}
        onSaved={onSaved}
      />,
    );

    fireEvent.click(screen.getByText("save-order"));
    expect(onSaved).toHaveBeenCalledOnce();
    expect(onSaved).toHaveBeenCalledWith("order-1");
  });
});
