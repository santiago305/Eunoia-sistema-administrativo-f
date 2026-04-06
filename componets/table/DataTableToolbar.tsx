import { FloatingInput } from '@/components/FloatingInput';
import { Search, X } from 'lucide-react';
import type { ReactNode } from 'react';

type Props = {
    showSearch?: boolean;
    searchValue: string;
    searchPlaceholder: string;
    onSearchChange: (value: string) => void;
    rightContent?: ReactNode;
    selectionInfo?: ReactNode;
};

export function DataTableToolbar({
    showSearch,
    searchValue,
    searchPlaceholder,
    onSearchChange,
    rightContent,
    selectionInfo,
}: Props) {
    if (!showSearch && !rightContent && !selectionInfo) return null;

    return (
        <div className="relative z-30 mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                {showSearch ? (
                    <div className="relative w-full max-w-md">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                        <FloatingInput
                            label={searchPlaceholder}
                            name="datatable-search"
                            value={searchValue}
                            onChange={(event) => onSearchChange(event.target.value)}
                            className="h-11 rounded-sm border-border pl-4 pr-10 shadow-sm"
                        />

                        {searchValue ? (
                            <button
                                type="button"
                                onClick={() => onSearchChange('')}
                                className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        ) : null}
                    </div>
                ) : null}

                {selectionInfo}
            </div>

            {rightContent ? <div className="flex items-center justify-end">{rightContent}</div> : null}
        </div>
    );
}
