import { InventoryAdjustmentsPage } from "@/pages/catalog/components/InventoryAdjustmentsPage";
import { InventoryDocumentProductType } from "@/pages/catalog/types/documentInventory";
import { ProductTypes } from "@/pages/catalog/types/ProductTypes";

export default function AdjustmentProduts() {
  return (
    <InventoryAdjustmentsPage
      config={{
        documentProductType: InventoryDocumentProductType.PRODUCT,
        productType: ProductTypes.PRODUCT,
        headingTitle: "Ajustes (Productos)",
        recentStorageKey: "recent-search:inventory-documents-adjustment-products",
        tableId: "inventory-documents-adjustment-products",
        searchName: "inventory-documents-adjustment-products-search",
      }}
    />
  );
}
