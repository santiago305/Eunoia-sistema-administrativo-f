import { ReactNode, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";

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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const visibleItems = items?.filter(Boolean) as DropdownItem[] | undefined;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        ref.current &&
        !ref.current.contains(target) &&
        (!menuRef.current || !menuRef.current.contains(target))
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const updatePosition = () => {
    const triggerEl = triggerRef.current;
    const menuEl = menuRef.current;
    if (!triggerEl || !menuEl) return;

    const rect = triggerEl.getBoundingClientRect();
    const menuRect = menuEl.getBoundingClientRect();
    const spacing = 8;

    let top = rect.bottom + spacing;
    let left = rect.right;
    let transform = "translateX(-100%)";

    const wouldOverflowBottom = top + menuRect.height > window.innerHeight;
    const canPlaceAbove = rect.top - spacing - menuRect.height >= 0;

    if (wouldOverflowBottom && canPlaceAbove) {
      top = rect.top - spacing;
      transform = "translate(-100%, -100%)";
    }

    setMenuStyle({
      position: "fixed",
      top,
      left,
      transform,
      zIndex: 9999,
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    const raf = window.requestAnimationFrame(() => {
      updatePosition();
    });
    return () => window.cancelAnimationFrame(raf);
  }, [open, visibleItems?.length, children]);

  useEffect(() => {
    if (!open) return;
    const handle = () => updatePosition();
    window.addEventListener("resize", handle);
    window.addEventListener("scroll", handle, true);
    return () => {
      window.removeEventListener("resize", handle);
      window.removeEventListener("scroll", handle, true);
    };
  }, [open]);

  const menuContent = (
    <div
      ref={menuRef}
      className={`fixed z-[9999] min-w-44 rounded-xl border border-black/10 bg-white p-1 shadow-lg ${menuClassName}`}
      style={menuStyle}
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
  );

  return (
    <div ref={ref} className={`relative inline-block ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="rounded-md p-2 "
      >
        {trigger ?? <span className="text-sm text-black/70">?</span>}
      </button>

      {open && createPortal(menuContent, document.body)}
    </div>
  );
}
