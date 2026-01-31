import { useEffect, useMemo, useState } from "react";

export function usePagination<T>(data: T[], initialPageSize = 8) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const total = data.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, page, pageSize]);

  // seguridad: si cambia data y la pagina ya no existe
  useEffect(() => {
    if (page > totalPages) {
      setPage(1);
    }
  }, [page, totalPages]);

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
