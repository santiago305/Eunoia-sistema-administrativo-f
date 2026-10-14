import { beforeEach, describe, expect, it, vi } from "vitest";

const { postMock, getMock } = vi.hoisted(() => ({ postMock: vi.fn(), getMock: vi.fn() }));
vi.mock("@/shared/common/utils/axios", () => ({ default: { post: postMock, get: getMock } }));

import { applyCustomerCredit, cancelIncomeRefund, correctPostedIncome, createBankStatementLine, createIncomeRefund, exportIncomeExcel, getCustomerCreditBalances, getIncomeBatchResult, getIncomeEvidenceQuarantine, getIncomeEvidenceRevisionContent, getIncomeEvidenceRevisions, getIncomePostingResult, listAvailableBankStatementLines, listIncomeCancellationTargets, listIncomeReconciliations, listIncomeRefunds, listIncomeTransferTargets, postIncomeRefund, reconcileIncome, recoverIncomeEvidenceQuarantine, reverseIncomeRefund, transferPendingIncome, unreconcileIncome, uploadCorrectedIncomeEvidence, uploadIncomeEvidence } from "./incomeService";
import type { Income, IncomeSearchSnapshot } from "@/features/income/types/income.types";

const income = { incomeId: "income-1", version: 7 } as Income;

describe("transferPendingIncome", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    postMock.mockResolvedValue({ data: { status: "PENDING_CONFIRMATION", version: 8 } });
    getMock.mockResolvedValue({ data: [{ saleOrderId: "order-2", currency: "PEN", available: 30 }] });
  });

  it("sends the optimistic version, target, reason, and idempotency key to the transfer route", async () => {
    await expect(transferPendingIncome(income, "order-2", "Pedido asociado incorrecto", "operation-key"))
      .resolves.toMatchObject({ status: "PENDING_CONFIRMATION", version: 8 });
    expect(postMock).toHaveBeenCalledWith("/income/income-1/transfer", {
      targetSaleOrderId: "order-2",
      version: 7,
      reason: "Pedido asociado incorrecto",
      idempotencyKey: "operation-key",
    });
  });

  it("requests server-filtered transfer targets with the search text", async () => {
    await expect(listIncomeTransferTargets("income-1", " SO-2 ")).resolves.toEqual([
      { saleOrderId: "order-2", currency: "PEN", available: 30 },
    ]);
    expect(getMock).toHaveBeenCalledWith("/income/income-1/transfer-targets", { params: { q: "SO-2" } });
  });

  it("loads eligible destination orders when resolving a cancelled order payment", async () => {
    getMock.mockResolvedValueOnce({ data: [{ saleOrderId: "order-2", saleOrderNumber: "SO-2", currency: "PEN", available: 30 }] });
    await expect(listIncomeCancellationTargets("income-1", " SO-2 ")).resolves.toEqual([
      { saleOrderId: "order-2", saleOrderNumber: "SO-2", currency: "PEN", available: 30 },
    ]);
    expect(getMock).toHaveBeenCalledWith("/income/income-1/cancellation-targets", { params: { q: "SO-2" } });
  });

  it("recovers a persisted bulk-post result by its batch id", async () => {
    getMock.mockResolvedValueOnce({ data: { batchId: "batch-1", count: 2 } });
    await expect(getIncomeBatchResult("batch-1")).resolves.toEqual({ batchId: "batch-1", count: 2 });
    expect(getMock).toHaveBeenCalledWith("/income/bulk-operations/batch-1");
  });

  it("recovers an individual post result by its idempotency key", async () => {
    getMock.mockResolvedValueOnce({ data: { batchId: "operation-1", count: 1 } });
    await expect(getIncomePostingResult("operation-1")).resolves.toEqual({ batchId: "operation-1", count: 1 });
    expect(getMock).toHaveBeenCalledWith("/income/posting-operations/operation-1");
  });

  it("reads customer credit and submits an idempotent application to an order", async () => {
    getMock.mockResolvedValueOnce({ data: [{ currency: "PEN", available: 20 }] });
    await expect(getCustomerCreditBalances("client-1")).resolves.toEqual([{ currency: "PEN", available: 20 }]);
    expect(getMock).toHaveBeenCalledWith("/income/credits/client-1");

    await applyCustomerCredit({ clientId: "client-1", saleOrderId: "order-2", amount: 15, reason: "Saldo aplicado", idempotencyKey: "credit-application-key" });
    expect(postMock).toHaveBeenCalledWith("/income/credits/apply", {
      clientId: "client-1", saleOrderId: "order-2", amount: 15, reason: "Saldo aplicado", idempotencyKey: "credit-application-key",
    });
  });

  it("lists and executes refund lifecycle operations with their own routes", async () => {
    const refund = { id: "refund-1", status: "PENDING", amount: 12.5, currency: "PEN" };
    getMock.mockResolvedValueOnce({ data: { items: [refund], availableCredit: 20 } });
    await expect(listIncomeRefunds("income-1")).resolves.toEqual({ items: [refund], availableCredit: 20 });
    expect(getMock).toHaveBeenCalledWith("/income/income-1/refunds");

    await createIncomeRefund("income-1", { amount: 10, reason: "Devolución autorizada", idempotencyKey: "create-refund-key" });
    expect(postMock).toHaveBeenCalledWith("/income/income-1/refunds", { amount: 10, reason: "Devolución autorizada", idempotencyKey: "create-refund-key" });

    await postIncomeRefund("refund-1", { companyPaymentAccountId: "out-account", operationNumber: "REF-1", idempotencyKey: "post-refund-key" });
    expect(postMock).toHaveBeenCalledWith("/income/refunds/refund-1/post", { companyPaymentAccountId: "out-account", operationNumber: "REF-1", idempotencyKey: "post-refund-key" });
    await cancelIncomeRefund("refund-1", "Reserva cancelada", "cancel-refund-key");
    expect(postMock).toHaveBeenCalledWith("/income/refunds/refund-1/cancel", { reason: "Reserva cancelada", idempotencyKey: "cancel-refund-key" });
    await reverseIncomeRefund("refund-1", "Devolución errónea", "reverse-refund-key");
    expect(postMock).toHaveBeenCalledWith("/income/refunds/refund-1/reverse", { reason: "Devolución errónea", idempotencyKey: "reverse-refund-key" });
  });

  it("lists available statement lines and calls reconcile/desconcilia routes", async () => {
    const line = { id: "line-1", bankReference: "BANK-1", available: "30.00", currency: "PEN" };
    getMock.mockResolvedValueOnce({ data: [line] });
    await expect(listAvailableBankStatementLines("account-1")).resolves.toEqual([line]);
    expect(getMock).toHaveBeenCalledWith("/income/reconciliation/statement-lines", { params: { companyPaymentAccountId: "account-1" } });

    getMock.mockResolvedValueOnce({ data: { items: [], reconciledAmount: 0, status: "UNRECONCILED" } });
    await expect(listIncomeReconciliations("income-1")).resolves.toMatchObject({ status: "UNRECONCILED" });
    expect(getMock).toHaveBeenCalledWith("/income/income-1/reconciliation");

    await createBankStatementLine({ companyPaymentAccountId: "account-1", bankReference: "BANK-1", operationDate: "2026-10-12", amount: 30, currency: "PEN", idempotencyKey: "line-key" });
    expect(postMock).toHaveBeenCalledWith("/income/reconciliation/statement-lines", expect.objectContaining({ bankReference: "BANK-1", idempotencyKey: "line-key" }));
    await reconcileIncome("income-1", { bankStatementLineId: "line-1", amount: 20, idempotencyKey: "allocation-key" });
    expect(postMock).toHaveBeenCalledWith("/income/income-1/reconciliation", { bankStatementLineId: "line-1", amount: 20, idempotencyKey: "allocation-key" });
    await unreconcileIncome("income-1", "allocation-1", "Referencia incorrecta", "unreconcile-key");
    expect(postMock).toHaveBeenCalledWith("/income/income-1/reconciliation/allocation-1/unreconcile", { reason: "Referencia incorrecta", idempotencyKey: "unreconcile-key" });
  });

  it("sends the versioned correction as one idempotent finance operation", async () => {
    await correctPostedIncome("income-1", {
      version: 7,
      amount: 32.5,
      date: "2026-10-12",
      paymentMethodId: "method-1",
      companyPaymentAccountId: "account-1",
      operationNumber: "OP-2",
      note: "Monto corregido",
      reason: "Corrección autorizada",
      idempotencyKey: "correction-operation-key",
      confirmExcess: false,
    });
    expect(postMock).toHaveBeenCalledWith("/income/income-1/correct", {
      version: 7,
      amount: 32.5,
      date: "2026-10-12",
      paymentMethodId: "method-1",
      companyPaymentAccountId: "account-1",
      operationNumber: "OP-2",
      note: "Monto corregido",
      reason: "Corrección autorizada",
      idempotencyKey: "correction-operation-key",
      confirmExcess: false,
    });
  });

  it("uploads replacement evidence to the new corrected payment route", async () => {
    const file = new File(["image"], "corrected.png", { type: "image/png" });
    await uploadCorrectedIncomeEvidence("corrected-income-1", file, "11111111-1111-4111-8111-111111111111");
    expect(postMock).toHaveBeenCalledWith("/income/corrected-income-1/correction-evidence", expect.any(FormData), {
      headers: { "Idempotency-Key": "11111111-1111-4111-8111-111111111111" },
    });
  });
});

