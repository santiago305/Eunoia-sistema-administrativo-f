import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { IncomeBulkPostingActions } from "./IncomeBulkPostingActions";

describe("IncomeBulkPostingActions", () => {
  it("shows only the entry action before selection mode starts", () => {
    render(
      <IncomeBulkPostingActions
        active={false}
        selectedCount={0}
        onStart={vi.fn()}
        onCancel={vi.fn()}
        onPost={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Contabilizar" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Contabilizar pagos" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancelar selección" })).not.toBeInTheDocument();
  });

  it("shows the enabled posting action only after a row is selected", () => {
    const onPost = vi.fn();
    const { rerender } = render(
      <IncomeBulkPostingActions
        active
        selectedCount={0}
        onStart={vi.fn()}
        onCancel={vi.fn()}
        onPost={onPost}
      />,
    );

    expect(screen.getByRole("button", { name: "Contabilizar pagos" })).toBeDisabled();

    rerender(
      <IncomeBulkPostingActions
        active
        selectedCount={2}
        onStart={vi.fn()}
        onCancel={vi.fn()}
        onPost={onPost}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Contabilizar pagos" }));
    expect(onPost).toHaveBeenCalledTimes(1);
  });

  it("keeps the cancel action in the original toolbar slot and clears the mode", () => {
    const onCancel = vi.fn();
    render(
      <IncomeBulkPostingActions
        active
        selectedCount={1}
        onStart={vi.fn()}
        onCancel={onCancel}
        onPost={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancelar selección" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
