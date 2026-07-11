import { skuStock } from "@/features/catalog/types/documentInventory";
import { InventorySnapshotOutput } from "@/features/catalog/types/inventory";
import { listInventory } from "./inventoryService";


type StockMap = Record<string, skuStock | null>;

type StockRequest = {
  warehouseId: string;
  skuIds: string[];
  forceRefresh?: boolean;
  requestKey?: string;
};

const CACHE_TTL_MS = 5_000;
const cache = new Map<string, { expiresAt: number; value: StockMap }>();
const pending = new Map<string, Promise<StockMap>>();

const normalizeSkuIds = (skuIds: string[]) =>
  Array.from(new Set(skuIds.map((skuId) => skuId.trim()).filter(Boolean))).sort();

const getVariantId = (variant: unknown) => {
  if (!variant || typeof variant !== "object") return "";

  const record = variant as Record<string, unknown>;
  const nested = record.variant;
  if (nested && typeof nested === "object") {
    const nestedId = (nested as Record<string, unknown>).id;
    if (typeof nestedId === "string") return nestedId;
  }

  return typeof record.id === "string" ? record.id : "";
};

const getNormalizedSkuId = (row: InventorySnapshotOutput) => {
  const skuWrapper = (
    row as unknown as { sku?: { sku?: { id?: unknown } } }
  ).sku;
  const skuId = skuWrapper?.sku?.id;
  return typeof skuId === "string" ? skuId : "";
};

const getRowSkuId = (row: InventorySnapshotOutput) =>
  getNormalizedSkuId(row) ||
  row.stockItem?.variantId ||
  row.stockItem?.productId ||
  getVariantId(row.stockItem?.variant) ||
  row.stockItem?.product?.id ||
  "";

const toStockMap = (
  warehouseId: string,
  skuIds: string[],
  rows: InventorySnapshotOutput[],
): StockMap => {
  const result: StockMap = Object.fromEntries(skuIds.map((skuId) => [skuId, null]));

  for (const row of rows) {
    const skuId = getRowSkuId(row);
    if (!skuId || !(skuId in result)) continue;

    const previous = result[skuId];
    const available = Number(row.available ?? 0);

    result[skuId] = {
      warehouseId: row.warehouseId || warehouseId,
      stockItemId: row.stockItemId,
      locationId: row.locationId,
      onHand: Number(previous?.onHand ?? 0) + Number(row.onHand ?? 0),
      reserved: Number(previous?.reserved ?? 0) + Number(row.reserved ?? 0),
      available: Number(previous?.available ?? 0) + available,
      updatedAt: new Date().toISOString(),
    };
  }

  return result;
};

export const getSaleOrderStocksBySkuIds = async ({
  warehouseId,
  skuIds,
  forceRefresh = false,
  requestKey,
}: StockRequest): Promise<StockMap> => {
  const normalizedSkuIds = normalizeSkuIds(skuIds);
  if (!warehouseId || normalizedSkuIds.length === 0) return {};

  const key = `${warehouseId}:${normalizedSkuIds.join("|")}`;
  const pendingKey = requestKey ? `${key}:${requestKey}` : key;

  if (!forceRefresh) {
    const cached = cache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
  }

  const inFlight = pending.get(pendingKey);
  if (inFlight) return inFlight;

  const request = listInventory({
    page: 1,
    limit: Math.max(normalizedSkuIds.length, 1),
    warehouseId,
    skuIdsIn: normalizedSkuIds,
  })
    .then((response) => {
      const value = toStockMap(warehouseId, normalizedSkuIds, response.items ?? []);
      cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, value });
      return value;
    })
    .finally(() => {
      pending.delete(pendingKey);
    });

  pending.set(pendingKey, request);
  return request;
};
