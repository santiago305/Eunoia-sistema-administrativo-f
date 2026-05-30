import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SaleOrderItemEditorModal } from "@/features/sale-orders/components/SaleOrderItemEditorModal";

vi.mock("@/shared/services/packService", () => ({
  listPacks: vi.fn(async () => ({ items: [] })),
  getPackById: vi.fn(async () => ({ pack: { description: "Pack X" }, items: [] })),
}));

vi.mock("@/shared/services/skuService", () => ({
  listSkus: vi.fn(async () => ({
    items: [
      {
        sku: { id: "sku-1", name: "Producto 1", backendSku: "B1", customSku: null, price: 12.5 },
        attributes: [],
        unit: { id: "u1", name: "UND", code: "UND" },
      },
    ],
    total: 1,
    page: 1,
    limit: 10,
  })),
}));

describe("SaleOrderItemEditorModal - add catalog SKU", () => {
  it("prefills unit price from sku.price and adds component row", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <SaleOrderItemEditorModal
        open
        title="Editar"
        value={{
          description: "X",
          quantity: 1,
          unitPrice: 0,
          total: 0,
          referencePackId: "pack-1",
          components: [{ skuId: "existing", quantity: 1, unitPrice: 0, total: 0 }],
        }}
        onChange={onChange}
        onClose={() => {}}
        onConfirm={() => {}}
      />,
    );

    await user.click(screen.getByTitle("Agregar SKU"));

    const dialog = screen.getByRole("dialog", { name: "Agregar SKU" });

    const selectTrigger = within(dialog).getByRole("button", { name: "Producto" });
    await user.click(selectTrigger);

    const option = await screen.findByRole("option", { name: /Producto 1/i });
    fireEvent.mouseDown(option);

    const priceInput = within(dialog).getByLabelText("Precio unit.") as HTMLInputElement;
    await waitFor(() => expect(priceInput.value).toContain("12.5"));

    await user.click(within(dialog).getByRole("button", { name: "Agregar" }));

    expect(onChange).toHaveBeenCalled();
  });
});
