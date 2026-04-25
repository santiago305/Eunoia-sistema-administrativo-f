import { InventoryTransfersPage } from "@/pages/catalog/components/InventoryTransfersPage";
import { InventoryDocumentProductType } from "@/pages/catalog/types/documentInventory";

export default function TransferRowMaterial() {
  return (
    <InventoryTransfersPage
      config={{
        productType: InventoryDocumentProductType.MATERIAL,
        pageTitle: "Suministros - Transferencias",
        headingTitle: "Transferencias (Materiales)",
        tableId: "inventory-documents-transfer-materials",
        searchName: "inventory-documents-transfer-materials-search",
      }}
    />
  );
}
