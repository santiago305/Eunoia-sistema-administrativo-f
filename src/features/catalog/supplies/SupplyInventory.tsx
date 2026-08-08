import { InventoryStockPage } from "@/features/catalog/components/InventoryStockPage";
import { ProductTypes } from "@/features/catalog/types/ProductTypes";
import { RoutesPaths } from "@/routes/config/routesPaths";

export default function SupplyInventory() {
  return <InventoryStockPage config={{ productType: ProductTypes.SUPPLY, pageTitle: "Insumos - Inventario", headingTitle: "Inventario de insumos", itemLabel: "Insumo", tableId: "supply-inventory-table", searchLabel: "Buscar insumo", searchName: "supply-inventory-search", routes: { kardex: RoutesPaths.supplyKardex, transfer: RoutesPaths.supplyTransfers, adjustments: RoutesPaths.supplyAdjustments } }} />;
}
