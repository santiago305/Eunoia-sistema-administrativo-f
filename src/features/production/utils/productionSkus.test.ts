import { describe, expect, it } from "vitest";
import { buildProductionItemSummaryLabel } from "./productionSkus";

describe("buildProductionItemSummaryLabel", () => {
  it("joins the SKU name and attribute without a separator", () => {
    expect(buildProductionItemSummaryLabel({ name: "Liquido", attributeValue: "Anti acne" }))
      .toBe("Liquido Anti acne");
  });

  it("uses the SKU code when there is no attribute", () => {
    expect(buildProductionItemSummaryLabel({ name: "Jabon", customSku: "JAB-01" }))
      .toBe("Jabon JAB-01");
  });
});
