import type { PurchaseOrder } from "@/features/purchases/types/purchase";

export type SummaryPurchase = PurchaseOrder & {
  supplierLabel: string;
  supplierDoc?: string;
  warehouseLabel: string;
  statusLabel: string;
  docLabel: string;
  numero: string;
  date: string;
  time?: string;
  dateEnter: string;
  timeEnter?: string;
};

export type PurchaseDetailsModalProps = {
  open: boolean;
  poId?: string | null;
  purchase: SummaryPurchase | null;
  onClose: () => void;
};
