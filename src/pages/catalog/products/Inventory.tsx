import { InventoryStockPage } from "@/pages/catalog/components/InventoryStockPage";
import { ProductTypes } from "@/pages/catalog/types/ProductTypes";
import { RoutesPaths } from "@/router/config/routesPaths";

export default function CatalogInventory() {
  return (
    <InventoryStockPage
      config={{
        productType: ProductTypes.PRODUCT,
        pageTitle: "Catalogo - Inventario",
        headingTitle: "Inventario de productos",
        itemLabel: "Producto (SKU)",
        tableId: "catalog-inventory-table",
        searchLabel: "Buscar producto",
        searchName: "catalog-inventory-search",
        routes: {
          kardex: RoutesPaths.KardexFinished,
          transfer: RoutesPaths.catalogTransfer,
          adjustments: RoutesPaths.catalogAdjustments,
        },
      }}
    />
  );
}
