import { describe, expect, it } from "vitest";
import {
  getVisiblePurchaseDetailTabs,
  resolvePurchaseDetailTabFromPath,
} from "@/features/purchases/pages/purchaseDetailTabs";

describe("purchase detail tab routing", () => {
  it("maps purchase detail deep links to the expected tab", () => {
    expect(resolvePurchaseDetailTabFromPath("/compras/PO-1")).toBe("summary");
    expect(resolvePurchaseDetailTabFromPath("/compras/PO-1/pagos")).toBe("payments");
    expect(resolvePurchaseDetailTabFromPath("/compras/PO-1/documentos")).toBe("documents");
    expect(resolvePurchaseDetailTabFromPath("/compras/PO-1/historial")).toBe("timeline");
  });

  it("hides the history tab without purchases.view_history permission", () => {
    expect(getVisiblePurchaseDetailTabs(() => false).some((tab) => tab.value === "timeline")).toBe(false);
    expect(getVisiblePurchaseDetailTabs((permission) => permission === "purchases.view_history").some((tab) => tab.value === "timeline")).toBe(true);
  });
});