describe("exportIncomeExcel", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends the executed filters and requests an Excel blob", async () => {
    const blob = new Blob(["xlsx"]);
    postMock.mockResolvedValueOnce({ data: blob });
    const filters: IncomeSearchSnapshot["filters"] = [{ field: "reconciliationStatus", operator: "in", mode: "include", values: ["PARTIALLY_RECONCILED"] }];
    const columns = [{ key: "reconciliationStatus", label: "Estado de conciliación" }];
    await expect(exportIncomeExcel({ columns, from: "2026-10-01", to: "2026-10-12", filters })).resolves.toBe(blob);
    expect(postMock).toHaveBeenCalledWith("/income/export-excel", {
      columns, from: "2026-10-01", to: "2026-10-12", filters,
    }, { responseType: "blob" });
  });
});

describe("income evidence upload idempotency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    postMock.mockResolvedValue({ data: { id: "attachment-1" } });
  });

  it("sends a stable operation key with a pending-payment evidence upload", async () => {
    const file = new File(["image"], "proof.png", { type: "image/png" });
    await uploadIncomeEvidence("income-1", file, "11111111-1111-4111-8111-111111111111");
    expect(postMock).toHaveBeenCalledWith("/income/income-1/evidence", expect.any(FormData), {
      headers: { "Idempotency-Key": "11111111-1111-4111-8111-111111111111" },
    });
  });
});

