import type { ReactNode } from "react";
import type { InventoryDocument } from "@/features/catalog/types/documentInventory";

export type InventoryDocumentDetailItem = {
  id?: string | null;
  docId?: string | null;
  skuId?: string | null;
  sku?: {
    id?: string | null;
    name?: string | null;
    backendSku?: string | null;
    customSku?: string | null;
    sku?: {
      name?: string | null;
      backendSku?: string | null;
      customSku?: string | null;
    } | null;
  } | null;
  name?: string | null;
  backendSku?: string | null;
  customSku?: string | null;
  unitName?: string | null;
  unit?: {
    name?: string | null;
  } | null;
  quantity?: number | null;
};

export type InventoryDocumentDetail = {
  document: InventoryDocument;
  items: InventoryDocumentDetailItem[];
};

export type DetailField = {
  label: string;
  value: string | number | null | undefined;
};

export type DetailListItem = {
  id: string;
  label: string;
  code?: string;
  unit?: string;
  quantity?: number | string;
  amount?: string;
  extra?: string;
};

export type DetailPayment = {
  id: string;
  method: string;
  date?: string;
  operationNumber?: string;
  note?: string;
  amount: string;
};

export type DetailQuota = {
  id: string;
  number: string | number;
  expirationDate?: string;
  paymentDate?: string;
  total: string;
  paid: string;
  pending: string;
  completed: boolean;
};

export type ExtendedDetailsConfig = {
  title?: string;
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  modalClassName?: string;
  modalBodyClassName?: string;
  headerIcon?: ReactNode;
  headerIconClassName?: string;
  headerLabel?: string;
  headerBadge?: string | null;
  headerBadgeClassName?: string;
  headerNumber?: string;
  headerSubLabel?: string;
  headerRightLabel?: string;
  headerRightValue?: string;
  summaryTopFields?: DetailField[];
  summaryFields?: DetailField[];
  summaryMeta?: string;
  itemsTitle?: string;
  itemsMeta?: string;
  items?: DetailListItem[];
  itemsEmptyMessage?: string;
  payments?: DetailPayment[];
  paymentsMeta?: string;
  paymentsEmptyMessage?: string;
  quotas?: DetailQuota[];
  quotasMeta?: string;
  quotasEmptyMessage?: string;
  note?: string;
  noteTitle?: string;
  images?: string[];
  imageTitle?: string;
  imageEmptyMessage?: string;
  canUploadImage?: boolean;
  uploadingImage?: boolean;
  onUploadImage?: (file?: File | null) => Promise<void> | void;
  imageAltPrefix?: string;
};

export type DocumentInventoryDetailsProps = {
  open: boolean;
  documentId?: string | null;
  document: InventoryDocument | null;
  items?: InventoryDocumentDetailItem[];
  onClose: () => void;
  loadDetail?: (documentId: string) => Promise<InventoryDocumentDetail>;
  extendedDetails?: ExtendedDetailsConfig;
};
