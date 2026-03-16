import { ReactNode, useEffect, useRef, useState } from "react";

type DropdownItem = {
  label: ReactNode;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  disabled?: boolean;
};

type DropdownProps = {
  trigger?: ReactNode;
  children?: ReactNode;
  className?: string;
  menuClassName?: string;
  items?: Array<DropdownItem | false | null | undefined>;
  itemClassName?: string;
};

const DEFAULT_ITEM_CLASS =
  "w-full rounded-lg px-3 py-2 text-left text-[11px] text-black/80 hover:bg-black/[0.03]";

export function Dropdown({
  trigger,
  children,
  className = "",
  menuClassName = "",
  items,
  itemClassName = DEFAULT_ITEM_CLASS,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const visibleItems = items?.filter(Boolean) as DropdownItem[] | undefined;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div ref={ref} className={`relative inline-block ${className}`}>
      <button type="button" onClick={() => setOpen((prev) => !prev)} className="rounded-md p-2 ">
        {trigger ?? <span className="text-sm text-black/70">?</span>}
      </button>

      {open && (
        <div
          className={`absolute right-0 z-50 mt-2 min-w-44 rounded-xl border border-black/10 bg-white p-1 shadow-lg ${menuClassName}`}
        >
          {visibleItems ? (
            <div className="flex flex-col gap-1">
              {visibleItems.map((item, index) => (
                <button
                  key={index}
                  type="button"
                  className={item.className ?? itemClassName}
                  onClick={(event) => {
                    item.onClick?.(event);
                    setOpen(false);
                  }}
                  disabled={item.disabled}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : (
            children
          )}
        </div>
      )}
    </div>
  );
}
