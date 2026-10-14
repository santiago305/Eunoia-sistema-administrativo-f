import type { SaleOrderCancellationResolution } from "@/shared/services/saleOrderService";

export type PendingSaleOrderCancellation = {
  userId: string;
  saleOrderId: string;
  idempotencyKey: string;
  resolutions: SaleOrderCancellationResolution[];
  createdAt: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const keyFor = (userId: string, saleOrderId: string) => `eunoia:pending-sale-order-cancellation:${userId}:${saleOrderId}`;

const sessionStore = (): Storage | null => {
  try { return typeof sessionStorage === "undefined" ? null : sessionStorage; }
  catch { return null; }
};

const isResolution = (value: unknown): value is SaleOrderCancellationResolution => {
  if (!value || typeof value !== "object") return false;
  const item = value as SaleOrderCancellationResolution;
  return typeof item.incomeId === "string"
    && ["CANCEL_PENDING", "KEEP_AS_CREDIT", "TRANSFER_PENDING", "APPLY_TO_ORDER", "REFUND"].includes(item.action)
    && typeof item.reason === "string"
    && (item.targetSaleOrderId === undefined || typeof item.targetSaleOrderId === "string")
    && (item.amount === undefined || (typeof item.amount === "number" && Number.isFinite(item.amount)));
};

const isPending = (value: unknown, userId: string, saleOrderId: string): value is PendingSaleOrderCancellation => {
  if (!value || typeof value !== "object") return false;
  const item = value as PendingSaleOrderCancellation;
  return item.userId === userId
    && item.saleOrderId === saleOrderId
    && UUID.test(item.idempotencyKey)
    && Array.isArray(item.resolutions)
    && item.resolutions.every(isResolution)
    && typeof item.createdAt === "string";
};

export const loadPendingSaleOrderCancellation = (userId: string, saleOrderId: string): PendingSaleOrderCancellation | null => {
  const storage = sessionStore();
  if (!storage || !userId || !saleOrderId) return null;
  try {
    const raw = storage.getItem(keyFor(userId, saleOrderId));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (isPending(parsed, userId, saleOrderId)) return parsed;
    storage.removeItem(keyFor(userId, saleOrderId));
  } catch { /* A malformed or inaccessible session entry is not trusted. */ }
  return null;
};

export const savePendingSaleOrderCancellation = (operation: PendingSaleOrderCancellation): boolean => {
  const storage = sessionStore();
  if (!storage || !operation.userId || !operation.saleOrderId || !UUID.test(operation.idempotencyKey)) return false;
  try {
    storage.setItem(keyFor(operation.userId, operation.saleOrderId), JSON.stringify(operation));
    return true;
  } catch { return false; }
};

export const clearPendingSaleOrderCancellation = (operation: PendingSaleOrderCancellation): void => {
  const storage = sessionStore();
  if (!storage) return;
  try {
    const current = loadPendingSaleOrderCancellation(operation.userId, operation.saleOrderId);
    if (current?.idempotencyKey === operation.idempotencyKey) {
      storage.removeItem(keyFor(operation.userId, operation.saleOrderId));
    }
  } catch { /* Cleanup is best effort; replaying the same key remains safe. */ }
};
