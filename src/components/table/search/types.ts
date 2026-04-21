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

export type SmartSearchRuleMode = "include" | "exclude";

export type SmartSearchInputMode =
  | "text"
  | "number"
  | "date"
  | "datetime"
  | "date-range"
  | "datetime-range";

export type SmartSearchFieldKind = "catalog" | "text" | "number" | "date";

export type SmartSearchRangeValue = {
  start?: string;
  end?: string;
};

export type SmartSearchRule<
  TFieldKey extends string = string,
  TOperator extends string = string,
> = {
  field: TFieldKey;
  operator: TOperator;
  mode?: SmartSearchRuleMode;
  value?: string;
  values?: string[];
  range?: SmartSearchRangeValue;
};

export type SmartSearchOperatorOption<TOperator extends string = string> = {
  id: TOperator;
  label: string;
  inputMode?: SmartSearchInputMode;
  placeholder?: string;
};

export type SmartSearchFieldConfig<
  TFieldKey extends string = string,
  TOperator extends string = string,
> = {
  id: TFieldKey;
  label: string;
  kind: SmartSearchFieldKind;
  description?: string;
  options?: DataTableSearchOption[];
  operators?: SmartSearchOperatorOption<TOperator>[];
  supportsExclude?: boolean;
  operatorInputMode?: Partial<Record<TOperator, SmartSearchInputMode>>;
  operatorPlaceholder?: Partial<Record<TOperator, string>>;
  placeholder?: string;
};
