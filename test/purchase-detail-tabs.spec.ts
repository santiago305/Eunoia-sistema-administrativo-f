import { describe, expect, it } from "vitest";
import { resolvePurchaseDetailTabFromPath } from "@/features/purchases/pages/purchaseDetailTabs";

describe("purchase detail tab routing", () => {
  it("maps purchase detail deep links to the expected tab", () => {
    expect(resolvePurchaseDetailTabFromPath("/compras/PO-1")).toBe("summary");
    expect(resolvePurchaseDetailTabFromPath("/compras/PO-1/pagos")).toBe("payments");
    expect(resolvePurchaseDetailTabFromPath("/compras/PO-1/documentos")).toBe("documents");
  });
});
