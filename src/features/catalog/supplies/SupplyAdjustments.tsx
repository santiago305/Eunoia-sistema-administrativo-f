import { InventoryAdjustmentsPage } from "@/features/catalog/components/InventoryAdjustmentsPage";
import { InventoryDocumentProductType } from "@/features/catalog/types/documentInventory";
import { ProductTypes } from "@/features/catalog/types/ProductTypes";

export default function SupplyAdjustments() {
  return <InventoryAdjustmentsPage config={{ documentProductType: InventoryDocumentProductType.SUPPLY, productType: ProductTypes.SUPPLY, headingTitle: "Ajustes (Insumos)", recentStorageKey: "recent-search:inventory-documents-adjustment-supplies", tableId: "inventory-documents-adjustment-supplies", searchName: "inventory-documents-adjustment-supplies-search" }} />;
}
