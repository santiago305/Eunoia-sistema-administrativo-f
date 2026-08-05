import { describe, expect, it } from "vitest";
import type { PurchaseOrderItemEditOutput } from "@/features/purchases/types/itemPurchaseEdit";
import { purchaseDetailItemName } from "./PurchaseItemsTab";

describe("purchaseDetailItemName", () => {
  it("includes SKU attributes and identifiers so variants can be distinguished", () => {
    const item = {
      sku: {
        sku: {
          id: "sku-1",
          productId: "product-1",
          name: "Arcilla",
          backendSku: "SKU-00021",
          customSku: "ARC-ROS-1KG",
        },
        attributes: [
          { code: "variant", name: "Variante", value: "Rosada" },
          { code: "presentation", name: "Presentación", value: "Bolsa 1 kg" },
        ],
      },
    } as PurchaseOrderItemEditOutput;

    expect(purchaseDetailItemName(item)).toBe(
      "Arcilla Bolsa 1 kg Rosada - SKU-00021 (ARC-ROS-1KG)",
    );
  });

  it("keeps the legacy fallback for services without a SKU", () => {
    const item = { serviceName: "Transporte" } as PurchaseOrderItemEditOutput;

    expect(purchaseDetailItemName(item)).toBe("Transporte");
  });
});
