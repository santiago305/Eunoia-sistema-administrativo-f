import { InventoryAdjustmentsPage } from "@/features/catalog/components/InventoryAdjustmentsPage";
import { InventoryDocumentProductType } from "@/features/catalog/types/documentInventory";
import { ProductTypes } from "@/features/catalog/types/ProductTypes";

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
