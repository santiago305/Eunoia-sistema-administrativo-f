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
    creators: [{ id: "user-1", label: "creador@eunoia.test" }],
    assignees: [{ id: "user-2", label: "asignado@eunoia.test" }],
  },
};

describe("sale order workflow and state smart filters", () => {
  it("keeps client phone and agency detail text filters", () => {
    const snapshot = sanitizeSaleOrderSearchSnapshot({
      filters: [
        { field: "clientPhone", operator: "contains", value: "987" },
        { field: "agencyDetail", operator: "eq", value: "Olva Miraflores" },
      ],
    });

    expect(snapshot.filters).toEqual([
      { field: "clientPhone", operator: "contains", value: "987" },
      { field: "agencyDetail", operator: "eq", value: "Olva Miraflores" },
    ]);
  });

  it("builds workflow and state catalog fields", () => {
    const columns = buildSaleOrderSmartSearchColumns(searchState);

    expect(columns.find((column) => column.id === "workflowId")).toMatchObject({
      label: "Tipo",
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
        label: "Tipo: Venta principal",
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

  it("builds, sanitizes, and labels created-by and assigned-by catalog filters", () => {
    const columns = buildSaleOrderSmartSearchColumns(searchState);

    expect(columns.find((column) => column.id === "createdBy")).toMatchObject({
      label: "Creado por",
      kind: "catalog",
      supportsExclude: true,
      options: searchState.catalogs.creators,
    });
    expect(columns.find((column) => column.id === "assignedBy")).toMatchObject({
      label: "Asignado a",
      kind: "catalog",
      supportsExclude: true,
      options: searchState.catalogs.assignees,
    });

    const snapshot = sanitizeSaleOrderSearchSnapshot({
      filters: [
        {
          field: "createdBy",
          operator: "in",
          mode: "include",
          values: ["user-1"],
        },
        {
          field: "assignedBy",
          operator: "in",
          mode: "exclude",
          values: ["user-2"],
        },
      ],
    });

    expect(snapshot.filters).toEqual([
      {
        field: "createdBy",
        operator: "in",
        mode: "include",
        values: ["user-1"],
      },
      {
        field: "assignedBy",
        operator: "in",
        mode: "exclude",
        values: ["user-2"],
      },
    ]);
    expect(buildSaleOrderSearchChips(snapshot, searchState)).toEqual([
      {
        id: "createdBy",
        label: "Creado por: creador@eunoia.test",
        removeKey: "createdBy",
      },
      {
        id: "assignedBy",
        label: "Asignado a: No asignado@eunoia.test",
        removeKey: "assignedBy",
      },
    ]);
  });
});

describe("sale order calendar period smart filters", () => {
  it("exposes reusable month and week inputs on both date fields", () => {
    const columns = buildSaleOrderSmartSearchColumns(searchState);

    for (const field of ["scheduleDate", "deliveryDate"]) {
      const column = columns.find((item) => item.id === field);

      expect(column?.operators).toEqual(
        expect.arrayContaining([
          {
            id: "inMonth",
            label: "En el mes",
            inputMode: "month",
          },
          {
            id: "inWeek",
            label: "En la semana",
            inputMode: "week",
          },
        ]),
      );
    }
  });

  it("sanitizes month values and normalizes weeks to Monday", () => {
    expect(
      sanitizeSaleOrderSearchSnapshot({
        filters: [
          {
            field: "scheduleDate",
            operator: "inMonth",
            value: "2028-02",
          },
          {
            field: "deliveryDate",
            operator: "inWeek",
            value: "2027-01-01",
          },
        ],
      }).filters,
    ).toEqual([
      {
        field: "scheduleDate",
        operator: "inMonth",
        value: "2028-02",
      },
      {
        field: "deliveryDate",
        operator: "inWeek",
        value: "2026-12-28",
      },
    ]);

    expect(
      sanitizeSaleOrderSearchSnapshot({
        filters: [
          {
            field: "scheduleDate",
            operator: "inMonth",
            value: "2026-13",
          },
          {
            field: "deliveryDate",
            operator: "inWeek",
            value: "2026-02-30",
          },
        ],
      }).filters,
    ).toEqual([]);
  });

  it("keeps semantic month and week labels in chips", () => {
    const snapshot = sanitizeSaleOrderSearchSnapshot({
      filters: [
        {
          field: "scheduleDate",
          operator: "inMonth",
          value: "2028-02",
        },
        {
          field: "deliveryDate",
          operator: "inWeek",
          value: "2027-01-01",
        },
      ],
    });

    expect(buildSaleOrderSearchChips(snapshot, searchState)).toEqual([
      {
        id: "scheduleDate",
        label: "Fecha agenda en febrero 2028",
        removeKey: "scheduleDate",
      },
      {
        id: "deliveryDate",
        label: "Fecha entrega en la semana 28 dic 2026 - 3 ene 2027",
        removeKey: "deliveryDate",
      },
    ]);
  });
});
