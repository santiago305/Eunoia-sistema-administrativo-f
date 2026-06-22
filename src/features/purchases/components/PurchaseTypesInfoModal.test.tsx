import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  PurchaseTypes,
  purchaseTypeLabels,
} from "@/features/purchases/types/purchase-classification.types";
import { PurchaseTypesInfoModal } from "./PurchaseTypesInfoModal";

describe("PurchaseTypesInfoModal", () => {
  it("renders the seven purchase type explanations", () => {
    render(<PurchaseTypesInfoModal open onClose={vi.fn()} />);

    expect(screen.getByRole("dialog", { name: "Tipos de compra" })).toBeTruthy();
    for (const purchaseType of Object.values(PurchaseTypes)) {
      expect(screen.getByText(purchaseTypeLabels[purchaseType])).toBeTruthy();
    }
    expect(screen.getAllByText(/transforma en productos/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/varios tipos de items/i)).toBeTruthy();
  });
});
