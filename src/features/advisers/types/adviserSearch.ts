import type { DataTableSearchOption, SmartSearchRuleMode } from "@/shared/components/table/search";
export const AdviserSearchFields = { NAME: "name", EMAIL: "email", ASSIGNED_ORDERS: "assignedOrders", SOLD_TOTAL: "soldTotal", COLLECTED_TOTAL: "collectedTotal", IS_ACTIVE: "isActive" } as const;
export type AdviserSearchField = typeof AdviserSearchFields[keyof typeof AdviserSearchFields];
export const AdviserSearchOperators = { IN: "in", CONTAINS: "contains", EQ: "eq", GT: "gt", GTE: "gte", LT: "lt", LTE: "lte" } as const;
export type AdviserSearchOperator = typeof AdviserSearchOperators[keyof typeof AdviserSearchOperators];
export type AdviserSearchRule = { field: AdviserSearchField; operator: AdviserSearchOperator; mode?: SmartSearchRuleMode; value?: string; values?: string[] };
export type AdviserSearchSnapshot = { q?: string; filters: AdviserSearchRule[] };
export type AdviserSearchStateResponse = { recent: Array<{ recentId: string; label: string; snapshot: AdviserSearchSnapshot; lastUsedAt: string }>; saved: Array<{ metricId: string; name: string; label: string; snapshot: AdviserSearchSnapshot; updatedAt: string }>; catalogs: { activeStates: DataTableSearchOption[] } };
