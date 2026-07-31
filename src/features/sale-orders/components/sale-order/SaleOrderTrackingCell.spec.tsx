import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SaleOrderTrackingCell } from "./SaleOrderTrackingCell";

const order = { preguide: false, prepared: false } as any;
describe("SaleOrderTrackingCell", () => {
  it("shows only controls for granted tracking permissions", () => {
    render(<SaleOrderTrackingCell order={order} canUpdatePreguide canUpdatePrepared={false} onChange={vi.fn()} />);
    expect(screen.getByLabelText("Tiene preguía")).toBeInTheDocument();
    expect(screen.queryByLabelText("Está preparado")).toBeNull();
  });
});
