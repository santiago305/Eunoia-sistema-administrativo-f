import type { MouseEvent, ReactNode } from 'react';
import type {
    AppliedDataTableFilter,
    DataTableFilterTree,
} from './filters/types';
import type { SmartSearchRule } from './search/types';

export type DataTablePinned = 'left' | 'right';

export type DataTableColumn<T> = {
    id: string;
    header: string;
    accessorKey?: keyof T;
    cell?: (row: T, index: number) => ReactNode;
    cardCell?: (row: T, index: number) => ReactNode;
    className?: string;
    headerClassName?: string;
    visible?: boolean;
    hideable?: boolean;
    width?: string;
    clickable?: boolean;
    onCellClick?: (row: T, index: number, event: MouseEvent<HTMLElement>) => void;
    stopRowClick?: boolean;
    copy?: boolean;
    searchable?: boolean;
    searchValue?: (row: T) => string;
    sortable?: boolean;
    sortAccessor?: keyof T | ((row: T) => string | number | boolean | Date | null | undefined);
    pinned?: DataTablePinned;
    lockPosition?: boolean;
    showInCards?: boolean;
    cardLabel?: string;
    cardTitle?: boolean;
};

export type DataTablePaginationMeta = {
    page: number;
    limit: number;
    total: number;
};

export type DataTableRangeDates = {
    startDate: Date | null;
    endDate: Date | null;
    onChange: (range: { startDate: Date | null; endDate: Date | null }) => void;
    label?: string;
    name?: string;
    disabled?: boolean;
    panelMinWidth?: number;
    fields?: { value: string; label: string }[];
    fieldValue?: string;
    onFieldChange?: (field: string) => void;
};

export type DataTableSmartRangeDate<
    TFieldKey extends string = string,
    TOperator extends string = string,
> = {
    fieldId: TFieldKey;
    value: SmartSearchRule<TFieldKey, TOperator> | null;
    onChange: (rule: SmartSearchRule<TFieldKey, TOperator> | null) => void;
    operators: {
        range: TOperator;
        week: TOperator;
        month: TOperator;
    };
    label?: string;
    disabled?: boolean;
};

export type DataTableFiltersConfig = {
    categories: DataTableFilterTree;
    value: AppliedDataTableFilter[];
    onChange: (next: AppliedDataTableFilter[]) => void;
    title?: string;
    maxWidth?: number;
    minWidth?: number;
    emptyMessage?: string;
};

export type DataTableSelectionChangeMeta<T> = {
    selectedRows: T[];
    selectedKeys: string[];
};

export type DataTableSortDirection = 'asc' | 'desc';

export type DataTableSearchMode = 'client' | 'server';
export type DataTableResponsiveMode = 'auto' | 'table' | 'cards';

export type DataTableSortState =
    | {
          columnId: string;
          direction: DataTableSortDirection;
      }
    | null;

export type DataTableExternalExportRangeState = {
    useDateRange: boolean;
    startDate: Date | null;
    endDate: Date | null;
};

export type DataTableRefreshAction = {
    visible?: boolean;
    onRefresh: () => void;
    loading?: boolean;
    disabled?: boolean;
    label?: string;
};

export type DataTableProps<T> = {
    data: T[];
    columns: DataTableColumn<T>[];
    tableId: string;
    paddingPaginated?:string;
    paddingTablePaginated?:string;
    showSelectionInfo?: boolean;
    loading?: boolean;
    emptyMessage?: string;
    rowKey?: keyof T | ((row: T, index: number) => string);
    striped?: boolean;
    hoverable?: boolean;
    animated?: boolean;
    pagination?: DataTablePaginationMeta;
    onPageChange?: (page: number) => void;
    className?: string;
    tableClassName?: string;
    onRowClick?: (row: T, index: number) => void;
    rowClickable?: boolean;
    rowClassName?: (row: T, index: number) => string | undefined;
    selectableColumns?: boolean;
    showSearch?: boolean;
    searchPlaceholder?: string;
    searchValue?: string;
    onSearchChange?: (value: string) => void;
    filtersConfig?: DataTableFiltersConfig;
    rangeDates?: DataTableRangeDates;
    smartRangeDate?: DataTableSmartRangeDate;
    searchMode?: DataTableSearchMode;
    globalSearchFn?: (row: T, query: string) => boolean;
    stickyHeader?: boolean;
    responsiveCards?: boolean;
    responsiveMode?: DataTableResponsiveMode;
    selectableRows?: boolean;
    selectedRowKeys?: string[];
    defaultSelectedRowKeys?: string[];
    onSelectedRowKeysChange?: (selectedKeys: string[], meta: DataTableSelectionChangeMeta<T>) => void;
    initialSort?: DataTableSortState;
    controlledSort?: DataTableSortState;
    onSortChange?: (sort: DataTableSortState) => void;
    toolbarSearchContent?: ReactNode;
    toolbarActions?: ReactNode;
    animateRowsThreshold?: number;
    maxHeight?: string;
    useRangeDatesForExternalExport?: boolean;
    onExternalExportRangeStateChange?: (state: DataTableExternalExportRangeState) => void;
    refreshAction?: DataTableRefreshAction;
};

export type DataTableColumnPreference = {
    visibleColumnIds: string[];
    orderedColumnIds: string[];
};

export type DataTableColumnManagerItem = {
    id: string;
    header: string;
    hideable?: boolean;
    pinned?: DataTablePinned;
    lockPosition?: boolean;
};
