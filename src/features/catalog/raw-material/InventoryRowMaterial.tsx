import { InventoryStockPage } from "@/features/catalog/components/InventoryStockPage";
import { ProductTypes } from "@/features/catalog/types/ProductTypes";
import { RoutesPaths } from "@/routes/config/routesPaths";

export default function InventoryRowMaterial() {
  return (
    <InventoryStockPage
      config={{
        productType: ProductTypes.MATERIAL,
        pageTitle: "Suministros - Inventario",
        headingTitle: "Inventario de materiales",
        itemLabel: "Material",
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
