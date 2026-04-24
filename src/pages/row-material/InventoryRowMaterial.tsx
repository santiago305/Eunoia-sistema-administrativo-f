import { InventoryStockPage } from "@/pages/catalog/components/InventoryStockPage";
import { ProductTypes } from "@/pages/catalog/types/ProductTypes";
import { RoutesPaths } from "@/router/config/routesPaths";

export default function InventoryRowMaterial() {
  return (
    <InventoryStockPage
      config={{
        productType: ProductTypes.MATERIAL,
        pageTitle: "Suministros - Inventario",
        headingTitle: "Inventario de materiales",
        recentStorageKey: "recent-search:row-material-inventory",
        tableId: "row-material-inventory-table",
        searchLabel: "Buscar material",
        searchName: "row-material-inventory-search",
        routes: {
          kardex: RoutesPaths.KardexPrima,
          transfer: RoutesPaths.rowMaterialTransfer,
          adjustments: RoutesPaths.rowMaterialAdjustments,
        },
      }}
    />
  );
}
