import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

type SelectOption = {
    value: string;
    label: string;
};

type FloatingSelectProps = {
    label: string;
    name: string;
    value: string;
    options: SelectOption[];
    onChange: (value: string) => void;
    error?: string;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    containerClassName?: string;
    searchable?: boolean;
    searchPlaceholder?: string;
    emptyMessage?: string;
    onSearchChange?: (value: string) => void;
};

export function FloatingSelect({
    label,
    name,
    value,
    options,
    onChange,
    error,
    placeholder,
    disabled = false,
    className = '',
    containerClassName = '',
    searchable = false,
    searchPlaceholder = 'Buscar...',
    emptyMessage = 'Sin resultados',
    onSearchChange,
}: FloatingSelectProps) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const rootRef = useRef<HTMLDivElement | null>(null);
    const searchInputRef = useRef<HTMLInputElement | null>(null);

    const selectedOption = useMemo(() => options.find((option) => option.value === value), [options, value]);

    const filteredOptions = useMemo(() => {
        if (!searchable) return options;

        const normalizedQuery = query.trim().toLowerCase();
        if (!normalizedQuery) return options;

        return options.filter((option) => option.label.toLowerCase().includes(normalizedQuery));
    }, [options, query, searchable]);

    const hasValue = value.trim().length > 0;

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (!rootRef.current) return;

            if (!rootRef.current.contains(event.target as Node)) {
                setOpen(false);
                setQuery('');
            }
        }

        function handleEscape(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setOpen(false);
                setQuery('');
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, []);

    useEffect(() => {
        if (open && searchable) {
            const timer = setTimeout(() => {
                searchInputRef.current?.focus();
            }, 50);

            return () => clearTimeout(timer);
        }
    }, [open, searchable]);

    return (
        <div ref={rootRef} className={`w-full ${containerClassName}`}>
            <div className="relative">
                <button
                    type="button"
                    id={name}
                    name={name}
                    disabled={disabled}
                    onClick={() => {
                        if (disabled) return;
                        setOpen((prev) => !prev);

                        if (open) {
                            setQuery('');
                        }
                    }}
                    className={[
                        'relative flex h-10 w-full items-center justify-between rounded-lg border bg-background px-3 py-2 text-left text-xs text-foreground outline-none transition-all',
                        error ? 'border-red-500 ring-0' : open ? 'border-primary ring-2 ring-primary/30' : 'border-border',
                        disabled ? 'cursor-not-allowed bg-muted text-muted-foreground' : '',
                        className,
                    ].join(' ')}
                    aria-expanded={open}
                    aria-haspopup="listbox"
                >
                    <span className={selectedOption ? 'text-foreground' : 'text-muted-foreground'}>{selectedOption?.label ?? placeholder}</span>

                    <ChevronDown
                        className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
                            open ? 'rotate-180' : ''
                        } ${error ? 'text-red-500' : open ? 'text-primary' : 'text-muted-foreground'}`}
                    />
                </button>

                <label
                    htmlFor={name}
                    className={[
                        'pointer-events-none absolute left-3 bg-background px-1 transition-all duration-200',
                        hasValue || open ? 'top-0 -translate-y-1/2 text-[11px]' : 'top-1/2 -translate-y-1/2 text-xs',
                        error ? 'text-red-500' : open ? 'text-primary' : 'text-muted-foreground',
                    ].join(' ')}
                >
                    {label}
                </label>

                <AnimatePresence>
                    {open && !disabled && (
                        <motion.div
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.18 }}
                            className="absolute z-30 mt-2 w-full overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-lg"
                        >
                            {searchable && (
                                <div className="border-b border-border p-2">
                                    <input
                                        ref={searchInputRef}
                                        value={query}
                                        onChange={(e) => {
                                            const next = e.target.value;
                                            setQuery(next);
                                            onSearchChange?.(next);
                                        }}
                                        placeholder={searchPlaceholder}
                                        className="h-9 w-full rounded-md border border-border bg-background px-3 text-xs text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/30"
                                    />
                                </div>
                            )}

                            <div className="scrollbar-panel max-h-64 overflow-y-auto py-1">
                                {filteredOptions.length === 0 ? (
                                    <div className="px-3 py-2 text-xs text-muted-foreground">{emptyMessage}</div>
                                ) : (
                                    filteredOptions.map((option) => {
                                        const isSelected = option.value === value;

                                        return (
                                            <button
                                                key={option.value}
                                                type="button"
                                                onMouseDown={(event) => {
                                                    event.preventDefault();
                                                    onChange(option.value);
                                                    setOpen(false);
                                                    setQuery('');
                                                }}
                                                className={[
                                                    'flex w-full items-center justify-between px-3 py-2 text-left text-xs transition-colors',
                                                    isSelected ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted',
                                                ].join(' ')}
                                                role="option"
                                                aria-selected={isSelected}
                                            >
                                                <span>{option.label}</span>
                                                {isSelected && <Check className="h-4 w-4" />}
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
        </div>
    );
}
