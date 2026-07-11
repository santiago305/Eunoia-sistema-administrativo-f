import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RecurringPurchaseTypesInfoModal } from "./RecurringPurchaseTypesInfoModal";

vi.mock("@/shared/components/modales/Modal", () => ({
  Modal: ({
    children,
    open,
    title,
  }: {
    children: React.ReactNode;
    open: boolean;
    title?: string;
  }) => (open ? <section aria-label={title}>{children}</section> : null),
}));

describe("RecurringPurchaseTypesInfoModal", () => {
  it("shows only the recurring purchase type explanations", () => {
    render(<RecurringPurchaseTypesInfoModal open onClose={vi.fn()} />);

    expect(screen.getByRole("region", { name: "Tipos recurrentes" })).toBeInTheDocument();
    expect(screen.getByText("Suscripción")).toBeInTheDocument();
    expect(screen.getByText("Servicio")).toBeInTheDocument();
    expect(screen.getByText("Pago recurrente o licencia.")).toBeInTheDocument();
    expect(screen.getByText("Trabajo o atencion contratada.")).toBeInTheDocument();
    expect(screen.queryByText("Inventario")).not.toBeInTheDocument();
    expect(screen.queryByText("Activo fijo")).not.toBeInTheDocument();
  });
});
