import { InventoryMovementsPage } from "@/pages/catalog/components/InventoryMovementsPage";
import { ProductTypes } from "@/pages/catalog/types/ProductTypes";

export default function KardexPrima() {
  return (
    <InventoryMovementsPage
      config={{
        productType: ProductTypes.MATERIAL,
        pageTitle: "Movimientos de materia prima",
        headingTitle: "Movimientos de materia prima",
        tableId: "inventory-ledger-materials",
        searchName: "inventory-ledger-materials-search",
        dateRangeName: "inventory-ledger-materials-date-range",
      }}
    />
  );
}
