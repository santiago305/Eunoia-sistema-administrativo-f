import axiosInstance from "@/shared/common/utils/axios";
import { API_INCOME_GROUP } from "@/shared/services/APIs";
import type {
  Income,
  IncomeEvidenceSummary,
  IncomeListQuery,
  IncomeListResponse,
  IncomeSearchSnapshot,
  IncomeSearchStateResponse,
  IncomeSummary,
} from "@/features/income/types/income.types";

const serializeQuery = (query: IncomeListQuery = {}) => ({
  ...query,
  filters: query.filters?.length ? JSON.stringify(query.filters) : undefined,
});

export const listIncome = async (query: IncomeListQuery = {}): Promise<IncomeListResponse> => {
  const response = await axiosInstance.get<IncomeListResponse>(API_INCOME_GROUP.list, { params: serializeQuery(query) });
  return response.data;
};

export const exportIncomeExcel = async (input: {
  columns: Array<{ key: string; label: string }>;
  q?: string;
  from?: string;
  to?: string;
  filters?: IncomeSearchSnapshot["filters"];
}): Promise<Blob> => {
  const response = await axiosInstance.post<Blob>(API_INCOME_GROUP.exportExcel, input, { responseType: "blob" });
  return response.data;
};

export const getIncomeSummary = async (query: IncomeListQuery = {}): Promise<IncomeSummary> => {
  const response = await axiosInstance.get<IncomeSummary>(API_INCOME_GROUP.summary, { params: serializeQuery(query) });
  return response.data;
};

export const getIncomeSearchState = async (): Promise<IncomeSearchStateResponse> => {
  const response = await axiosInstance.get<IncomeSearchStateResponse>(API_INCOME_GROUP.searchState);
  return response.data;
};

export const saveIncomeSearchMetric = async (
  name: string,
  snapshot: IncomeSearchSnapshot,
): Promise<{ type: string; message: string }> => {
  const response = await axiosInstance.post(API_INCOME_GROUP.saveSearchMetric, { name, snapshot });
  return response.data;
};

export const deleteIncomeSearchMetric = async (
  metricId: string,
): Promise<{ type: string; message: string }> => {
  const response = await axiosInstance.delete(API_INCOME_GROUP.deleteSearchMetric(metricId));
  return response.data;
};

export const getIncomeEvidence = async (incomeId: string): Promise<IncomeEvidenceSummary & { incomeId: string; saleOrderId: string; saleOrderPaymentId: string }> => {
  const response = await axiosInstance.get(API_INCOME_GROUP.evidence(incomeId));
  return response.data;
};

/**
 * Evidence is private and requires the authenticated axios client. Returning
 * a blob URL avoids a direct browser request to the API, which is rejected by
 * the browser's cross-origin resource policy in production.
 */
export const getIncomeEvidenceContent = async (incomeId: string): Promise<string> => {
  const response = await axiosInstance.get<Blob>(API_INCOME_GROUP.evidenceContent(incomeId), {
    responseType: "blob",
  });
  return URL.createObjectURL(response.data);
};

export type IncomeEvidenceRevision = {
  attachmentId: string;
  incomeId: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedByUserId: string | null;
  note: string | null;
  contentSha256: string | null;
  createdAt: string;
  isCurrent: boolean;
};

export const getIncomeEvidenceRevisions = async (incomeId: string, limit = 50): Promise<IncomeEvidenceRevision[]> => {
  const response = await axiosInstance.get<IncomeEvidenceRevision[]>(API_INCOME_GROUP.evidenceRevisions(incomeId), { params: { limit } });
  return response.data;
};

export const getIncomeEvidenceRevisionContent = async (incomeId: string, attachmentId: string): Promise<string> => {
  const response = await axiosInstance.get<Blob>(API_INCOME_GROUP.evidenceRevisionContent(incomeId, attachmentId), {
    responseType: "blob",
  });
  return URL.createObjectURL(response.data);
};

export type QuarantinedIncomeEvidence = {
  id: string;
  incomeId: string;
  saleOrderId: string;
  uploadedByUserId: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  errorCode: string | null;
  attempts: number;
  createdAt: string;
  updatedAt: string;
  fileAvailable: boolean;
};

export const getIncomeEvidenceQuarantine = async (incomeId: string): Promise<QuarantinedIncomeEvidence[]> => {
  const response = await axiosInstance.get<QuarantinedIncomeEvidence[]>(API_INCOME_GROUP.evidenceQuarantine(incomeId));
  return response.data;
};

export const recoverIncomeEvidenceQuarantine = async (
  incomeId: string,
  operationId: string,
  reason: string,
): Promise<{ operationId: string; incomeId: string; attachmentId: string; status: "COMPLETED" }> => {
  const response = await axiosInstance.post(API_INCOME_GROUP.recoverEvidenceQuarantine(incomeId, operationId), { reason });
  return response.data;
};

export const uploadIncomeEvidence = async (incomeId: string, file: File, idempotencyKey: string) => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await axiosInstance.post(API_INCOME_GROUP.evidence(incomeId), formData, {
    headers: { "Idempotency-Key": idempotencyKey },
  });
  return response.data;
};

