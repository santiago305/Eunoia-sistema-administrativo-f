import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RecurringPurchaseFormModal } from "./RecurringPurchaseFormModal";

const modalMock = vi.hoisted(() => vi.fn());
const floatingInputMock = vi.hoisted(() => vi.fn());
const floatingSelectMock = vi.hoisted(() => vi.fn());
const floatingTextareaMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/components/modales/Modal", () => ({
  Modal: ({ children, open, title }: { children: React.ReactNode; open: boolean; title?: string }) => {
    modalMock({ open, title });
    return open ? (
      <section data-testid="shared-modal" aria-label={title}>
        {children}
      </section>
    ) : null;
  },
}));

vi.mock("@/shared/components/components/FloatingInput", () => ({
  FloatingInput: (props: unknown) => {
    floatingInputMock(props);
    return <input aria-label={(props as { label: string }).label} />;
  },
}));

vi.mock("@/shared/components/components/FloatingSelect", () => ({
  FloatingSelect: (props: unknown) => {
    floatingSelectMock(props);
    return <button type="button">{(props as { label: string }).label}</button>;
  },
}));

vi.mock("@/shared/components/components/FloatingTextarea", () => ({
  FloatingTextarea: (props: unknown) => {
    floatingTextareaMock(props);
    return <textarea aria-label={(props as { label: string }).label} />;
  },
}));

describe("RecurringPurchaseFormModal", () => {
  it("uses the shared modal and floating form controls", () => {
    render(
      <RecurringPurchaseFormModal
        open
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByTestId("shared-modal")).toBeInTheDocument();
    expect(modalMock).toHaveBeenCalledWith(
      expect.objectContaining({ open: true, title: "Nueva compra recurrente" }),
    );
    expect(floatingInputMock).toHaveBeenCalledWith(expect.objectContaining({ name: "supplierId" }));
    expect(floatingSelectMock).toHaveBeenCalledWith(expect.objectContaining({ name: "frequency" }));
    expect(floatingTextareaMock).toHaveBeenCalledWith(expect.objectContaining({ name: "description" }));
  });
});
