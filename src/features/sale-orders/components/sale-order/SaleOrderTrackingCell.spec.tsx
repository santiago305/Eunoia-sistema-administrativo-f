import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SaleOrderTrackingCell } from "./SaleOrderTrackingCell";

describe("SaleOrderTrackingCell", () => {
  it("renders workflow results as read-only status tags", () => {
    render(
      <SaleOrderTrackingCell
        order={{
          preguide: false,
          prepared: true,
          trackingCapabilities: { invoice: true, preguide: true, prepared: true },
        }}
      />,
    );

    expect(screen.getByText("Sin preguía")).toBeInTheDocument();
    expect(screen.getByText("Preparado")).toBeInTheDocument();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("keeps compact table styling without interactive affordances", () => {
    render(
      <SaleOrderTrackingCell
        order={{
          preguide: true,
          prepared: false,
          trackingCapabilities: { invoice: true, preguide: true, prepared: true },
        }}
      />,
    );

    const preguide = screen.getByText("Con preguía");
    const prepared = screen.getByText("Sin preparar");

    expect(preguide).toHaveClass("rounded-sm", "px-1.5", "py-0.5", "text-[9px]", "font-medium");
    expect(prepared).toHaveClass("rounded-sm", "px-1.5", "py-0.5", "text-[9px]", "font-medium");
  });

  it("renders preguide and preparation independently from workflow capabilities", () => {
    render(
      <SaleOrderTrackingCell
        order={{
          preguide: true,
          prepared: false,
          trackingCapabilities: { invoice: false, preguide: true, prepared: false },
        }}
      />,
    );

    expect(screen.getByText("Con preguía")).toBeInTheDocument();
    expect(screen.queryByText("Sin preparar")).not.toBeInTheDocument();
  });

  it("hides optional tracking tags when capabilities are missing", () => {
    render(
      <SaleOrderTrackingCell order={{ preguide: false, prepared: false }} />,
    );

    expect(screen.queryByText("Sin preguía")).not.toBeInTheDocument();
    expect(screen.queryByText("Sin preparar")).not.toBeInTheDocument();
  });
});
