import { describe, expect, it } from "vitest";
import {
  buildPaymentSearchChips,
  buildPaymentSearchLabel,
  buildPaymentSmartSearchColumns,
  createEmptyPaymentSearchSnapshot,
  findPaymentSearchRule,
  getPaymentSearchRuleSummary,
  getPaymentSearchSelectionCount,
  removePaymentSearchKey,
  sanitizePaymentSearchSnapshot,
  togglePaymentSearchOption,
  upsertPaymentSearchRule,
} from "./paymentSmartSearch";
import {
  PaymentSearchFields,
  PaymentSearchOperators,
  type PaymentSearchStateResponse,
} from "../types/payment-search.types";

const searchState: PaymentSearchStateResponse = {
  recent: [],
  saved: [],
  catalogs: {
    statuses: [
      { id: "PENDING_APPROVAL", label: "Pendiente aprobacion" },
      { id: "APPROVED", label: "Aprobado" },
    ],
    currencies: [
      { id: "PEN", label: "Soles" },
      { id: "USD", label: "Dolares" },
    ],
    documentTypes: [{ id: "PURCHASE", label: "Compra" }],
    evidenceStates: [
      { id: "true", label: "Con evidencia" },
      { id: "false", label: "Sin evidencia" },
    ],
    paymentMethods: [{ id: "method-1", label: "Transferencia" }],
    companyPaymentAccounts: [{ id: "account-1", label: "BCP ****1234" }],
  },
};

describe("paymentSmartSearch", () => {
  it("sanitizes payment snapshots and keeps field order", () => {
    const snapshot = sanitizePaymentSearchSnapshot({
      q: "  op-123  ",
      filters: [
        {
          field: PaymentSearchFields.AMOUNT,
          operator: PaymentSearchOperators.GTE,
          value: "100.50",
        },
        {
          field: PaymentSearchFields.STATUS,
          operator: PaymentSearchOperators.IN,
          values: ["APPROVED", "APPROVED", ""],
        },
        {
          field: PaymentSearchFields.PAID_AT,
          operator: PaymentSearchOperators.BETWEEN,
          range: { start: "2026-07-20", end: "2026-07-10" },
        },
        {
          field: "unsupported",
          operator: PaymentSearchOperators.EQ,
          value: "ignored",
        } as any,
      ],
    });

    expect(snapshot).toEqual({
      q: "op-123",
      filters: [
        {
          field: PaymentSearchFields.STATUS,
          operator: PaymentSearchOperators.IN,
          mode: "include",
          values: ["APPROVED"],
        },
        {
          field: PaymentSearchFields.AMOUNT,
          operator: PaymentSearchOperators.GTE,
          value: "100.50",
        },
        {
          field: PaymentSearchFields.PAID_AT,
          operator: PaymentSearchOperators.BETWEEN,
          range: { start: "2026-07-10", end: "2026-07-20" },
        },
      ],
    });
  });

  it("builds chips and labels using payment catalogs", () => {
    const snapshot = sanitizePaymentSearchSnapshot({
      q: "bcp",
      filters: [
        {
          field: PaymentSearchFields.STATUS,
          operator: PaymentSearchOperators.IN,
          values: ["PENDING_APPROVAL"],
        },
        {
          field: PaymentSearchFields.COMPANY_PAYMENT_ACCOUNT_ID,
          operator: PaymentSearchOperators.IN,
          values: ["account-1"],
        },
      ],
    });

    expect(buildPaymentSearchLabel(snapshot, searchState)).toBe(
      "Busqueda: bcp | Estado: Pendiente aprobacion | Cuenta empresa: BCP ****1234",
    );
    expect(buildPaymentSearchChips(snapshot, searchState)).toEqual([
      { id: "q", label: "Busqueda: bcp", removeKey: "q" },
      {
        id: PaymentSearchFields.STATUS,
        label: "Estado: Pendiente aprobacion",
        removeKey: PaymentSearchFields.STATUS,
      },
      {
        id: PaymentSearchFields.COMPANY_PAYMENT_ACCOUNT_ID,
        label: "Cuenta empresa: BCP ****1234",
        removeKey: PaymentSearchFields.COMPANY_PAYMENT_ACCOUNT_ID,
      },
    ]);
  });

  it("toggles, upserts, removes and summarizes payment rules", () => {
    const initial = createEmptyPaymentSearchSnapshot();
    const withStatus = togglePaymentSearchOption(initial, PaymentSearchFields.STATUS, "APPROVED");

    expect(getPaymentSearchSelectionCount(withStatus, PaymentSearchFields.STATUS)).toBe(1);
    expect(getPaymentSearchRuleSummary(withStatus, PaymentSearchFields.STATUS, searchState)).toBe("Aprobado");

    const withAmount = upsertPaymentSearchRule(withStatus, {
      field: PaymentSearchFields.AMOUNT,
      operator: PaymentSearchOperators.LT,
      value: "500",
    });
    expect(findPaymentSearchRule(withAmount, PaymentSearchFields.AMOUNT)?.value).toBe("500");

    const withoutStatus = removePaymentSearchKey(withAmount, PaymentSearchFields.STATUS);
    expect(findPaymentSearchRule(withoutStatus, PaymentSearchFields.STATUS)).toBeNull();
  });

  it("builds smart search columns for payment fields", () => {
    const columns = buildPaymentSmartSearchColumns(searchState);

    expect(columns.map((column) => column.id)).toEqual([
      PaymentSearchFields.STATUS,
      PaymentSearchFields.CURRENCY,
      PaymentSearchFields.PAYMENT_METHOD_ID,
      PaymentSearchFields.COMPANY_PAYMENT_ACCOUNT_ID,
      PaymentSearchFields.FROM_DOCUMENT_TYPE,
      PaymentSearchFields.AMOUNT,
      PaymentSearchFields.DATE,
      PaymentSearchFields.SCHEDULED_AT,
      PaymentSearchFields.PAID_AT,
      PaymentSearchFields.HAS_EVIDENCE,
      PaymentSearchFields.REQUESTED_BY_USER_ID,
      PaymentSearchFields.APPROVED_BY_USER_ID,
    ]);
    expect(columns.find((column) => column.id === PaymentSearchFields.STATUS)?.options).toEqual(
      searchState.catalogs.statuses,
    );
    expect(columns.find((column) => column.id === PaymentSearchFields.AMOUNT)?.kind).toBe("number");
    expect(columns.find((column) => column.id === PaymentSearchFields.PAID_AT)?.kind).toBe("date");
  });
});
