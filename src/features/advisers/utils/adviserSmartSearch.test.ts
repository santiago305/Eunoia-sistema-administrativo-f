import { describe, expect, it } from "vitest";
import {
  AdviserSearchFields as F,
  AdviserSearchOperators as O,
} from "../types/adviserSearch";
import {
  buildAdviserSmartSearchFields,
  filterAdviserSearchSnapshotByCapabilities,
} from "./adviserSmartSearch";

const allFilters = {
  filters: [
    { field: F.NAME, operator: O.CONTAINS, value: "Ana" },
    { field: F.ASSIGNED_ORDERS, operator: O.GTE, value: "3" },
    { field: F.SOLD_TOTAL, operator: O.GT, value: "1000" },
    { field: F.COLLECTED_TOTAL, operator: O.GT, value: "500" },
  ],
};

describe("adviser smart-search permissions", () => {
  it("removes order and performance filters without their permissions", () => {
    const snapshot = filterAdviserSearchSnapshotByCapabilities(allFilters, {
      canViewOrders: false,
      canViewPerformance: false,
    });

    expect(snapshot.filters.map((filter) => filter.field)).toEqual([F.NAME]);
    expect(
      buildAdviserSmartSearchFields(undefined, {
        canViewOrders: false,
        canViewPerformance: false,
      }).map((field) => field.id),
    ).toEqual([F.NAME, F.EMAIL, F.IS_ACTIVE]);
  });

  it("keeps the order count separate from financial performance", () => {
    const snapshot = filterAdviserSearchSnapshotByCapabilities(allFilters, {
      canViewOrders: true,
      canViewPerformance: false,
    });

    expect(snapshot.filters.map((filter) => filter.field)).toEqual([
      F.NAME,
      F.ASSIGNED_ORDERS,
    ]);
  });

  it("allows all summary filters with performance access", () => {
    const snapshot = filterAdviserSearchSnapshotByCapabilities(allFilters, {
      canViewOrders: false,
      canViewPerformance: true,
    });

    expect(snapshot.filters).toHaveLength(4);
  });
});
