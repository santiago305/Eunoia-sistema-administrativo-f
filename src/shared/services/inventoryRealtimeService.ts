import { env } from "@/env";

type StockUpdatedEvent = {
  warehouseId: string;
  stockItemId: string;
  locationId?: string | null;
  onHand: number;
  reserved: number;
  available: number;
  documentId?: string;
  docType?: string;
  productType?: string;
  occurredAt: string;
};

type StockUpdatedHandler = (event: StockUpdatedEvent) => void;

type InventoryStockUpdatedSubscriptionOptions = {
  warehouseIds?: string[];
  stockItemIds?: string[];
  docTypes?: string[];
  productTypes?: string[];
};

export const INVENTORY_STREAM_MAX_RECONNECT_ATTEMPTS = 5;
export const INVENTORY_STREAM_INITIAL_BACKOFF_MS = 1_000;
export const INVENTORY_STREAM_MAX_BACKOFF_MS = 30_000;
const STABLE_CONNECTION_MS = 30_000;

type Subscriber = {
  handler: StockUpdatedHandler;
  warehouseIds: Set<string>;
  stockItemIds: Set<string>;
  docTypes: Set<string>;
  productTypes: Set<string>;
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

let sharedSource: EventSource | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
let stableTimer: ReturnType<typeof setTimeout> | undefined;
let reconnectAttempts = 0;
let waitingForVisibility = false;
const subscribers = new Set<Subscriber>();

const isHidden = () => typeof document !== "undefined" && document.hidden;

const clearTimers = () => {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  if (stableTimer) clearTimeout(stableTimer);
  reconnectTimer = undefined;
  stableTimer = undefined;
};

const closeSharedSource = () => {
  if (!sharedSource) return;
  sharedSource.removeEventListener("stock.updated", onEvent as EventListener);
  sharedSource.onmessage = null;
  sharedSource.onopen = null;
  sharedSource.onerror = null;
  sharedSource.close();
  sharedSource = null;
};

const scheduleReconnect = () => {
  if (!subscribers.size || reconnectAttempts >= INVENTORY_STREAM_MAX_RECONNECT_ATTEMPTS) return;
  if (isHidden()) {
    waitingForVisibility = true;
    return;
  }
  reconnectAttempts += 1;
  const delay = Math.min(
    INVENTORY_STREAM_INITIAL_BACKOFF_MS * 2 ** (reconnectAttempts - 1),
    INVENTORY_STREAM_MAX_BACKOFF_MS,
  );
  reconnectTimer = setTimeout(() => {
    reconnectTimer = undefined;
    openSharedSource();
  }, delay);
};

const onError = () => {
  clearTimeout(stableTimer);
  stableTimer = undefined;
  closeSharedSource();
  scheduleReconnect();
};

const onOpen = () => {
  clearTimeout(stableTimer);
  stableTimer = setTimeout(() => {
    reconnectAttempts = 0;
    stableTimer = undefined;
  }, STABLE_CONNECTION_MS);
};

const openSharedSource = () => {
  if (!subscribers.size || sharedSource) return;
  if (isHidden()) {
    waitingForVisibility = true;
    return;
  }
  // Deliberately use one unfiltered stream. Filtering is done per subscriber,
  // which prevents each page/modal from opening another SSE connection.
  sharedSource = new EventSource(buildInventoryStreamUrl(), { withCredentials: true });
  sharedSource.addEventListener("stock.updated", onEvent as EventListener);
  sharedSource.onmessage = onEvent;
  sharedSource.onopen = onOpen;
  sharedSource.onerror = onError;
};

const onEvent = (event: MessageEvent<string>) => {
  let payload: StockUpdatedEvent;
  try {
    payload = JSON.parse(event.data) as StockUpdatedEvent;
  } catch {
    return;
  }
  subscribers.forEach(({ handler, warehouseIds, stockItemIds, docTypes, productTypes }) => {
    if (warehouseIds.size && !warehouseIds.has(payload.warehouseId)) return;
    if (stockItemIds.size && !stockItemIds.has(payload.stockItemId)) return;
    if (docTypes.size && (!payload.docType || !docTypes.has(payload.docType))) return;
    if (productTypes.size && (!payload.productType || !productTypes.has(payload.productType))) return;
    handler(payload);
  });
};

const onVisibilityChange = () => {
  if (!isHidden() && waitingForVisibility) {
    waitingForVisibility = false;
    scheduleReconnect();
  }
};

if (typeof document !== "undefined") document.addEventListener("visibilitychange", onVisibilityChange);

export const subscribeInventoryStockUpdated = (
  handler: StockUpdatedHandler,
  options?: InventoryStockUpdatedSubscriptionOptions,
) => {
  const subscriber: Subscriber = {
    handler,
    warehouseIds: new Set(normalizeIds(options?.warehouseIds)),
    stockItemIds: new Set(normalizeIds(options?.stockItemIds)),
    docTypes: new Set(normalizeIds(options?.docTypes)),
    productTypes: new Set(normalizeIds(options?.productTypes)),
  };
  subscribers.add(subscriber);
  openSharedSource();

  return () => {
    subscribers.delete(subscriber);
    if (subscribers.size) return;
    clearTimers();
    waitingForVisibility = false;
    reconnectAttempts = 0;
    closeSharedSource();
  };
};
