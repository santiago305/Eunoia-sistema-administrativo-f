import { describe, expect, it } from "vitest";
import { AfectType } from "@/features/purchases/types/purchaseEnums";
import { recalcItem } from "./functionPurchases";

describe("functionPurchases.recalcItem", () => {
  it("uses item porcentageIgv as percent when calculating taxed totals", () => {
    const result = recalcItem({
      skuId: "sku-1",
      unitBase: "NIU",
      equivalence: "NIU",
      factor: 1,
      afectType: AfectType.TAXED,
      quantity: 1,
      porcentageIgv: 10,
      baseWithoutIgv: 0,
      amountIgv: 0,
      unitValue: 0,
      unitPrice: 110,
      purchaseValue: 0,
    });

    expect(result.baseWithoutIgv).toBe(100);
    expect(result.amountIgv).toBe(10);
    expect(result.porcentageIgv).toBe(10);
  });

  it("keeps exempt items without IGV", () => {
    const result = recalcItem({
      skuId: "manual-1",
      unitBase: "NIU",
      equivalence: "NIU",
      factor: 1,
      afectType: AfectType.EXEMPT,
      quantity: 2,
      porcentageIgv: 18,
      baseWithoutIgv: 0,
      amountIgv: 0,
      unitValue: 0,
      unitPrice: 50,
      purchaseValue: 0,
      description: "Manual",
    });

    expect(result.baseWithoutIgv).toBe(100);
    expect(result.amountIgv).toBe(0);
    expect(result.porcentageIgv).toBe(0);
  });
});
