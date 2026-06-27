import { describe, expect, it } from "vitest";
import { getSidebarItems } from "./sidebarConfig";

describe("sidebar config", () => {
  it("does not expose the standalone new purchase page", () => {
    const purchaseSection = getSidebarItems().find((item) => item.label === "Compras");

    expect(purchaseSection?.children).toBeDefined();
    expect(purchaseSection?.children?.some((item) => item.label === "Nueva compra")).toBe(false);
    expect(purchaseSection?.children?.some((item) => item.href === "/compras/nueva")).toBe(false);
  });
});
