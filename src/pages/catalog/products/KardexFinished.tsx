import { InventoryMovementsPage } from "@/pages/catalog/components/InventoryMovementsPage";
import { ProductTypes } from "@/pages/catalog/types/ProductTypes";

export default function KardexFinished() {
  return (
    <InventoryMovementsPage
      config={{
        productType: ProductTypes.PRODUCT,
        pageTitle: "Movimientos de productos",
        headingTitle: "Movimientos de productos",
        tableId: "inventory-ledger-products",
        searchName: "inventory-ledger-products-search",
        dateRangeName: "inventory-ledger-products-date-range",
      }}
    />
  );
}
