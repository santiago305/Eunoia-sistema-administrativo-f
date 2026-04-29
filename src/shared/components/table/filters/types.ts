export type FilterLogicOperator = "OR" | "AND";

export type DataTableFilterOption = {
  id: string;
  label: string;
  keywords?: string[];
  disabled?: boolean;
  count?: number;
};

export type DataTableFilterGroup = {
  id: string;
  label: string;
  searchable?: boolean;
  options: DataTableFilterOption[];
};

export type DataTableFilterMode = {
  id: string;
  label: string;
  groups: DataTableFilterGroup[];
};

export type DataTableFilterCategory = {
  id: string;
  label: string;
  modes: DataTableFilterMode[];
};

export type DataTableFilterTree = DataTableFilterCategory[];

export type AppliedDataTableFilter = {
  id: string;
  categoryId: string;
  modeId: string;
  groupId: string;
  operator: FilterLogicOperator;
  optionIds: string[];
};

export type FilterColumnItem = {
  id: string;
  label: string;
  disabled?: boolean;
  count?: number;
  hasChildren?: boolean;
};

export type FilterDraftSelection = {
  categoryId: string | null;
  modeId: string | null;
  groupId: string | null;
  operator: FilterLogicOperator;
  optionIds: string[];
};

export type DataTableFiltersPopoverProps = {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  categories: DataTableFilterTree;
  value: AppliedDataTableFilter[];
  onChange: (next: AppliedDataTableFilter[]) => void;
  onClose: () => void;
  title?: string;
  maxWidth?: number;
  minWidth?: number;
  emptyMessage?: string;
};