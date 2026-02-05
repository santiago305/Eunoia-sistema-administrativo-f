import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

const roles = [
    { value: "", label: "Todos los roles" },
    { value: "admin", label: "Administrador" },
    { value: "moderator", label: "Moderador" },
    { value: "adviser", label: "Asesor" },
];

export function RoleSelect({ value, onChange }: { value: string; onChange: (val: string) => void }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // cerrar al hacer click fuera
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const selected = roles.find((r) => r.value === value);

    return (
        <div ref={ref} className="relative w-full">
            {/* Trigger */}
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex h-11 w-full items-center justify-between rounded-xl bg-gray-100 px-4
                   text-left text-md 
                   outline-none ring-1 ring-transparent
                   focus:ring-4 focus:ring-[#21b8a6]/20
                   hover:bg-gray-200/60 transition"
            >
                <span className={selected?.value ? "text-gray-600" : "text-gray-500"}>{selected?.label ?? "Selecciona un rol"}</span>
                <ChevronDown className={`h-5 w-5 text-gray-400 transition ${open ? "rotate-180" : ""}`} />
            </button>
            {open && (
                <div
                    className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl bg-white
                     shadow-lg ring-1 ring-black/5"
                >
                    {roles.map((role) => (
                        <button
                            key={role.value}
                            type="button"
                            onClick={() => {
                                onChange(role.value);
                                setOpen(false);
                            }}
                            className={`flex w-full px-4 py-3 text-left text-sm transition
                            ${value === role.value ? "bg-gray-100 text-gray-900 font-medium" : "text-gray-600 hover:bg-gray-50"}`}
                            >
                            {role.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
