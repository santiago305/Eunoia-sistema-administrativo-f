import { describe, expect, it } from "vitest";
import type { SaleOrderSearchStateResponse } from "../types/saleOrder";
import {
  buildSaleOrderSearchChips,
  buildSaleOrderSmartSearchColumns,
  sanitizeSaleOrderSearchSnapshot,
  upsertSaleOrderUbigeoSearchRule,
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
    sources: [{ id: "source-1", label: "Facebook Ads" }],
    preguideStatuses: [{ id: "WITH", label: "Con pregu\u00eda" }],
    preparedStatuses: [{ id: "PENDING", label: "Sin preparar" }],
    stockSituations: [
      { id: "WITHOUT_RESERVATION", label: "Sin reserva" },
      { id: "RESERVED", label: "Reservado" },
      { id: "CONSUMED", label: "Consumido" },
      { id: "REVERTED", label: "Revertido" },
    ],
    creators: [{ id: "user-1", label: "creador@eunoia.test" }],
    assignees: [{ id: "user-2", label: "asignado@eunoia.test" }],
  },
} as SaleOrderSearchStateResponse;

describe("sale order workflow and state smart filters", () => {
  it("chains department, province and district options and clears descendants", () => {
    const ubigeoState = {
      ...searchState,
      catalogs: {
        ...searchState.catalogs,
        departments: [{ id: "20", label: "Piura" }, { id: "15", label: "Lima" }],
        provinces: [
          { id: "2001", label: "Piura", departmentId: "20" },
          { id: "1501", label: "Lima", departmentId: "15" },
        ],
        districts: [
          { id: "200101", label: "Piura", provinceId: "2001" },
          { id: "150101", label: "Lima", provinceId: "1501" },
        ],
      },
    } as SaleOrderSearchStateResponse;
    const departmentSnapshot = upsertSaleOrderUbigeoSearchRule(
      { filters: [] },
      { field: "clientDepartmentId", operator: "in", values: ["20"] },
    );
    const departmentColumns = buildSaleOrderSmartSearchColumns(ubigeoState, departmentSnapshot);
    expect(departmentColumns.find((column) => column.id === "clientProvinceId")?.options)
      .toEqual([{ id: "2001", label: "Piura", departmentId: "20" }]);
    expect(departmentColumns.find((column) => column.id === "clientDistrictId")?.options).toEqual([]);

    const provinceSnapshot = upsertSaleOrderUbigeoSearchRule(
      departmentSnapshot,
      { field: "clientProvinceId", operator: "in", values: ["2001"] },
    );
    expect(buildSaleOrderSmartSearchColumns(ubigeoState, provinceSnapshot)
      .find((column) => column.id === "clientDistrictId")?.options)
      .toEqual([{ id: "200101", label: "Piura", provinceId: "2001" }]);

    const changedDepartment = upsertSaleOrderUbigeoSearchRule(
      provinceSnapshot,
      { field: "clientDepartmentId", operator: "in", values: ["15"] },
    );
    expect(changedDepartment.filters.map((rule) => rule.field)).toEqual(["clientDepartmentId"]);
  });

  it("keeps client phone and agency detail text filters", () => {
    const snapshot = sanitizeSaleOrderSearchSnapshot({
      filters: [
        { field: "clientPhone", operator: "contains", value: "987" },
        { field: "agencyDetail", operator: "eq", value: "Olva Miraflores" },
        { field: "lotes", operator: "contains", value: " 3 " },
      ],
    });

    expect(snapshot.filters).toEqual([
      { field: "clientPhone", operator: "contains", value: "987" },
      { field: "agencyDetail", operator: "eq", value: "Olva Miraflores" },
      { field: "lotes", operator: "contains", value: "3" },
    ]);
  });

  it("builds the lote smart text field", () => {
    const columns = buildSaleOrderSmartSearchColumns(searchState);

    expect(columns.find((column) => column.id === "lotes")).toMatchObject({
      label: "Lote",
      kind: "text",
    });
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
    expect(columns.find((column) => column.id === "sourceId")).toMatchObject({
      label: "Enganche",
      kind: "catalog",
      supportsExclude: true,
      options: searchState.catalogs.sources,
    });
  });

  it("sanitizes and labels include/exclude workflow, state, bank account, client type, and source rules", () => {
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
        {
          field: "sourceId",
          operator: "in",
          mode: "include",
          values: ["source-1"],
        },
      ],
    });

    expect(snapshot.filters).toHaveLength(5);
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
      {
        id: "sourceId",
        label: "Enganche: Facebook Ads",
        removeKey: "sourceId",
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

  it("builds, sanitizes, and labels preguide and prepared status filters", () => {
    const columns = buildSaleOrderSmartSearchColumns(searchState);

    expect(columns.find((column) => column.id === "preguideStatus")).toMatchObject({
      label: "Pregu\u00eda",
      kind: "catalog",
      supportsExclude: true,
      options: searchState.catalogs.preguideStatuses,
    });
    expect(columns.find((column) => column.id === "preparedStatus")).toMatchObject({
      label: "Preparado",
      kind: "catalog",
      supportsExclude: true,
      options: searchState.catalogs.preparedStatuses,
    });

    const snapshot = sanitizeSaleOrderSearchSnapshot({
      filters: [
        {
          field: "preguideStatus",
          operator: "in",
          mode: "include",
          values: ["WITH"],
        },
        {
          field: "preparedStatus",
          operator: "in",
          mode: "include",
          values: ["PENDING"],
        },
      ],
    } as any);

    expect(snapshot.filters).toEqual([
      {
        field: "preguideStatus",
        operator: "in",
        mode: "include",
        values: ["WITH"],
      },
      {
        field: "preparedStatus",
        operator: "in",
        mode: "include",
        values: ["PENDING"],
      },
    ]);
    expect(buildSaleOrderSearchChips(snapshot, searchState)).toEqual([
      {
        id: "preguideStatus",
        label: "Pregu\u00eda: Con pregu\u00eda",
        removeKey: "preguideStatus",
      },
      {
        id: "preparedStatus",
        label: "Preparado: Sin preparar",
        removeKey: "preparedStatus",
      },
    ]);
  });

  it("builds and labels the overlapping stock situation filter", () => {
    const column = buildSaleOrderSmartSearchColumns(searchState)
      .find((item) => item.id === "stockSituation");
    expect(column).toMatchObject({
      label: "Situación de stock",
      kind: "catalog",
      supportsExclude: true,
      options: searchState.catalogs.stockSituations,
    });

    const snapshot = sanitizeSaleOrderSearchSnapshot({
      filters: [{
        field: "stockSituation",
        operator: "in",
        values: ["RESERVED", "CONSUMED", "INVALID"],
      }],
    } as any);

    expect(snapshot.filters).toEqual([{
      field: "stockSituation",
      operator: "in",
      mode: "include",
      values: ["RESERVED", "CONSUMED"],
    }]);
    expect(buildSaleOrderSearchChips(snapshot, searchState)).toEqual([{
      id: "stockSituation",
      label: "Situación de stock: Reservado, Consumido",
      removeKey: "stockSituation",
    }]);
  });
});

describe("sale order date smart filters", () => {
  it("exposes the supported sale-order date operators", () => {
    const columns = buildSaleOrderSmartSearchColumns(searchState);

    for (const field of ["createdAt", "scheduleDate", "deliveryDate"]) {
      const column = columns.find((item) => item.id === field);

      expect(column?.operators).toEqual(
        [
          { id: "on", label: "Es" },
          { id: "after", label: "Después de" },
          { id: "before", label: "Antes de" },
          { id: "between", label: "Entre" },
        ],
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
