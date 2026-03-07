import { ReactNode, useEffect, useRef, useState } from "react";

type DropdownProps = {
    trigger?: ReactNode;
    children: ReactNode;
    className?: string;
    menuClassName?: string;
};

export function Dropdown({ trigger, children, className = "", menuClassName = "" }: DropdownProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

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
                {trigger ?? <span className="text-sm text-black/70">⋮</span>}
            </button>

            {open && 
            <div className={`absolute right-0 z-50 mt-2 min-w-44 rounded-xl border border-black/10 bg-white 
            p-1 shadow-lg ${menuClassName}`}>
              {children}
            </div>}
        </div>
    );
}
