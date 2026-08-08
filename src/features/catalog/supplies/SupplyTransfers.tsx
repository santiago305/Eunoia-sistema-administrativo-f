import { InventoryTransfersPage } from "@/features/catalog/components/InventoryTransfersPage";
import { InventoryDocumentProductType } from "@/features/catalog/types/documentInventory";

export default function SupplyTransfers() {
  return <InventoryTransfersPage config={{ productType: InventoryDocumentProductType.SUPPLY, pageTitle: "Insumos - Transferencias", headingTitle: "Transferencias (Insumos)", tableId: "inventory-documents-transfer-supplies", searchName: "inventory-documents-transfer-supplies-search" }} />;
}
