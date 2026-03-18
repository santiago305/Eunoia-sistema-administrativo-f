import {
    createContext,
    ReactElement,
    ReactNode,
    useContext,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { createPortal } from "react-dom";

type OptionLike = {
    value: string;
    label?: string;
    children?: ReactNode;
};

type RootProps = {
    value: string;
    onChange: (value: string) => void;
    children: ReactNode;
    placeholder?: string;
    searchPlaceholder?: string;
    placement?: "bottom" | "top";
    className?: string;
    textSize?: string;
    usePortal?: boolean;
};

type ContextValue = {
    value: string;
    onChange: (value: string) => void;
    open: boolean;
    setOpen: (open: boolean) => void;
    query: string;
    setQuery: (query: string) => void;
    placeholder: string;
    searchPlaceholder: string;
    placement: "bottom" | "top";
    className: string;
    textSize: string;
    usePortal: boolean;
    selectedLabel: string | null;
    wrapperRef: React.RefObject<HTMLDivElement | null>;
    buttonRef: React.RefObject<HTMLButtonElement | null>;
    contentRef: React.RefObject<HTMLDivElement | null>;
    anchorRect: DOMRect | null;
};

const SelectContext = createContext<ContextValue | null>(null);

function useSelectContext() {
    const ctx = useContext(SelectContext);
    if (!ctx) {
        throw new Error("FilterableSelectComposed components must be used inside Root.");
    }
    return ctx;
}

function getOptionLabel(option: OptionLike) {
    if (option.label) return option.label;
    if (typeof option.children === "string") return option.children;
    return String(option.value);
}

function extractOptions(children: ReactNode): OptionLike[] {
    const options: OptionLike[] = [];
    const walk = (node: ReactNode) => {
        if (node == null) return;
        if (Array.isArray(node)) {
            node.forEach(walk);
            return;
        }
        if (typeof node === "object" && "type" in node) {
            const el = node as ReactElement<OptionLike>;
            if (el.type === FilterableSelectOption) {
                options.push(el.props);
            }
            if (el.props?.children) {
                walk(el.props.children);
            }
        }
    };
    walk(children);
    return options;
}

export function FilterableSelectRoot({
    value,
    onChange,
    children,
    placeholder = "Seleccionar",
    searchPlaceholder = "Buscar...",
    placement = "bottom",
    className = "h-10",
    textSize = "text-xs",
    usePortal = true,
}: RootProps) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

    const wrapperRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    const options = useMemo(() => extractOptions(children), [children]);
    const selectedLabel = useMemo(() => {
        const selected = options.find((o) => o.value === value);
        return selected ? getOptionLabel(selected) : null;
    }, [options, value]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node;
            if (
                wrapperRef.current &&
                !wrapperRef.current.contains(target) &&
                contentRef.current &&
                !contentRef.current.contains(target)
            ) {
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

    useLayoutEffect(() => {
        if (!open) return;
        const update = () => {
            const rect = buttonRef.current?.getBoundingClientRect() ?? null;
            setAnchorRect(rect);
        };
        update();
        window.addEventListener("resize", update);
        window.addEventListener("scroll", update, true);
        return () => {
            window.removeEventListener("resize", update);
            window.removeEventListener("scroll", update, true);
        };
    }, [open]);

    const ctx: ContextValue = {
        value,
        onChange,
        open,
        setOpen,
        query,
        setQuery,
        placeholder,
        searchPlaceholder,
        placement,
        className,
        textSize,
        usePortal,
        selectedLabel,
        wrapperRef,
        buttonRef,
        contentRef,
        anchorRect,
    };

    return (
        <SelectContext.Provider value={ctx}>
            <div className="relative" ref={wrapperRef}>
                {children}
            </div>
        </SelectContext.Provider>
    );
}

type TriggerProps = {
    className?: string;
};

export function FilterableSelectTrigger({ className }: TriggerProps) {
    const { open, setOpen, selectedLabel, placeholder, textSize, className: rootClass, buttonRef } =
        useSelectContext();
    const finalClass = className ?? rootClass;
    return (
        <button
            ref={buttonRef}
            type="button"
            className={`${finalClass} w-full rounded-lg border border-black/10 bg-white px-3 ${textSize} text-left`}
            onClick={() => setOpen(!open)}
        >
            {selectedLabel ? selectedLabel : <span className="text-black/50">{placeholder}</span>}
        </button>
    );
}

type ContentProps = {
    className?: string;
    children: ReactNode;
};

export function FilterableSelectContent({ className, children }: ContentProps) {
    const { open, placement, usePortal, anchorRect, contentRef } = useSelectContext();
    if (!open) return null;

    const content = (
        <div
            ref={contentRef}
            className={[
                "z-50 rounded-lg border border-black/10 bg-white shadow-lg",
                usePortal ? "fixed" : "absolute",
                className ?? "",
            ].join(" ")}
            style={
                usePortal && anchorRect
                    ? {
                          width: anchorRect.width,
                          left: anchorRect.left,
                          top:
                              placement === "bottom"
                                  ? anchorRect.top + anchorRect.height + 8
                                  : anchorRect.top - 8,
                          transform: placement === "bottom" ? "none" : "translateY(-100%)",
                      }
                    : undefined
            }
        >
            {children}
        </div>
    );

    if (usePortal) {
        return createPortal(content, document.body);
    }

    return (
        <div
            className={[
                "absolute w-full",
                placement === "bottom" ? "top-full mt-2" : "bottom-full mb-2",
            ].join(" ")}
        >
            {content}
        </div>
    );
}

type SearchProps = {
    className?: string;
};

export function FilterableSelectSearch({ className }: SearchProps) {
    const { query, setQuery, searchPlaceholder, textSize } = useSelectContext();
    return (
        <div className="p-2 border-b border-black/5">
            <input
                className={`h-9 w-full rounded-md border border-black/10 px-2 ${textSize} ${className ?? ""}`}
                placeholder={searchPlaceholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
            />
        </div>
    );
}

type OptionsProps = {
    children: ReactNode;
    emptyLabel?: string;
    className?: string;
};

export function FilterableSelectOptions({
    children,
    emptyLabel = "Sin resultados",
    className,
}: OptionsProps) {
    const { query, textSize } = useSelectContext();
    const q = query.trim().toLowerCase();
    const items = useMemo(() => {
        const childArray = Array.isArray(children) ? children : [children];
        return childArray.filter((child) => {
            if (child == null || typeof child !== "object" || !("type" in child)) return true;
            const el = child as ReactElement<OptionLike>;
            if (el.type !== FilterableSelectOption) return true;
            if (!q) return true;
            const label = getOptionLabel(el.props).toLowerCase();
            return label.includes(q);
        });
    }, [children, q]);

    return (
        <div
            className={`max-h-56 overflow-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-black/20 [&::-webkit-scrollbar-track]:bg-transparent ${className ?? ""}`}
            style={{ scrollbarWidth: "thin" }}
        >
            {items.length === 0 && <div className={`px-3 py-2 ${textSize} text-black/50`}>{emptyLabel}</div>}
            {items}
        </div>
    );
}

type OptionProps = {
    value: string;
    label?: string;
    children?: ReactNode;
    className?: string;
};

export function FilterableSelectOption({ value, label, children, className }: OptionProps) {
    const { onChange, setOpen, setQuery, textSize } = useSelectContext();
    const finalLabel = label ?? (typeof children === "string" ? children : String(value));
    return (
        <div
            role="button"
            tabIndex={0}
            className={`w-full px-3 py-2 text-left ${textSize} hover:bg-black/[0.03] ${className ?? ""}`}
            onClick={() => {
                onChange(value);
                setOpen(false);
                setQuery("");
            }}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onChange(value);
                    setOpen(false);
                    setQuery("");
                }
            }}
        >
            {children ?? finalLabel}
        </div>
    );
}

export const FilterableSelectComposed = {
    Root: FilterableSelectRoot,
    Trigger: FilterableSelectTrigger,
    Content: FilterableSelectContent,
    Search: FilterableSelectSearch,
    Options: FilterableSelectOptions,
    Option: FilterableSelectOption,
};
