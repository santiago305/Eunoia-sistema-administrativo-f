import { useMemo, useState } from "react";

export function usePagination<T>(data: T[], initialPageSize = 8) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const total = data.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, page, pageSize]);

  // seguridad: si cambia data y la página ya no existe
  if (page > totalPages) {
    setPage(1);
  }

  return {
    page,
    pageSize,
    total,
    totalPages,
    paginatedData,
    setPage,
    setPageSize,
  };
}
