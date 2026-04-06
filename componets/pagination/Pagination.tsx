import { ChevronLeft, ChevronRight } from 'lucide-react';

type Props = {
    page: number;
    limit: number;
    total: number;
    onPageChange: (page: number) => void;
};

function buildVisiblePages(currentPage: number, totalPages: number) {
    if (totalPages <= 7) {
        return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const pages = new Set<number>([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);

    return Array.from(pages)
        .filter((page) => page >= 1 && page <= totalPages)
        .sort((a, b) => a - b);
}

export function Pagination({ page, limit, total, onPageChange }: Props) {
    const totalPages = Math.ceil(total / limit);

    if (total <= limit) return null;

    const from = (page - 1) * limit + 1;
    const to = Math.min(page * limit, total);
    const pages = buildVisiblePages(page, totalPages);

    return (
        <div className="flex flex-wrap items-center gap-2">
            <button
                type="button"
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm transition hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
                <ChevronLeft className="h-4 w-4" />
            </button>

            {pages.map((pageNumber, index) => {
                const previous = pages[index - 1];
                const shouldShowDots = previous && pageNumber - previous > 1;

                return (
                    <div key={pageNumber} className="flex items-center gap-2">
                        {shouldShowDots ? <span className="px-1 text-sm text-muted-foreground">...</span> : null}

                        <button
                            type="button"
                            onClick={() => onPageChange(pageNumber)}
                            className={[
                                'rounded-xl border px-3 py-2 text-sm transition',
                                pageNumber === page ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-muted/50',
                            ].join(' ')}
                        >
                            {pageNumber}
                        </button>
                    </div>
                );
            })}

            <button
                type="button"
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
                className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm transition hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
                <ChevronRight className="h-4 w-4" />
            </button>
        </div>
);
}