export type IncomePaymentVersion = { id: string; version: number };
export type IncomePostValidation = {
  paymentDate: string | null;
  count: number;
  withEvidence: number;
  withoutEvidence: number;
  totalsByCurrency: Record<string, number>;
  eligibleIds: string[];
  warnings: Array<{ incomeId: string; code: string; message: string }>;
  errors: Array<{ incomeId: string; code: string; message: string }>;
  canPost: boolean;
};

export const editPendingIncome = async (incomeId: string, input: {
  idempotencyKey: string; version: number; amount: number; date: string; paymentMethodId: string;
  companyPaymentAccountId: string; operationNumber?: string | null; note?: string | null;
}) => (await axiosInstance.patch(API_INCOME_GROUP.editPending(incomeId), input)).data;

export const correctPostedIncome = async (incomeId: string, input: {
  version: number; amount: number; date: string; paymentMethodId: string; companyPaymentAccountId: string;
  operationNumber?: string | null; note?: string | null; reason: string; idempotencyKey: string; confirmExcess?: boolean;
}) => (await axiosInstance.post(API_INCOME_GROUP.correctPosted(incomeId), input)).data;

export const uploadCorrectedIncomeEvidence = async (incomeId: string, file: File, idempotencyKey: string) => {
  const formData = new FormData();
  formData.append("file", file);
  return (await axiosInstance.post(API_INCOME_GROUP.correctionEvidence(incomeId), formData, {
    headers: { "Idempotency-Key": idempotencyKey },
  })).data;
};

export const transferPendingIncome = async (income: Income, targetSaleOrderId: string, reason: string, idempotencyKey: string) =>
  (await axiosInstance.post(API_INCOME_GROUP.transferPending(income.incomeId), {
    targetSaleOrderId,
    version: income.version,
    reason,
    idempotencyKey,
  })).data;

export const recoverPendingIncomeTransfer = async (incomeId: string, input: {
  version: number; targetSaleOrderId: string; reason: string; idempotencyKey: string;
}) => (await axiosInstance.post(API_INCOME_GROUP.transferPending(incomeId), input)).data;

export type IncomeTransferTarget = {
  saleOrderId: string;
  saleOrderNumber: string;
  clientName: string;
  total: number;
  available: number;
  currency: string;
};

export const listIncomeTransferTargets = async (incomeId: string, q = ""): Promise<IncomeTransferTarget[]> =>
  (await axiosInstance.get<IncomeTransferTarget[]>(API_INCOME_GROUP.transferTargets(incomeId), { params: { q: q.trim() || undefined } })).data;

export const listIncomeCancellationTargets = async (incomeId: string, q = ""): Promise<IncomeTransferTarget[]> =>
  (await axiosInstance.get<IncomeTransferTarget[]>(API_INCOME_GROUP.cancellationTargets(incomeId), { params: { q: q.trim() || undefined } })).data;

export const prevalidateIncomePost = async (income: Income) => (await axiosInstance.post<IncomePostValidation>(API_INCOME_GROUP.prevalidatePost(income.incomeId), { version: income.version })).data;
export const postIncome = async (income: Pick<Income, "incomeId" | "version">, idempotencyKey: string, confirmExcess = false) => (await axiosInstance.post(API_INCOME_GROUP.post(income.incomeId), { version: income.version, idempotencyKey, confirmExcess })).data;
export const cancelPendingIncome = async (income: Pick<Income, "incomeId" | "version">, reason: string, idempotencyKey: string) => (await axiosInstance.post(API_INCOME_GROUP.cancel(income.incomeId), { version: income.version, reason, idempotencyKey })).data;
export const reversePostedIncome = async (income: Pick<Income, "incomeId" | "version">, reason: string, idempotencyKey: string) => (await axiosInstance.post(API_INCOME_GROUP.reverse(income.incomeId), { version: income.version, reason, idempotencyKey })).data;
export const reenterIncome = async (incomeId: string, input: {
  reason: string; idempotencyKey: string; amount: number; date: string; paymentMethodId: string;
  companyPaymentAccountId: string; operationNumber: string | null; note: string | null;
}) => (await axiosInstance.post(API_INCOME_GROUP.reenter(incomeId), input)).data;
export const prevalidateIncomeBatch = async (payments: IncomePaymentVersion[]) => (await axiosInstance.post<IncomePostValidation>(API_INCOME_GROUP.prevalidateBatch, { payments })).data;
export const postIncomeBatch = async (payments: IncomePaymentVersion[], idempotencyKey: string, confirmExcess = false) => (await axiosInstance.post(API_INCOME_GROUP.postBatch, { payments, idempotencyKey, confirmExcess })).data;
export const getIncomeBatchResult = async (batchId: string) => (await axiosInstance.get(API_INCOME_GROUP.batchResult(batchId))).data;
export const getIncomePostingResult = async (operationId: string) => (await axiosInstance.get(API_INCOME_GROUP.postingOperationResult(operationId))).data;

