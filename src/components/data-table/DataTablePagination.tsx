type Props = {
  loading?: boolean;
  total: number;
  page: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  pageSize: number;
  hasPrev: boolean;
  hasNext: boolean;
  onPageSizeChange: (value: number) => void;
  onPrevious: () => void;
  onNext: () => void;
};

export function DataTablePagination({
  loading = false,
  total,
  page,
  totalPages,
  startIndex,
  endIndex,
  pageSize,
  hasPrev,
  hasNext,
  onPageSizeChange,
  onPrevious,
  onNext,
}: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/10 px-4 py-4 text-xs text-black/60 sm:px-5">
      <span className="hidden sm:inline">
        Mostrando {startIndex}-{endIndex} de {total}
      </span>

      <div className="flex items-center gap-2">
        <select
          className="rounded-lg border border-black/10 bg-white px-2 py-2 text-xs"
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
        >
          {[10, 20, 30, 50].map((size) => (
            <option key={size} value={size}>
              {size} / página
            </option>
          ))}
        </select>

        <button
          className="rounded-lg border border-black/10 bg-white px-3 py-2 text-xs hover:bg-black/[0.03] disabled:opacity-40"
          disabled={!hasPrev || loading}
          onClick={onPrevious}
          type="button"
        >
          Anterior
        </button>

        <span className="tabular-nums">
          Página {page} de {totalPages}
        </span>

        <button
          className="rounded-lg border border-black/10 bg-white px-3 py-2 text-xs hover:bg-black/[0.03] disabled:opacity-40"
          disabled={!hasNext || loading}
          onClick={onNext}
          type="button"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}