import stockMockData from "./stockMock.json";

export type StockMockData = typeof stockMockData;

type AdjustmentInput = {
  sku: string;
  warehouse: string;
  quantity: number;
  reason: string;
};

type TransferInput = {
  sku: string;
  fromWarehouse: string;
  toWarehouse: string;
  quantity: number;
};

let stockState: StockMockData = structuredClone(stockMockData);

const resolveWarehouseId = (warehouse: string) => {
  const value = warehouse.trim();
  return (
    stockState.warehouses.find((w) => w.warehouse_id === value)?.warehouse_id ??
    stockState.warehouses.find((w) => w.name.toLowerCase() === value.toLowerCase())?.warehouse_id ??
    null
  );
};

const resolveVariantId = (sku: string) => {
  const value = sku.trim();
  return stockState.variants.find((v) => v.sku.toLowerCase() === value.toLowerCase())?.variant_id ?? null;
};

const resolveDefaultLocation = (warehouseId: string) => {
  return stockState.locations.find((l) => l.warehouse_id === warehouseId)?.location_id ?? null;
};

const ensureInventoryRow = (warehouseId: string, variantId: string, locationId: string | null) => {
  let row = stockState.inventory.find(
    (item) => item.warehouse_id === warehouseId && item.variant_id === variantId && item.location_id === locationId
  );
  if (!row) {
    row = {
      warehouse_id: warehouseId,
      location_id: locationId,
      variant_id: variantId,
      on_hand: 0,
      reserved: 0,
      updated_at: new Date().toISOString(),
    };
    stockState.inventory.push(row);
  }
  return row;
};

const nextLedgerId = () => {
  const maxId = stockState.ledger.reduce((max, entry) => Math.max(max, entry.ledger_id ?? 0), 0);
  return maxId + 1;
};

// PROVISIONAL: simula una llamada a API para consumir stock.
export const fetchStockMock = async (): Promise<StockMockData> => {
  await new Promise((resolve) => setTimeout(resolve, 200));
  return structuredClone(stockState);
};

// PROVISIONAL: acceso sincrono para vistas que no requieren carga.
export const getStockMock = (): StockMockData => structuredClone(stockState);

export const applyAdjustment = (input: AdjustmentInput) => {
  const warehouseId = resolveWarehouseId(input.warehouse);
  const variantId = resolveVariantId(input.sku);
  if (!warehouseId || !variantId || !input.quantity) return false;

  const locationId = resolveDefaultLocation(warehouseId);
  const row = ensureInventoryRow(warehouseId, variantId, locationId);
  const direction = input.quantity >= 0 ? "IN" : "OUT";
  const qty = Math.abs(input.quantity);
  row.on_hand = Math.max(0, row.on_hand + (direction === "IN" ? qty : -qty));
  row.updated_at = new Date().toISOString();

  const variant = stockState.variants.find((v) => v.variant_id === variantId);
  stockState.ledger.push({
    ledger_id: nextLedgerId(),
    doc_id: `doc-ajuste-${Date.now()}`,
    unit_cost: variant?.cost ?? 0,
    direction,
    created_at: new Date().toISOString(),
    warehouse_id: warehouseId,
    location_id: locationId,
    quantity: qty,
    variant_id: variantId,
  });

  return true;
};

export const applyTransfer = (input: TransferInput) => {
  const fromWarehouseId = resolveWarehouseId(input.fromWarehouse);
  const toWarehouseId = resolveWarehouseId(input.toWarehouse);
  const variantId = resolveVariantId(input.sku);
  if (!fromWarehouseId || !toWarehouseId || !variantId || !input.quantity) return false;

  const qty = Math.abs(input.quantity);
  const fromLocationId = resolveDefaultLocation(fromWarehouseId);
  const toLocationId = resolveDefaultLocation(toWarehouseId);
  const fromRow = ensureInventoryRow(fromWarehouseId, variantId, fromLocationId);
  const toRow = ensureInventoryRow(toWarehouseId, variantId, toLocationId);

  fromRow.on_hand = Math.max(0, fromRow.on_hand - qty);
  toRow.on_hand = toRow.on_hand + qty;
  fromRow.updated_at = new Date().toISOString();
  toRow.updated_at = new Date().toISOString();

  const variant = stockState.variants.find((v) => v.variant_id === variantId);
  const docId = `doc-transfer-${Date.now()}`;
  const createdAt = new Date().toISOString();

  stockState.ledger.push({
    ledger_id: nextLedgerId(),
    doc_id: docId,
    unit_cost: variant?.cost ?? 0,
    direction: "OUT",
    created_at: createdAt,
    warehouse_id: fromWarehouseId,
    location_id: fromLocationId,
    quantity: qty,
    variant_id: variantId,
  });

  stockState.ledger.push({
    ledger_id: nextLedgerId(),
    doc_id: docId,
    unit_cost: variant?.cost ?? 0,
    direction: "IN",
    created_at: createdAt,
    warehouse_id: toWarehouseId,
    location_id: toLocationId,
    quantity: qty,
    variant_id: variantId,
  });

  return true;
};
