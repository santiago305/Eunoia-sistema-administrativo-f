import { env } from "@/env";

type StockUpdatedEvent = {
  warehouseId: string;
  stockItemId: string;
  locationId?: string | null;
  onHand: number;
  reserved: number;
  available: number;
  documentId?: string;
  occurredAt: string;
};

type StockUpdatedHandler = (event: StockUpdatedEvent) => void;

type InventoryStockUpdatedSubscriptionOptions = {
  warehouseIds?: string[];
  stockItemIds?: string[];
};

const normalizeIds = (values?: string[]) =>
  Array.from(new Set((values ?? []).map((value) => value?.trim()).filter(Boolean)));

const buildInventoryStreamUrl = (options?: InventoryStockUpdatedSubscriptionOptions) => {
  const base = env.apiBaseUrl.endsWith("/") ? env.apiBaseUrl.slice(0, -1) : env.apiBaseUrl;
  const url = new URL(`${base}/inventory/stream`);
  const warehouseIds = normalizeIds(options?.warehouseIds);
  const stockItemIds = normalizeIds(options?.stockItemIds);

  if (warehouseIds.length === 1) {
    url.searchParams.set("warehouseId", warehouseIds[0]!);
  } else if (warehouseIds.length > 1) {
    url.searchParams.set("warehouseIds", warehouseIds.join(","));
  }

  if (stockItemIds.length === 1) {
    url.searchParams.set("stockItemId", stockItemIds[0]!);
  } else if (stockItemIds.length > 1) {
    url.searchParams.set("stockItemIds", stockItemIds.join(","));
  }

  return url.toString();
};

export const subscribeInventoryStockUpdated = (
  handler: StockUpdatedHandler,
  options?: InventoryStockUpdatedSubscriptionOptions,
) => {
  const source = new EventSource(buildInventoryStreamUrl(options), { withCredentials: true });

  const onEvent = (event: MessageEvent<string>) => {
    try {
      const payload = JSON.parse(event.data) as StockUpdatedEvent;
      handler(payload);
    } catch {
      // Ignore malformed events.
    }
  };

  source.addEventListener("stock.updated", onEvent as EventListener);
  source.onmessage = onEvent;

  return () => {
    source.removeEventListener("stock.updated", onEvent as EventListener);
    source.close();
  };
};
