import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SaleOrderAddSkuModal } from "./SaleOrderAddSkuModal";
import { listSkus } from "@/shared/services/skuService";

vi.mock("@/shared/services/skuService", () => ({
  listSkus: vi.fn(async () => ({
    items: [
      {
        sku: {
          id: "sku-1",
          name: "Producto 1",
          backendSku: "B1",
          customSku: "C1",
          price: 12.5,
          image: "/sku.webp",
        },
        attributes: [{ value: "Rojo" }],
      },
    ],
  })),
}));

describe("SaleOrderAddSkuModal", () => {
  it("loads product SKUs, prefills price, and submits the selected SKU", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();

    render(<SaleOrderAddSkuModal open onClose={vi.fn()} onAdd={onAdd} />);

    await waitFor(() =>
      expect(listSkus).toHaveBeenCalledWith(
        expect.objectContaining({ productType: "PRODUCT", isActive: true }),
      ),
    );

    await user.click(screen.getByRole("button", { name: "Producto" }));
    fireEvent.mouseDown(await screen.findByRole("option", { name: /Producto 1 Rojo -B1 \(C1\)/i }));

    const dialog = screen.getByRole("dialog", { name: "Agregar SKU" });
    await waitFor(() => expect(within(dialog).getByLabelText("Precio unit.")).toHaveValue(12.5));
    fireEvent.change(within(dialog).getByLabelText("Cantidad"), { target: { value: "2" } });
    fireEvent.change(within(dialog).getByLabelText("Precio unit."), { target: { value: "9.5" } });

    await user.click(within(dialog).getByRole("button", { name: "Agregar" }));

    expect(onAdd).toHaveBeenCalledWith({
      skuId: "sku-1",
      label: "Producto 1 Rojo -B1 (C1)",
      quantity: 2,
      basePrice: 12.5,
      unitPrice: 9.5,
      skuImage: "/sku.webp",
    });
  });
});
