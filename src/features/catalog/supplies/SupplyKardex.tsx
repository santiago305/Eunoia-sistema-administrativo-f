import { InventoryMovementsPage } from "@/features/catalog/components/InventoryMovementsPage";
import { ProductTypes } from "@/features/catalog/types/ProductTypes";

export default function SupplyKardex() {
  return <InventoryMovementsPage config={{ productType: ProductTypes.SUPPLY, pageTitle: "Movimientos de insumos", headingTitle: "Movimientos de insumos", itemLabel: "Insumo", tableId: "inventory-ledger-supplies", searchName: "inventory-ledger-supplies-search", dateRangeName: "inventory-ledger-supplies-date-range" }} />;
}
