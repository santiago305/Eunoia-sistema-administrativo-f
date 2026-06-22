import { describe, expect, it } from "vitest";
import {
  PurchaseTypes,
  purchaseTypeDescriptions,
  purchaseTypeLabels,
} from "./purchase-classification.types";

describe("purchase classification labels", () => {
  it("shows inventory purchases as Producto", () => {
    expect(purchaseTypeLabels[PurchaseTypes.INVENTORY]).toBe("Producto");
  });

  it("describes every purchase type for the information modal", () => {
    expect(Object.keys(purchaseTypeDescriptions)).toEqual(Object.values(PurchaseTypes));
    expect(purchaseTypeDescriptions[PurchaseTypes.RAW_MATERIAL].detail).toContain("produccion");
  });
});
