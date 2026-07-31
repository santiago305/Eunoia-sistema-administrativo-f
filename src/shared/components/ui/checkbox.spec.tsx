import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Checkbox } from "./checkbox";

vi.mock("./tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

describe("Checkbox", () => {
  it("renders without tooltip by default", () => {
    render(<Checkbox aria-label="Seleccionar" />);

    expect(screen.getByRole("checkbox", { name: "Seleccionar" })).toBeInTheDocument();
    expect(screen.queryByText("Ver eliminados")).not.toBeInTheDocument();
  });

  it("renders tooltip content when provided", () => {
    render(<Checkbox aria-label="Eliminados" tooltip="Ver eliminados" />);

    expect(screen.getByRole("checkbox", { name: "Eliminados" })).toBeInTheDocument();
    expect(screen.getByText("Ver eliminados")).toBeInTheDocument();
  });
});