export type CustomerCreditBalance = { currency: string; available: number };
export const getCustomerCreditBalances = async (clientId: string): Promise<CustomerCreditBalance[]> =>
  (await axiosInstance.get<CustomerCreditBalance[]>(API_INCOME_GROUP.customerCredits(clientId))).data;

export const applyCustomerCredit = async (input: {
  clientId: string;
  saleOrderId: string;
  amount: number;
  reason: string;
  idempotencyKey: string;
}) => (await axiosInstance.post(API_INCOME_GROUP.applyCustomerCredit, input)).data;

export type IncomeRefund = {
  id: string;
  amount: number;
  currency: string;
  status: "PENDING" | "POSTED" | "CANCELLED" | "REVERSED";
  operationNumber: string | null;
  reason: string;
  createdByUserId: string;
  postedByUserId: string | null;
  postedAt: string | null;
  reversedByUserId: string | null;
  reversedAt: string | null;
  createdAt: string;
  companyPaymentAccountId: string | null;
};

export const listIncomeRefunds = async (incomeId: string): Promise<{ items: IncomeRefund[]; availableCredit: number }> =>
  (await axiosInstance.get<{ items: IncomeRefund[]; availableCredit: number }>(API_INCOME_GROUP.refunds(incomeId))).data;

export const createIncomeRefund = async (incomeId: string, input: { amount: number; reason: string; idempotencyKey: string }) =>
  (await axiosInstance.post(API_INCOME_GROUP.refunds(incomeId), input)).data;

export const postIncomeRefund = async (refundId: string, input: {
  companyPaymentAccountId: string;
  operationNumber: string;
  idempotencyKey: string;
}) => (await axiosInstance.post(API_INCOME_GROUP.postRefund(refundId), input)).data;

export const cancelIncomeRefund = async (refundId: string, reason: string, idempotencyKey: string) =>
  (await axiosInstance.post(API_INCOME_GROUP.cancelRefund(refundId), { reason, idempotencyKey })).data;

export const reverseIncomeRefund = async (refundId: string, reason: string, idempotencyKey: string) =>
  (await axiosInstance.post(API_INCOME_GROUP.reverseRefund(refundId), { reason, idempotencyKey })).data;

export type BankStatementLine = {
  id: string;
  companyPaymentAccountId: string;
  bankReference: string;
  operationDate: string;
  amount: string;
  currency: string;
  available: string;
};

export type IncomeReconciliation = {
  id: string;
  amount: string;
  createdAt: string;
  unreconciledAt: string | null;
  unreconcileReason: string | null;
  bankReference: string;
  operationDate: string;
  statementAmount: string;
  currency: string;
  companyPaymentAccountId: string;
};

export type IncomeReconciliationStatus = "UNRECONCILED" | "PARTIALLY_RECONCILED" | "RECONCILED";

export type BankReconciliationReport = {
  from: string;
  to: string;
  items: Array<Pick<BankStatementLine, "id" | "companyPaymentAccountId" | "bankReference" | "operationDate" | "amount" | "currency"> & {
    accountName: string;
    reconciledAmount: string;
    availableAmount: string;
    activeAllocationCount: number;
    status: IncomeReconciliationStatus;
  }>;
  totalsByCurrency: Record<string, { statementAmount: number; reconciledAmount: number; availableAmount: number; lineCount: number }>;
  truncated: boolean;
};

export const getBankReconciliationReport = async (query: {
  from: string; to: string; companyPaymentAccountId?: string;
}): Promise<BankReconciliationReport> =>
  (await axiosInstance.get<BankReconciliationReport>(API_INCOME_GROUP.reconciliationReport, { params: query })).data;

export const listAvailableBankStatementLines = async (companyPaymentAccountId?: string): Promise<BankStatementLine[]> =>
  (await axiosInstance.get<BankStatementLine[]>(API_INCOME_GROUP.reconciliationLines, {
    params: companyPaymentAccountId ? { companyPaymentAccountId } : undefined,
  })).data;

export const listIncomeReconciliations = async (incomeId: string): Promise<{
  items: IncomeReconciliation[];
  reconciledAmount: number;
  status: IncomeReconciliationStatus;
}> => (await axiosInstance.get(API_INCOME_GROUP.reconciliations(incomeId))).data;

export const createBankStatementLine = async (input: {
  companyPaymentAccountId: string;
  bankReference: string;
  operationDate: string;
  amount: number;
  currency: string;
  idempotencyKey: string;
}) => (await axiosInstance.post(API_INCOME_GROUP.reconciliationLine, input)).data;

export const reconcileIncome = async (incomeId: string, input: {
  bankStatementLineId: string;
  amount: number;
  idempotencyKey: string;
}) => (await axiosInstance.post(API_INCOME_GROUP.reconcileIncome(incomeId), input)).data;

export const unreconcileIncome = async (incomeId: string, allocationId: string, reason: string, idempotencyKey: string) =>
  (await axiosInstance.post(API_INCOME_GROUP.unreconcileIncome(incomeId, allocationId), { reason, idempotencyKey })).data;
