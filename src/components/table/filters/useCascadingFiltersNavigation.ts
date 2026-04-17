import { useEffect, useMemo, useState } from "react";
import type {
  AppliedDataTableFilter,
  DataTableFilterCategory,
  FilterDraftSelection,
  FilterLogicOperator,
} from "./types";
import {
  getCategoryById,
  getGroupById,
  getModeById,
  includesQuery,
  mapCategoriesToItems,
  mapGroupsToItems,
  mapModesToItems,
  mapOptionsToItems,
} from "./utils";

type UseCascadingFiltersNavigationParams = {
  open: boolean;
  categories: DataTableFilterCategory[];
  value: AppliedDataTableFilter[];
};

export function useCascadingFiltersNavigation({
  open,
  categories,
  value,
}: UseCascadingFiltersNavigationParams) {
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [activeModeId, setActiveModeId] = useState<string | null>(null);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [operator, setOperator] = useState<FilterLogicOperator>("OR");
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [groupSearch, setGroupSearch] = useState("");
  const [optionSearch, setOptionSearch] = useState("");

  useEffect(() => {
    if (!open) return;

    const firstCategory = categories[0] ?? null;

    const firstApplied = value[0];

    const initialCategoryId = firstApplied?.categoryId ?? firstCategory?.id ?? null;
    const initialCategory =
      categories.find((item) => item.id === initialCategoryId) ?? null;

    const initialModeId =
      firstApplied?.modeId ?? initialCategory?.modes[0]?.id ?? null;
    const initialMode =
      initialCategory?.modes.find((item) => item.id === initialModeId) ?? null;

    const initialGroupId =
      firstApplied?.groupId ?? initialMode?.groups[0]?.id ?? null;

    setActiveCategoryId(initialCategoryId);
    setActiveModeId(initialModeId);
    setActiveGroupId(initialGroupId);
    setOperator(firstApplied?.operator ?? "OR");
    setSelectedOptionIds(firstApplied?.optionIds ?? []);
    setGroupSearch("");
    setOptionSearch("");
  }, [open, categories, value]);

  const activeCategory = useMemo(
    () => getCategoryById(categories, activeCategoryId),
    [categories, activeCategoryId],
  );

  const activeMode = useMemo(
    () => getModeById(activeCategory, activeModeId),
    [activeCategory, activeModeId],
  );

  const activeGroup = useMemo(
    () => getGroupById(activeMode, activeGroupId),
    [activeMode, activeGroupId],
  );

  const categoryItems = useMemo(() => mapCategoriesToItems(categories), [categories]);

  const modeItems = useMemo(
    () => mapModesToItems(activeCategory?.modes ?? []),
    [activeCategory],
  );

  const filteredGroups = useMemo(() => {
    const groups = activeMode?.groups ?? [];
    if (!groupSearch.trim()) return groups;

    return groups.filter((group) =>
      includesQuery(group.label, groupSearch),
    );
  }, [activeMode, groupSearch]);

  const groupItems = useMemo(
    () => mapGroupsToItems(filteredGroups),
    [filteredGroups],
  );

  const filteredOptions = useMemo(() => {
    const options = activeGroup?.options ?? [];
    if (!optionSearch.trim()) return options;

    return options.filter((option) =>
      includesQuery(option.label, optionSearch, option.keywords),
    );
  }, [activeGroup, optionSearch]);

  const optionItems = useMemo(
    () => mapOptionsToItems(filteredOptions),
    [filteredOptions],
  );

  const currentDraft: FilterDraftSelection = useMemo(
    () => ({
      categoryId: activeCategoryId,
      modeId: activeModeId,
      groupId: activeGroupId,
      operator,
      optionIds: selectedOptionIds,
    }),
    [activeCategoryId, activeModeId, activeGroupId, operator, selectedOptionIds],
  );

  function selectCategory(categoryId: string) {
    const category = categories.find((item) => item.id === categoryId) ?? null;
    const nextMode = category?.modes[0] ?? null;
    const nextGroup = nextMode?.groups[0] ?? null;

    setActiveCategoryId(categoryId);
    setActiveModeId(nextMode?.id ?? null);
    setActiveGroupId(nextGroup?.id ?? null);
    setSelectedOptionIds([]);
    setGroupSearch("");
    setOptionSearch("");
  }

  function selectMode(modeId: string) {
    const mode = activeCategory?.modes.find((item) => item.id === modeId) ?? null;
    const nextGroup = mode?.groups[0] ?? null;

    setActiveModeId(modeId);
    setActiveGroupId(nextGroup?.id ?? null);
    setSelectedOptionIds([]);
    setGroupSearch("");
    setOptionSearch("");
  }

  function selectGroup(groupId: string) {
    setActiveGroupId(groupId);
    setSelectedOptionIds([]);
    setOptionSearch("");
  }

  function toggleOption(optionId: string) {
    setSelectedOptionIds((current) =>
      current.includes(optionId)
        ? current.filter((item) => item !== optionId)
        : [...current, optionId],
    );
  }

  function resetDraftToPath(path?: {
    categoryId?: string | null;
    modeId?: string | null;
    groupId?: string | null;
    optionIds?: string[];
    operator?: FilterLogicOperator;
  }) {
    const categoryId = path?.categoryId ?? categories[0]?.id ?? null;
    const category = categories.find((item) => item.id === categoryId) ?? null;
    const modeId = path?.modeId ?? category?.modes[0]?.id ?? null;
    const mode = category?.modes.find((item) => item.id === modeId) ?? null;
    const groupId = path?.groupId ?? mode?.groups[0]?.id ?? null;

    setActiveCategoryId(categoryId);
    setActiveModeId(modeId);
    setActiveGroupId(groupId);
    setSelectedOptionIds(path?.optionIds ?? []);
    setOperator(path?.operator ?? "OR");
    setGroupSearch("");
    setOptionSearch("");
  }

  return {
    activeCategory,
    activeMode,
    activeGroup,
    activeCategoryId,
    activeModeId,
    activeGroupId,
    operator,
    setOperator,
    selectedOptionIds,
    categoryItems,
    modeItems,
    groupItems,
    optionItems,
    currentDraft,
    groupSearch,
    setGroupSearch,
    optionSearch,
    setOptionSearch,
    selectCategory,
    selectMode,
    selectGroup,
    toggleOption,
    resetDraftToPath,
  };
}
