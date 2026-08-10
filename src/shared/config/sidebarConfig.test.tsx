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

  it("uses Compras as the purchase dashboard header title", () => {
    expect(getSidebarTitleByPath(RoutesPaths.purchaseDashboard)).toBe("Compras");
  });

  it("uses the inventory route for the raw-material sidebar entry", () => {
    const catalogSection = getSidebarItems().find((item) => item.label === "Catálogo");
    const materialsSection = catalogSection?.children?.find((item) => item.label === "Materias primas");
    const inventoryItem = materialsSection?.children?.find((item) => item.label === "Inventario");

    expect(inventoryItem?.href).toBe("/materia-prima/inventario");
    expect(getSidebarTitleByPath(RoutesPaths.rowMaterialInventory)).toBe("Inventario");
  });

  it("groups products, raw materials and supplies under Catalog", () => {
    const items = getSidebarItems();
    const catalogSection = items.find((item) => item.label === "Catálogo");

    expect(catalogSection?.children?.map((item) => item.label)).toEqual([
      "Productos",
      "Materias primas",
      "Insumos",
    ]);
    expect(items.some((item) => item.label === "Materias primas")).toBe(false);
    expect(items.some((item) => item.label === "Insumos")).toBe(false);
    expect(catalogSection?.children?.find((item) => item.label === "Productos")?.children)
      .toContainEqual({ label: "Packs", href: RoutesPaths.catalogPacks });
  });
});
