import { describe, expect, it } from "vitest";
import { buildSkuDisplayLabel, formatSkuAttributes } from "./skuLabel";

describe("SKU display labels", () => {
  it("orders common attributes and includes identifiers", () => {
    expect(buildSkuDisplayLabel({
      name: "Arcilla",
      backendSku: "SKU-21",
      customSku: "ARC-ROS",
      attributes: [
        { code: "color", value: "Terracota" },
        { code: "presentation", value: "Bolsa 1 kg" },
        { code: "variant", value: "Rosada" },
      ],
    })).toBe("Arcilla Bolsa 1 kg Rosada Terracota - SKU-21 (ARC-ROS)");
  });

  it("keeps additional attributes and removes duplicate values", () => {
    expect(formatSkuAttributes([
      { code: "presentation", value: "Bolsa" },
      { code: "material", value: "Bolsa" },
      { code: "finish", value: "Mate" },
    ])).toBe("Bolsa Mate");
  });
});
