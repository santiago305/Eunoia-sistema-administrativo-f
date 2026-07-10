import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PageShell } from "./PageShell";

describe("PageShell", () => {
  it("constrains default page content to the app max width", () => {
    const { container } = render(<PageShell>Contenido</PageShell>);

    const content = container.querySelector("main > div");

    expect(content).toHaveClass("w-full");
    expect(content).toHaveClass("max-w-[1600px]");
  });

  it("allows pages to opt out of the default max width", () => {
    const { container } = render(<PageShell contentClassName="max-w-none">Detalle ancho</PageShell>);

    expect(screen.getByText("Detalle ancho")).toBeInTheDocument();
    const content = container.querySelector("main > div");

    expect(content).toHaveClass("max-w-none");
  });
});
