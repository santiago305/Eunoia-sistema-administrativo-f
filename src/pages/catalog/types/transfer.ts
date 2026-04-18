import { skuStock } from "./documentInventory";
import { ProductSkuWithAttributes } from "./product";

export type TransferItem = {
  skuId: string;
  quantity: number;
  unitCost?: number;
};

export type CreateTransfer = {
  fromWarehouseId: string;
  toWarehouseId: string;
  serieId: string;
  note?: string;
  items: TransferItem[];
};

export type TransferItemRow = {
  rowIndex: number;
  skuId: string;
  backendSku: string;
  customSku: string | null;
  name: string;
  unit: string;
  quantity: number;
};

type StockSummary = {
  skuId: string;
  name: string;
  backendSku: string;
  customSku: string | null;
  unit: string;
  onHand: number | null;
  reserved: number | null;
  available: number | null;
};

export type StockDetailState = {
  loading: boolean;
  error: string | null;
  selectedSkuId: string | null;
  from: StockSummary | null;
  to: StockSummary | null;
};

export type TransferProductsProps = {
  inModal?: boolean;
  onClose?: () => void;
  onSaved?: (transferId: string) => void | Promise<void>;
};

export const emptyStockDetail: StockDetailState = {
  loading: false,
  error: null,
  selectedSkuId: null,
  from: null,
  to: null,
};

export const buildEmptyItemTransfer = (): TransferItem => ({
  skuId: "",
  quantity: 0,
  unitCost: 0,
});

export const buildEmptyFormTransfer = (): CreateTransfer => ({
  fromWarehouseId: "",
  toWarehouseId: "",
  serieId: "",
  note: "",
  items: [],
});

export const getSkuUnitName = (sku: ProductSkuWithAttributes) => {
  return sku.unit?.name ?? "-";
};

export const buildSkuLabel = (item: ProductSkuWithAttributes) => {
  return [
    item.sku.name,
    item.sku.backendSku ? `- ${item.sku.backendSku}` : "",
    item.sku.customSku ? `(${item.sku.customSku})` : "",
  ]
    .filter(Boolean)
    .join(" ");
};

export const buildStockSummary = (
  sku: ProductSkuWithAttributes,
  stock: skuStock | null
): StockSummary => ({
  skuId: sku.sku.id,
  name: sku.sku.name ?? "-",
  backendSku: sku.sku.backendSku ?? "-",
  customSku: sku.sku.customSku ?? null,
  unit: getSkuUnitName(sku),
  onHand: stock?.onHand ?? null,
  reserved: stock?.reserved ?? null,
  available: stock?.available ?? null,
});

export type TransferItemModalProps = {
    open: boolean;
    pendingItem: TransferItem;
    onChange: (patch: Partial<TransferItem>) => void;
    onClose: () => void;
    onAdd: () => void;
};

export type TransferResultModalProps = {
    open: boolean;
    transferId?: string;
    onNew: () => void;
    onGoToList: () => void;
    onClose: () => void;
    title: string;
    goToLabel: string;
};
