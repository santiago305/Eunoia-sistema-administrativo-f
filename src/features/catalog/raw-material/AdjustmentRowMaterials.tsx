import { InventoryAdjustmentsPage } from "@/features/catalog/components/InventoryAdjustmentsPage";
import { InventoryDocumentProductType } from "@/features/catalog/types/documentInventory";
import { ProductTypes } from "@/features/catalog/types/ProductTypes";

export default function AdjustmentRowMaterials() {
  return (
    <InventoryAdjustmentsPage
      config={{
        documentProductType: InventoryDocumentProductType.MATERIAL,
        productType: ProductTypes.MATERIAL,
        headingTitle: "Ajustes (Materiales)",
        recentStorageKey: "recent-search:inventory-documents-adjustment-materials",
        tableId: "inventory-documents-adjustment-materials",
        searchName: "inventory-documents-adjustment-materials-search",
      }}
    />
  );
}
