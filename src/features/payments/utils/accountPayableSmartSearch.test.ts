import { describe, expect, it } from "vitest";
import {
  AccountPayableSearchFields,
  AccountPayableSearchOperators,
} from "../types/account-payable-search.types";
import {
  buildAccountPayableListQuery,
  buildAccountPayableSearchChips,
  sanitizeAccountPayableSearchSnapshot,
} from "./accountPayableSmartSearch";

describe("accountPayableSmartSearch", () => {
  it("sanitizes filters, deduplicates catalog values and orders supported fields", () => {
    const snapshot = sanitizeAccountPayableSearchSnapshot({
      q: "  purchase-1  ",
      filters: [
        {
          field: AccountPayableSearchFields.AMOUNT_PENDING,
          operator: AccountPayableSearchOperators.GTE,
          value: "abc",
        },
        {
          field: AccountPayableSearchFields.STATUS,
          operator: AccountPayableSearchOperators.IN,
          values: ["PENDING", "PENDING", "OVERDUE"],
        },
        {
          field: AccountPayableSearchFields.PURCHASE_ID,
          operator: AccountPayableSearchOperators.EQ,
          value: " purchase-2 ",
        },
      ],
    });

    expect(snapshot).toEqual({
      q: "purchase-1",
      filters: [
        {
          field: AccountPayableSearchFields.STATUS,
          operator: AccountPayableSearchOperators.IN,
          mode: "include",
          values: ["PENDING", "OVERDUE"],
        },
        {
          field: AccountPayableSearchFields.PURCHASE_ID,
          operator: AccountPayableSearchOperators.EQ,
          value: "purchase-2",
        },
      ],
    });
  });

  it("builds readable chips for text and catalog filters", () => {
    const chips = buildAccountPayableSearchChips({
      filters: [
        {
          field: AccountPayableSearchFields.STATUS,
          operator: AccountPayableSearchOperators.IN,
          values: ["OVERDUE"],
        },
        {
          field: AccountPayableSearchFields.PURCHASE_ID,
          operator: AccountPayableSearchOperators.EQ,
          value: "purchase-9",
        },
      ],
    });

    expect(chips.map((chip) => chip.label)).toEqual([
      "Estado: Vencida",
      "Compra = purchase-9",
    ]);
  });

  it("maps smart filters to the advanced backend list query", () => {
    const query = buildAccountPayableListQuery({
      q: "purchase-from-search",
      filters: [
        {
          field: AccountPayableSearchFields.STATUS,
          operator: AccountPayableSearchOperators.IN,
          values: ["PARTIAL", "OVERDUE"],
        },
        {
          field: AccountPayableSearchFields.PURCHASE_ID,
          operator: AccountPayableSearchOperators.EQ,
          value: "purchase-from-filter",
        },
        {
          field: AccountPayableSearchFields.SUPPLIER_ID,
          operator: AccountPayableSearchOperators.EQ,
          value: "supplier-1",
        },
        {
          field: AccountPayableSearchFields.CURRENCY,
          operator: AccountPayableSearchOperators.IN,
          values: ["PEN"],
        },
        {
          field: AccountPayableSearchFields.AMOUNT_PENDING,
          operator: AccountPayableSearchOperators.GTE,
          value: "100",
        },
        {
          field: AccountPayableSearchFields.DUE_DATE,
          operator: AccountPayableSearchOperators.BETWEEN,
          range: { start: "2026-07-31", end: "2026-07-01" },
        },
      ],
    });

    expect(query).toEqual({
      q: "purchase-from-search",
      statuses: ["PARTIAL", "OVERDUE"],
      purchaseId: "purchase-from-filter",
      supplierId: "supplier-1",
      currency: "PEN",
      amountPendingMin: 100,
      dueFrom: "2026-07-01",
      dueTo: "2026-07-31",
    });
  });
});
