import { InventoryTransfersPage } from "@/features/catalog/components/InventoryTransfersPage";
import { InventoryDocumentProductType } from "@/features/catalog/types/documentInventory";

export default function TransferenceProduts() {
  return (
    <InventoryTransfersPage
      config={{
        productType: InventoryDocumentProductType.PRODUCT,
        pageTitle: "Catalogo - Transferencias",
        headingTitle: "Transferencias (Productos)",
        tableId: "inventory-documents-transfer-products",
        searchName: "inventory-documents-transfer-products-search",
      }}
    />
  );
}
