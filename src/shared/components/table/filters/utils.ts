import type {
  AppliedDataTableFilter,
  DataTableFilterCategory,
  DataTableFilterGroup,
  DataTableFilterMode,
  DataTableFilterOption,
  FilterColumnItem,
  FilterDraftSelection,
} from "./types";

export function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

export function includesQuery(label: string, query: string, keywords?: string[]) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return true;

  const haystack = [label, ...(keywords ?? [])]
    .map((item) => normalizeText(item))
    .join(" ");

  return haystack.includes(normalizedQuery);
}

export function mapCategoriesToItems(
  categories: DataTableFilterCategory[],
): FilterColumnItem[] {
  return categories.map((category) => ({
    id: category.id,
    label: category.label,
    hasChildren: category.modes.length > 0,
  }));
}

export function mapModesToItems(modes: DataTableFilterMode[]): FilterColumnItem[] {
  return modes.map((mode) => ({
    id: mode.id,
    label: mode.label,
    hasChildren: mode.groups.length > 0,
  }));
}

export function mapGroupsToItems(groups: DataTableFilterGroup[]): FilterColumnItem[] {
  return groups.map((group) => ({
    id: group.id,
    label: group.label,
    hasChildren: group.options.length > 0,
  }));
}

export function mapOptionsToItems(
  options: DataTableFilterOption[],
): FilterColumnItem[] {
  return options.map((option) => ({
    id: option.id,
    label: option.label,
    disabled: option.disabled,
    count: option.count,
    hasChildren: false,
  }));
}

export function getCategoryById(
  categories: DataTableFilterCategory[],
  categoryId: string | null,
) {
  if (!categoryId) return null;
  return categories.find((item) => item.id === categoryId) ?? null;
}

export function getModeById(
  category: DataTableFilterCategory | null,
  modeId: string | null,
) {
  if (!category || !modeId) return null;
  return category.modes.find((item) => item.id === modeId) ?? null;
}

export function getGroupById(
  mode: DataTableFilterMode | null,
  groupId: string | null,
) {
  if (!mode || !groupId) return null;
  return mode.groups.find((item) => item.id === groupId) ?? null;
}

export function buildAppliedFilterId(
  selection: Pick<FilterDraftSelection, "categoryId" | "modeId" | "groupId">,
) {
  return [selection.categoryId, selection.modeId, selection.groupId]
    .filter(Boolean)
    .join(":");
}

export function upsertAppliedFilter(
  current: AppliedDataTableFilter[],
  nextFilter: AppliedDataTableFilter,
) {
  const next = current.filter((item) => item.id !== nextFilter.id);

  if (nextFilter.optionIds.length === 0) {
    return next;
  }

  return [...next, nextFilter];
}

export function removeAppliedFilter(
  current: AppliedDataTableFilter[],
  filterId: string,
) {
  return current.filter((item) => item.id !== filterId);
}

export function cloneAppliedFilters(value: AppliedDataTableFilter[]) {
  return value.map((item) => ({
    ...item,
    optionIds: [...item.optionIds],
  }));
}