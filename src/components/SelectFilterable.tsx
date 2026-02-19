import { useEffect, useMemo, useRef, useState } from "react";

type Option = { value: string; label: string };

export function FilterableSelect({
    value,
    onChange,
    options,
    placeholder = "Seleccionar",
    searchPlaceholder = "Buscar...",
    placement = "bottom",
}: {
    value: string;
    onChange: (value: string) => void;
    options: Option[];
    placeholder?: string;
    searchPlaceholder?: string;
    placement?: "bottom" | "top";
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");

    const wrapperRef = useRef<HTMLDivElement | null>(null);
    const selected = options.find((o) => o.value === value);
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return options;
        return options.filter((o) => o.label.toLowerCase().includes(q));
    }, [options, query]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, []);

    return (
        <div className="relative" ref={wrapperRef}>
            <button type="button" className="h-10 w-full rounded-lg border border-black/10 bg-white px-3 text-sm text-left" onClick={() => setOpen((v) => !v)}>
                {selected ? selected.label : <span className="text-black/50">{placeholder}</span>}
            </button>

            {open && (
                <div
                    className={[
                        "absolute z-20 w-full rounded-lg border border-black/10 bg-white shadow-lg",
                        placement === "bottom" ? "top-full mt-2" : "bottom-full mb-2",
                    ].join(" ")}
                >
                    <div className="p-2 border-b border-black/5">
                        <input
                            className="h-9 w-full rounded-md border border-black/10 px-2 text-sm"
                            placeholder={searchPlaceholder}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div className="max-h-56 overflow-auto">
                        {filtered.length === 0 && <div className="px-3 py-2 text-sm text-black/50">Sin resultados</div>}
                        {filtered.map((opt) => (
                            <button
                                type="button"
                                key={opt.value}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-black/[0.03]"
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    onChange(opt.value);
                                    setOpen(false);
                                    setQuery("");
                                }}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
