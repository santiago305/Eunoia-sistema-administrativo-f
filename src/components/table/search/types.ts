export type DataTableSearchChip<TFilterKey extends string = string> = {
  id: string;
  label: string;
  removeKey: "q" | TFilterKey;
};

export type DataTableSearchOption = {
  id: string;
  label: string;
  keywords?: string[];
};

export type DataTableSearchSnapshot<TFilterKey extends string = string> = {
  q?: string;
  filters: Record<TFilterKey, string[]>;
};

export type DataTableSearchColumn<TFilterKey extends string = string> = {
  id: TFilterKey;
  label: string;
  options: DataTableSearchOption[];
  visible: boolean;
};

export type DataTableRecentSearchItem<TSnapshot = unknown> = {
  id: string;
  label: string;
  snapshot: TSnapshot;
};

export type DataTableSavedSearchItem<TSnapshot = unknown> = {
  id: string;
  name: string;
  label: string;
  snapshot: TSnapshot;
};
