import { describe, expect, it } from "vitest";
import { PurchaseTypes } from "@/features/purchases/types/purchase-classification.types";
import { buildEmptyForm } from "./functionPurchases";

describe("buildEmptyForm", () => {
  it("starts new purchases as raw material purchases", () => {
    expect(buildEmptyForm().purchaseType).toBe(PurchaseTypes.RAW_MATERIAL);
  });
});
