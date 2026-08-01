import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SaleOrderDirectSkuSelect } from "./SaleOrderDirectSkuSelect";
import { listSkus } from "@/shared/services/skuService";

vi.mock("@/shared/services/skuService", () => ({
  listSkus: vi.fn(async () => ({
    items: [
      {
        sku: {
          id: "sku-1",
          productId: "product-1",
          backendSku: "10017",
          customSku: "EVA01893",
          name: "JABON AZUFRE",
          image: "/uploads/sku.webp",
          price: 12.5,
        },
        attributes: [
          { code: "presentation", name: "Presentacion", value: "AZUFRE" },
        ],
        unit: { id: "unit-1", name: "Unidad", code: "UND" },
      },
    ],
    total: 1,
    page: 1,
    limit: 10,
  })),
}));

vi.mock("@/shared/components/components/FloatingSelect", () => ({
  FloatingSelect: ({
    label,
    disabled,
    emptyMessage,
    onChange,
    onSearchChange,
    options,
  }: {
    label: string;
    disabled?: boolean;
    emptyMessage?: string;
    onChange: (value: string) => void;
    onSearchChange?: (value: string) => void;
    options: Array<{ value: string; label: string }>;
  }) => (
    <div>
      <input
        aria-label={label}
        disabled={disabled}
        onChange={(event) => onSearchChange?.(event.target.value)}
      />
      <span>{emptyMessage}</span>
      {options.map((option) => (
        <button
          type="button"
          role="option"
          key={option.value}
          disabled={disabled}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  ),
}));

describe("SaleOrderDirectSkuSelect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("searches active product SKUs and emits a sale order item", async () => {
    const onAddItem = vi.fn();

    render(<SaleOrderDirectSkuSelect disabled={false} onAddItem={onAddItem} />);

    fireEvent.change(screen.getByLabelText("Producto"), {
      target: { value: "azufre" },
    });

    await waitFor(() =>
      expect(listSkus).toHaveBeenCalledWith({
        q: "azufre",
        productType: "PRODUCT",
        isActive: true,
        page: 1,
        limit: 10,
      }),
    );

    fireEvent.click(
      await screen.findByRole("option", {
        name: "JABON AZUFRE AZUFRE -10017 (EVA01893)",
      }),
    );

    expect(onAddItem).toHaveBeenCalledTimes(1);
    expect(onAddItem.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        description: "JABON AZUFRE AZUFRE -10017 (EVA01893)",
        referencePackId: undefined,
        components: [
          expect.objectContaining({
            skuId: "sku-1",
            referencePackItemId: undefined,
          }),
        ],
      }),
    );
  });

  it("does not search when disabled", async () => {
    render(<SaleOrderDirectSkuSelect disabled onAddItem={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Producto"), {
      target: { value: "azufre" },
    });

    await new Promise((resolve) => window.setTimeout(resolve, 450));
    expect(listSkus).not.toHaveBeenCalled();
  });
});
