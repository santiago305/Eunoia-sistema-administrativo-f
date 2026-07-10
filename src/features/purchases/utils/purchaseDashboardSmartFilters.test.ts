import { describe, expect, it } from "vitest";
import type { PurchaseDashboardFilters } from "../types/purchase-dashboard.types";
import {
  buildPurchaseDashboardFilterLabel,
  buildPurchaseDashboardSearchChips,
  dashboardFiltersToSnapshot,
  hasPurchaseDashboardFilterCriteria,
  sanitizePurchaseDashboardFilterSnapshot,
  snapshotToDashboardFilters,
} from "./purchaseDashboardSmartFilters";

describe("purchaseDashboardSmartFilters", () => {
  it("returns an empty snapshot for empty filters and ignores limit", () => {
    const snapshot = dashboardFiltersToSnapshot({ limit: 10 });

    expect(snapshot).toEqual({ filters: [] });
    expect(hasPurchaseDashboardFilterCriteria(snapshot)).toBe(false);
  });

  it("converts catalog dashboard filters to saved filter rules", () => {
    const snapshot = dashboardFiltersToSnapshot({
      purchaseType: "RAW_MATERIAL",
      paymentStatus: "PENDING",
      supplierId: "supplier-1",
      userId: "user-1",
      warehouseId: "warehouse-1",
      paymentMethodId: "method-1",
      companyPaymentAccountId: "account-1",
      limit: 50,
    });

    expect(snapshot).toEqual({
      filters: [
        { field: "purchaseType", operator: "in", mode: "include", values: ["RAW_MATERIAL"] },
        { field: "paymentStatus", operator: "in", mode: "include", values: ["PENDING"] },
        { field: "supplierId", operator: "in", mode: "include", values: ["supplier-1"] },
        { field: "userId", operator: "in", mode: "include", values: ["user-1"] },
        { field: "warehouseId", operator: "in", mode: "include", values: ["warehouse-1"] },
        { field: "paymentMethodId", operator: "in", mode: "include", values: ["method-1"] },
        { field: "companyPaymentAccountId", operator: "in", mode: "include", values: ["account-1"] },
      ],
    });
    expect(hasPurchaseDashboardFilterCriteria(snapshot)).toBe(true);
  });

  it("preserves an absolute date range separately from catalog filters", () => {
    const snapshot = dashboardFiltersToSnapshot({
      from: "2026-07-01",
      to: "2026-07-09",
      supplierId: "supplier-1",
      limit: 10,
    });

    expect(snapshot).toEqual({
      filters: [
        { field: "supplierId", operator: "in", mode: "include", values: ["supplier-1"] },
      ],
      dateRange: { mode: "absolute", from: "2026-07-01", to: "2026-07-09" },
    });
    expect(snapshotToDashboardFilters(snapshot)).toEqual({
      from: "2026-07-01",
      to: "2026-07-09",
      supplierIds: ["supplier-1"],
    });
  });

  it("sanitizes unknown fields, empty values, duplicate values, and invalid dates", () => {
    const snapshot = sanitizePurchaseDashboardFilterSnapshot({
      filters: [
        { field: "supplierId", operator: "in", values: [" supplier-1 ", "supplier-1", ""] },
        { field: "warehouseId", operator: "equals", values: ["warehouse-1"] },
        { field: "unknown", operator: "in", values: ["x"] },
        { field: "paymentStatus", operator: "in", values: [] },
      ],
      dateRange: { mode: "absolute", from: "not-a-date", to: "2026-07-09" },
    } as Parameters<typeof sanitizePurchaseDashboardFilterSnapshot>[0]);

    expect(snapshot).toEqual({
      filters: [
        { field: "supplierId", operator: "in", mode: "include", values: ["supplier-1"] },
      ],
      dateRange: { mode: "absolute", to: "2026-07-09" },
    });
  });

  it("converts sanitized snapshots back to flat dashboard filters without limit", () => {
    const filters = snapshotToDashboardFilters({
      filters: [
        { field: "supplierId", operator: "in", values: ["supplier-1", "supplier-2"] },
        { field: "paymentStatus", operator: "in", values: ["OVERDUE"] },
      ],
      dateRange: { mode: "absolute", from: "2026-07-01" },
    });

    expect(filters).toEqual({
      from: "2026-07-01",
      supplierIds: ["supplier-1", "supplier-2"],
      paymentStatuses: ["OVERDUE"],
    } satisfies PurchaseDashboardFilters);
  });

  it("builds dashboard chips for each active filter and date range", () => {
    expect(buildPurchaseDashboardSearchChips(
      {
        filters: [
          { field: "paymentStatus", operator: "in", values: ["PENDING", "OVERDUE"] },
          { field: "supplierId", operator: "in", values: ["supplier-1"] },
        ],
        dateRange: { mode: "absolute", from: "2026-07-01", to: "2026-07-09" },
      },
      {
        paymentStatuses: [
          { id: "PENDING", label: "Pendiente" },
          { id: "OVERDUE", label: "Vencido" },
        ],
        suppliers: [{ id: "supplier-1", label: "Proveedor Uno" }],
      },
    )).toEqual([
      { id: "dateRange", label: "Fecha: 01/07/2026 - 09/07/2026", removeKey: "dateRange" },
      { id: "paymentStatus", label: "Estado de pago: Pendiente - Vencido", removeKey: "paymentStatus" },
      { id: "supplierId", label: "Proveedor: Proveedor Uno", removeKey: "supplierId" },
    ]);
  });

  it("builds a readable label using catalog labels and dates", () => {
    const label = buildPurchaseDashboardFilterLabel(
      {
        filters: [
          { field: "purchaseType", operator: "in", values: ["RAW_MATERIAL"] },
          { field: "supplierId", operator: "in", values: ["supplier-1"] },
        ],
        dateRange: { mode: "absolute", from: "2026-07-01", to: "2026-07-09" },
      },
      {
        purchaseTypes: [{ id: "RAW_MATERIAL", label: "Materia prima" }],
        suppliers: [{ id: "supplier-1", label: "Proveedor Uno" }],
      },
    );

    expect(label).toBe("Fecha: 01/07/2026 - 09/07/2026 | Tipo de compra: Materia prima | Proveedor: Proveedor Uno");
  });
});
