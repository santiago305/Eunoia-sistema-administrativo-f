import { beforeEach, describe, expect, it } from "vitest";
import {
  clearPendingSaleOrderCancellation,
  loadPendingSaleOrderCancellation,
  savePendingSaleOrderCancellation,
  type PendingSaleOrderCancellation,
} from "./sale-order-cancellation-recovery";

const operation: PendingSaleOrderCancellation = {
  userId: "user-1",
  saleOrderId: "order-1",
  idempotencyKey: "550e8400-e29b-41d4-a716-446655440000",
  resolutions: [{ incomeId: "income-1", action: "KEEP_AS_CREDIT", reason: "Conservar como saldo" }],
  createdAt: "2026-10-13T12:00:00.000Z",
};

describe("sale-order cancellation recovery", () => {
  beforeEach(() => sessionStorage.clear());

  it("persists the exact request scoped to both user and order", () => {
    expect(savePendingSaleOrderCancellation(operation)).toBe(true);
    expect(loadPendingSaleOrderCancellation("user-1", "order-1")).toEqual(operation);
    expect(loadPendingSaleOrderCancellation("user-2", "order-1")).toBeNull();
    expect(loadPendingSaleOrderCancellation("user-1", "order-2")).toBeNull();
  });

  it("rejects malformed or non-UUID idempotency keys", () => {
    sessionStorage.setItem("eunoia:pending-sale-order-cancellation:user-1:order-1", JSON.stringify({
      ...operation,
      idempotencyKey: "not-a-uuid",
    }));
    expect(loadPendingSaleOrderCancellation("user-1", "order-1")).toBeNull();
    expect(sessionStorage.getItem("eunoia:pending-sale-order-cancellation:user-1:order-1")).toBeNull();
  });

  it("clears only the matching operation so a newer retry cannot be removed", () => {
    savePendingSaleOrderCancellation(operation);
    const newer = { ...operation, idempotencyKey: "550e8400-e29b-41d4-a716-446655440001" };
    savePendingSaleOrderCancellation(newer);
    clearPendingSaleOrderCancellation(operation);
    expect(loadPendingSaleOrderCancellation("user-1", "order-1")).toEqual(newer);
    clearPendingSaleOrderCancellation(newer);
    expect(loadPendingSaleOrderCancellation("user-1", "order-1")).toBeNull();
  });
});
