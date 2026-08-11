import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { listSkus } from "@/shared/services/skuService";
import { SaleOrderSupplySelect } from "./SaleOrderSupplySelect";

vi.mock("@/shared/services/skuService", () => ({
  listSkus: vi.fn(async () => ({
    items: [{
      sku: {
        id: "supply-sku-1",
        productId: "supply-1",
        backendSku: "SUP-001",
        customSku: "BOLSA-G",
        name: "Bolsa grande",
      },
      attributes: [],
      unit: { id: "unit-1", name: "Unidad", code: "UND" },
    }],
    total: 1,
    page: 1,
    limit: 10,
  })),
}));

vi.mock("@/shared/components/components/FloatingSelect", () => ({
  FloatingSelect: ({ label, disabled, onChange, onSearchChange, options }: any) => (
    <div>
      <input
        aria-label={label}
        disabled={disabled}
        onChange={(event) => onSearchChange?.(event.target.value)}
      />
      {options.map((option: { value: string; label: string }) => (
        <button key={option.value} role="option" onClick={() => onChange(option.value)}>
          {option.label}
        </button>
      ))}
    </div>
  ),
}));

describe("SaleOrderSupplySelect", () => {
  beforeEach(() => vi.clearAllMocks());

  it("searches only the first 10 active supplies and adds the selected result", async () => {
    const onAdd = vi.fn();
    render(<SaleOrderSupplySelect onAdd={onAdd} />);

    fireEvent.change(screen.getByLabelText("Agregar insumo"), {
      target: { value: "bolsa" },
    });

    await waitFor(() =>
      expect(listSkus).toHaveBeenLastCalledWith(
        {
          q: "bolsa",
          productType: "SUPPLY",
          isActive: true,
          page: 1,
          limit: 10,
        },
        { signal: expect.any(AbortSignal) },
      ),
    );

    fireEvent.click(await screen.findByRole("option", { name: "Bolsa grande" }));
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({
      supplySkuId: "supply-sku-1",
      quantity: "1",
      unitId: "unit-1",
    }));
  });
});
