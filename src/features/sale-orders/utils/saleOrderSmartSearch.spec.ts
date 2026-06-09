import { describe, expect, it } from "vitest";
import type { SaleOrderSearchStateResponse } from "../types/saleOrder";
import {
  buildSaleOrderSearchChips,
  buildSaleOrderSmartSearchColumns,
  sanitizeSaleOrderSearchSnapshot,
} from "./saleOrderSmartSearch";

const searchState: SaleOrderSearchStateResponse = {
  recent: [],
  saved: [],
  catalogs: {
    clients: [],
    warehouses: [],
    paymentStatuses: [],
    workflows: [{ id: "workflow-1", label: "Venta principal" }],
    states: [{ id: "state-1", label: "Preparando" }],
  },
};

describe("sale order workflow and state smart filters", () => {
  it("builds workflow and state catalog fields", () => {
    const columns = buildSaleOrderSmartSearchColumns(searchState);

    expect(columns.find((column) => column.id === "workflowId")).toMatchObject({
      label: "Flujo",
      kind: "catalog",
      supportsExclude: true,
      options: searchState.catalogs.workflows,
    });
    expect(columns.find((column) => column.id === "saleOrderStateId")).toMatchObject({
      label: "Estado",
      kind: "catalog",
      supportsExclude: true,
      options: searchState.catalogs.states,
    });
  });

  it("sanitizes and labels include/exclude workflow and state rules", () => {
    const snapshot = sanitizeSaleOrderSearchSnapshot({
      filters: [
        {
          field: "workflowId",
          operator: "in",
          mode: "include",
          values: ["workflow-1"],
        },
        {
          field: "saleOrderStateId",
          operator: "in",
          mode: "exclude",
          values: ["state-1"],
        },
      ],
    });

    expect(snapshot.filters).toHaveLength(2);
    expect(buildSaleOrderSearchChips(snapshot, searchState)).toEqual([
      {
        id: "workflowId",
        label: "Flujo: Venta principal",
        removeKey: "workflowId",
      },
      {
        id: "saleOrderStateId",
        label: "Estado: No Preparando",
        removeKey: "saleOrderStateId",
      },
    ]);
  });
});
