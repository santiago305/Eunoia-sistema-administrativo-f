import { useEffect, useMemo, useState } from 'react';
import type { DataTablePaginationMeta } from '@/components/table/types';

type Params<T> = {
    data: T[];
    limit: number;
};

export function useLocalPagination<T>({ data, limit }: Params<T>) {
    const [page, setPage] = useState(1);

    useEffect(() => {
        const totalPages = Math.max(1, Math.ceil(data.length / limit));

        if (page > totalPages) {
            setPage(totalPages);
        }
    }, [data.length, limit, page]);

    const paginatedData = useMemo(
        () => data.slice((page - 1) * limit, page * limit),
        [data, limit, page],
    );

    const pagination: DataTablePaginationMeta = useMemo(
        () => ({
            page,
            limit,
            total: data.length,
        }),
        [data.length, limit, page],
    );

    return {
        page,
        setPage,
        paginatedData,
        pagination,
    };
}
