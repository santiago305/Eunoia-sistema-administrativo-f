import { describe, expect, it } from "vitest";
import { RoutesPaths } from "@/routes/config/routesPaths";
import { getSidebarItems, getSidebarTitleByPath } from "./sidebarConfig";

describe("sidebarConfig", () => {
  it("does not expose the standalone new purchase page", () => {
    const purchaseSection = getSidebarItems().find((item) => item.label === "Compras");

    expect(purchaseSection?.children).toBeDefined();
    expect(purchaseSection?.children?.some((item) => item.label === "Nueva compra")).toBe(false);
    expect(purchaseSection?.children?.some((item) => item.href === "/compras/nueva")).toBe(false);
  });

  it("does not expose the standalone purchase history page", () => {
    const purchaseSection = getSidebarItems().find((item) => item.label === "Compras");

    expect(purchaseSection?.children).toBeDefined();
    expect(purchaseSection?.children?.some((item) => item.label === "Historial de compras")).toBe(false);
    expect(purchaseSection?.children?.some((item) => item.href === "/compras/historial")).toBe(false);
  });

  it("uses Dashboard Compras as the purchase dashboard header title", () => {
    expect(getSidebarTitleByPath(RoutesPaths.purchaseDashboard)).toBe("Dashboard Compras");
  });
});
