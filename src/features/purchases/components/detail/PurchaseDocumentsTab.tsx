import { PurchaseDocumentsTab as PurchaseDocumentsManager } from "@/features/purchases/components/documents/PurchaseDocumentsTab";
import type { Payment } from "@/features/purchases/types/purchase";

type Props = {
  purchaseId: string;
  payments?: Payment[];
  legacyImages?: string[];
};

export function PurchaseDocumentsTab({ purchaseId, payments = [], legacyImages = [] }: Props) {
  return <PurchaseDocumentsManager purchaseId={purchaseId} payments={payments} legacyImages={legacyImages} />;
}
