import { describe, expect, it } from "vitest";
import { deriveSkuPresentation } from "@/features/sale-orders/utils/skuPresentation";

describe("deriveSkuPresentation", () => {
  it("builds label with attrs and prefers backendSku", () => {
    const sku = {
      id: "sku-1",
      name: "JABON AZUFRE",
      backendSku: "10017",
      customSku: "EVA01893",
      image: "https://example.test/x.png",
      attributes: [{ value: "AZUFRE" }],
    };

    const out = deriveSkuPresentation(sku, sku.id);

    expect(out.skuCode).toBe("10017");
    expect(out.skuLabel).toBe("JABON AZUFRE AZUFRE (10017)");
    expect(out.skuImage).toBe("https://example.test/x.png");
  });

  it("falls back to customSku when backendSku is missing", () => {
    const sku = {
      id: "sku-2",
      name: "AMPOLLA",
      backendSku: null,
      customSku: "EVA01863",
      image: null,
      attributes: [],
    };

    const out = deriveSkuPresentation(sku, sku.id);

    expect(out.skuCode).toBe("EVA01863");
    expect(out.skuLabel).toBe("AMPOLLA (EVA01863)");
  });

  it("falls back to skuId when no codes are present", () => {
    const skuId = "4aa052ab-1c54-48dd-9889-b084e539093a";
    const out = deriveSkuPresentation(null, skuId);

    expect(out.skuCode).toBe(skuId);
    expect(out.skuLabel).toBe(skuId);
    expect(out.skuImage).toBeNull();
  });
});

