import { DocType } from "@/pages/warehouse/types/warehouse";

export type TransferItem = {
  stockItemId: string;
  quantity: number;
  unitCost?: number;
  fromLocationId?: string;
  toLocationId?: string;
};

export type CreateTransfer = {
  docType: DocType;
  serieId: string;
  fromWarehouseId?: string;
  toWarehouseId?: string;
  referenceId?: string;
  referenceType?: string;
  note?: string;
  items: TransferItem[];
};

export type TransferResponse = {
  id?: string;
  docId?: string;
  docType?: string;
  status?: string;
  serie?: string;
  correlative?: number;
  createdAt?: string;
  message?: string;
  type?: string;
};
export type TransferItemRow = TransferItem & {
    rowIndex: number;
    sku?: string;
    productName?: string;
    unitName?: string;
    customSku?: string;
    attributes?: {
        presentation?: string;
        variant?: string;
        color?: string;
    };
};

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
export const buildEmptyFormTransfer = (): CreateTransfer => ({
    docType: DocType.TRANSFER,
    serieId: "",
    fromWarehouseId: "",
    toWarehouseId: "",
    note: "",
    items: [],
});

export const buildEmptyItemTransfer = (): TransferItem => ({
    stockItemId: "",
    quantity: 0,
});

export type Stock = {
    itemId: string;
    name?: string;
    sku?: string;
    customSku?: string;
    attributes?: {
        presentation?: string;
        variant?: string;
        color?: string;
    };
    unit?: string;
    value?: number | null;
};


export const buildStockSummary = (row: TransferItemRow, value: number | null): Stock => ({
    itemId: row.stockItemId,
    sku: row.sku,
    customSku: row.customSku,
    attributes: row.attributes,
    name: row.productName,
    unit: row.unitName,
    value,
});
