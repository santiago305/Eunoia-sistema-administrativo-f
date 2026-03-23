import type { MouseEvent, ReactNode } from "react";

export type DataTableColumn<T> = {
  id: string;
  header: string;
  accessorKey?: keyof T;
  cell?: (row: T, index: number) => ReactNode;
  className?: string;
  headerClassName?: string;
  visible?: boolean;
  hideable?: boolean;

  clickable?: boolean;
  onCellClick?: (
    row: T,
    index: number,
    event: MouseEvent<HTMLElement>,
  ) => void;
};

export type DataTablePaginationMeta = {
  page: number;
  limit: number;
  total: number;
};

export type DataTableProps<T> = {
  data: T[];
  columns: DataTableColumn<T>[];
  tableId: string;

  selectableColumns?: boolean;

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
};