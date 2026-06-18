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
    bankAccounts: [{ id: "bank-1", label: "BCP Soles" }],
    clientTypes: [{ id: "NEW", label: "Nuevo" }],
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
    expect(columns.find((column) => column.id === "bankAccountId")).toMatchObject({
      label: "Cuenta bancaria",
      kind: "catalog",
      supportsExclude: true,
      options: searchState.catalogs.bankAccounts,
    });
    expect(columns.find((column) => column.id === "clientType")).toMatchObject({
      label: "Tipo de cliente",
      kind: "catalog",
      supportsExclude: true,
      options: searchState.catalogs.clientTypes,
    });
  });

  it("sanitizes and labels include/exclude workflow, state, bank account, and client type rules", () => {
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
        {
          field: "bankAccountId",
          operator: "in",
          mode: "include",
          values: ["bank-1"],
        },
        {
          field: "clientType",
          operator: "in",
          mode: "include",
          values: ["NEW"],
        },
      ],
    });

    expect(snapshot.filters).toHaveLength(4);
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
      {
        id: "bankAccountId",
        label: "Cuenta bancaria: BCP Soles",
        removeKey: "bankAccountId",
      },
      {
        id: "clientType",
        label: "Tipo de cliente: Nuevo",
        removeKey: "clientType",
      },
    ]);
  });
});
