import type { DataTableSearchChip, SmartSearchFieldConfig, SmartSearchOperatorOption } from "@/shared/components/table/search";
import { AdviserSearchFields as F, AdviserSearchOperators as O, type AdviserSearchField, type AdviserSearchOperator, type AdviserSearchRule, type AdviserSearchSnapshot, type AdviserSearchStateResponse } from "../types/adviserSearch";
export type AdviserSearchFilterKey = AdviserSearchField;
const labels: Record<AdviserSearchField, string> = { name: "Nombre", email: "Correo", assignedOrders: "Pedidos asignados", soldTotal: "Total vendido", collectedTotal: "Total recaudado", isActive: "Estado" };
const textOps: SmartSearchOperatorOption<AdviserSearchOperator>[] = [{ id: O.CONTAINS, label: "Contiene" }, { id: O.EQ, label: "Es igual a" }];
const numberOps: SmartSearchOperatorOption<AdviserSearchOperator>[] = [{ id: O.EQ, label: "Igual a" }, { id: O.GT, label: "Mayor que" }, { id: O.GTE, label: "Mayor o igual" }, { id: O.LT, label: "Menor que" }, { id: O.LTE, label: "Menor o igual" }];
const status = [{ id: "true", label: "Activos", keywords: ["activo"] }, { id: "false", label: "Inactivos", keywords: ["inactivo"] }];
export function sanitizeAdviserSearchSnapshot(value?: Partial<AdviserSearchSnapshot> | null): AdviserSearchSnapshot {
  const q = value?.q?.trim() || undefined; const filters: AdviserSearchRule[] = [];
  (Array.isArray(value?.filters) ? value.filters : []).forEach((rule) => {
    if (!Object.values(F).includes(rule.field) || !Object.values(O).includes(rule.operator)) return;
    if (rule.field === F.IS_ACTIVE && rule.operator === O.IN && rule.values?.length) filters.push({ ...rule, mode: rule.mode === "exclude" ? "exclude" : "include", values: [...new Set(rule.values)] });
    else if ([F.NAME, F.EMAIL].includes(rule.field as typeof F.NAME) && [O.CONTAINS, O.EQ].includes(rule.operator as typeof O.EQ) && rule.value?.trim()) filters.push({ field: rule.field, operator: rule.operator, value: rule.value.trim() });
    else if ([F.ASSIGNED_ORDERS, F.SOLD_TOTAL, F.COLLECTED_TOTAL].includes(rule.field as typeof F.ASSIGNED_ORDERS) && [O.EQ, O.GT, O.GTE, O.LT, O.LTE].includes(rule.operator as typeof O.EQ) && rule.value !== undefined && !Number.isNaN(Number(rule.value))) filters.push({ field: rule.field, operator: rule.operator, value: rule.value });
  }); return { q, filters };
}
export const findAdviserSearchRule = (snapshot: AdviserSearchSnapshot, field: AdviserSearchField) => sanitizeAdviserSearchSnapshot(snapshot).filters.find((r) => r.field === field) ?? null;
const opLabel: Record<AdviserSearchOperator, string> = { in: ":", contains: "contiene", eq: "=", gt: ">", gte: ">=", lt: "<", lte: "<=" };
function ruleLabel(rule: AdviserSearchRule, catalogs?: AdviserSearchStateResponse["catalogs"] | null, withField = true) { const prefix = withField ? `${labels[rule.field]} ` : ""; if (rule.operator === O.IN) { const map = new Map((catalogs?.activeStates ?? status).map((x) => [x.id, x.label])); return `${rule.mode === "exclude" ? "No " : ""}${prefix}: ${(rule.values ?? []).map((v) => map.get(v) ?? v).join(", ")}`; } return `${prefix}${opLabel[rule.operator]} ${rule.value ?? ""}`.trim(); }
export function buildAdviserSearchChips(snapshot: AdviserSearchSnapshot, catalogs?: AdviserSearchStateResponse["catalogs"] | null): DataTableSearchChip<AdviserSearchField>[] { const s = sanitizeAdviserSearchSnapshot(snapshot); return [...(s.q ? [{ id: "q", label: `Búsqueda: ${s.q}`, removeKey: "q" as const }] : []), ...s.filters.map((rule) => ({ id: rule.field, label: ruleLabel(rule, catalogs), removeKey: rule.field }))]; }
export function applyAdviserSearchRule(snapshot: AdviserSearchSnapshot, rule: AdviserSearchRule) { const s = sanitizeAdviserSearchSnapshot(snapshot); return sanitizeAdviserSearchSnapshot({ ...s, filters: [...s.filters.filter((x) => x.field !== rule.field), rule] }); }
export function removeAdviserSearchKey(snapshot: AdviserSearchSnapshot, key: "q" | AdviserSearchField) { const s = sanitizeAdviserSearchSnapshot(snapshot); return key === "q" ? { ...s, q: undefined } : { ...s, filters: s.filters.filter((x) => x.field !== key) }; }
export const getAdviserSearchSelectionCount = (snapshot: AdviserSearchSnapshot, field: AdviserSearchField) => { const r = findAdviserSearchRule(snapshot, field); return r?.operator === O.IN ? r.values?.length ?? 0 : r ? 1 : 0; };
export const getAdviserSearchRuleSummary = (snapshot: AdviserSearchSnapshot, field: AdviserSearchField, catalogs?: AdviserSearchStateResponse["catalogs"] | null) => { const r = findAdviserSearchRule(snapshot, field); return r ? ruleLabel(r, catalogs, false) : null; };
export function buildAdviserSmartSearchFields(catalogs?: AdviserSearchStateResponse["catalogs"] | null): SmartSearchFieldConfig<AdviserSearchField, AdviserSearchOperator>[] { return [
  { id: F.NAME, label: "Nombre", kind: "text", description: "Busca por nombre del asesor.", operators: textOps, placeholder: "Ej. Ana" },
  { id: F.EMAIL, label: "Correo", kind: "text", description: "Busca por correo.", operators: textOps },
  { id: F.ASSIGNED_ORDERS, label: "Pedidos asignados", kind: "number", description: "Compara la cantidad de pedidos.", operators: numberOps },
  { id: F.SOLD_TOTAL, label: "Total vendido", kind: "number", description: "Compara el dinero vendido.", operators: numberOps },
  { id: F.COLLECTED_TOTAL, label: "Total recaudado", kind: "number", description: "Compara el dinero recaudado.", operators: numberOps },
  { id: F.IS_ACTIVE, label: "Estado", kind: "catalog", description: "Filtra activos o inactivos.", operators: [{ id: O.IN, label: "Es alguno de" }], supportsExclude: true, options: catalogs?.activeStates ?? status },
]; }