describe("income evidence revisions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads bounded revision metadata through the scoped API route", async () => {
    const revisions = [{ attachmentId: "revision-1", incomeId: "income-1", isCurrent: false }];
    getMock.mockResolvedValueOnce({ data: revisions });
    await expect(getIncomeEvidenceRevisions("income-1", 25)).resolves.toEqual(revisions);
    expect(getMock).toHaveBeenCalledWith("/income/income-1/evidence/revisions", { params: { limit: 25 } });
  });

  it("fetches a specific revision as an authenticated blob", async () => {
    const blob = new Blob(["evidence"]);
    const originalCreateObjectUrl = URL.createObjectURL;
    const createObjectUrl = vi.fn(() => "blob:revision-1");
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectUrl });
    getMock.mockResolvedValueOnce({ data: blob });
    try {
      await expect(getIncomeEvidenceRevisionContent("income-1", "revision-1")).resolves.toBe("blob:revision-1");
      expect(getMock).toHaveBeenCalledWith("/income/income-1/evidence/revisions/revision-1/content", { responseType: "blob" });
      expect(createObjectUrl).toHaveBeenCalledWith(blob);
    } finally {
      Object.defineProperty(URL, "createObjectURL", { configurable: true, value: originalCreateObjectUrl });
    }
  });
});

describe("income evidence quarantine administration", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists only scoped quarantine metadata", async () => {
    const items = [{ id: "op-1", fileAvailable: true }];
    getMock.mockResolvedValueOnce({ data: items });
    await expect(getIncomeEvidenceQuarantine("income-1")).resolves.toEqual(items);
    expect(getMock).toHaveBeenCalledWith("/income/income-1/evidence/quarantine");
  });

  it("sends the explicit operator reason to the recovery endpoint", async () => {
    postMock.mockResolvedValueOnce({ data: { operationId: "op-1", incomeId: "income-1", attachmentId: "attachment-1", status: "COMPLETED" } });
    await expect(recoverIncomeEvidenceQuarantine("income-1", "op-1", "Falso positivo validado")).resolves.toMatchObject({ status: "COMPLETED" });
    expect(postMock).toHaveBeenCalledWith("/income/income-1/evidence/quarantine/op-1/recover", { reason: "Falso positivo validado" });
  });
});
