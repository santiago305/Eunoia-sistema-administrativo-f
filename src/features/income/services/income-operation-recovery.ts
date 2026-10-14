import { createIdempotencyKey } from "@/shared/utils/idempotencyKey";

export type PendingIncomeOperation = {
  operationId: string;
  userId: string;
  incomeId: string;
  kind: string;
  idempotencyKey: string;
  payload: Record<string, string | number | boolean | null>;
  createdAt: string;
};

const storageKey = (userId: string) => `eunoia:income-pending-operations:${userId}`;

const sessionStore = (): Storage | null => {
  try { return typeof sessionStorage === "undefined" ? null : sessionStorage; }
  catch { return null; }
};

const read = (userId: string): PendingIncomeOperation[] => {
  const storage = sessionStore();
  if (!storage || !userId) return [];
  try {
    const parsed: unknown = JSON.parse(storage.getItem(storageKey(userId)) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is PendingIncomeOperation => Boolean(
      item && typeof item === "object"
      && (item as PendingIncomeOperation).userId === userId
      && typeof (item as PendingIncomeOperation).operationId === "string"
      && typeof (item as PendingIncomeOperation).incomeId === "string"
      && typeof (item as PendingIncomeOperation).kind === "string"
      && typeof (item as PendingIncomeOperation).idempotencyKey === "string"
      && (item as PendingIncomeOperation).payload
      && typeof (item as PendingIncomeOperation).payload === "object",
    ));
  } catch { return []; }
};

const write = (userId: string, operations: PendingIncomeOperation[]) => {
  const storage = sessionStore();
  if (!storage || !userId) return;
  try {
    if (operations.length) storage.setItem(storageKey(userId), JSON.stringify(operations.slice(-20)));
    else storage.removeItem(storageKey(userId));
  } catch { /* Recovery remains available while the current modal stays mounted. */ }
};

export const listPendingIncomeOperations = (userId: string, incomeId: string): PendingIncomeOperation[] =>
  read(userId).filter((operation) => operation.incomeId === incomeId);

export const listAllPendingIncomeOperations = (userId: string): PendingIncomeOperation[] => read(userId);

export const savePendingIncomeOperation = (operation: PendingIncomeOperation) => {
  const current = read(operation.userId).filter((item) => item.operationId !== operation.operationId);
  write(operation.userId, [...current, operation]);
};

export const clearPendingIncomeOperation = (operation: PendingIncomeOperation) => {
  write(operation.userId, read(operation.userId).filter((item) =>
    item.operationId !== operation.operationId || item.idempotencyKey !== operation.idempotencyKey));
};

export const getOrCreatePendingIncomeEvidenceUpload = (userId: string, incomeId: string): PendingIncomeOperation => {
  const operationId = `income.evidence-upload:${incomeId}`;
  const existing = listPendingIncomeOperations(userId, incomeId).find((operation) =>
    operation.operationId === operationId && operation.kind === "income.evidence-upload");
  if (existing) return existing;
  const operation: PendingIncomeOperation = {
    operationId,
    userId,
    incomeId,
    kind: "income.evidence-upload",
    idempotencyKey: createIdempotencyKey(),
    payload: {},
    createdAt: new Date().toISOString(),
  };
  savePendingIncomeOperation(operation);
  return operation;
};

export const clearPendingIncomeEvidenceUpload = (userId: string, incomeId: string) => {
  const operation = listPendingIncomeOperations(userId, incomeId).find((item) =>
    item.operationId === `income.evidence-upload:${incomeId}` && item.kind === "income.evidence-upload");
  if (operation) clearPendingIncomeOperation(operation);
};

export const shouldRetainPendingIncomeEvidenceUpload = (error: unknown) => {
  const status = (error as { response?: { status?: number } } | null)?.response?.status;
  const code = (error as { response?: { data?: { code?: string } } } | null)?.response?.data?.code;
  return status === undefined || status === 0 || status === 408 || status === 429 || status >= 500
    || code === "PAYMENT_EVIDENCE_UPLOAD_IN_PROGRESS";
};

