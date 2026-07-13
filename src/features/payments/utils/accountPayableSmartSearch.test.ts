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

  it("maps the current backend-supported filters to the list query", () => {
    const query = buildAccountPayableListQuery({
      q: "purchase-from-search",
      filters: [
        {
          field: AccountPayableSearchFields.STATUS,
          operator: AccountPayableSearchOperators.IN,
          values: ["PARTIAL"],
        },
        {
          field: AccountPayableSearchFields.PURCHASE_ID,
          operator: AccountPayableSearchOperators.EQ,
          value: "purchase-from-filter",
        },
      ],
    });

    expect(query).toEqual({
      status: "PARTIAL",
      purchaseId: "purchase-from-filter",
    });
  });
});
