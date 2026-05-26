import { MonitorCog, ShieldCheck, ShoppingCart, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Role = { id: string; description: string };

type RoleDesc = "admin" | "moderator" | "adviser" | "purchasing_manager";

const LABELS: Record<RoleDesc, string> = {
    admin: "Administrador",
    moderator: "Moderador",
    adviser: "Asesor",
    purchasing_manager: "Jefe de compras",
};

const ICONS: Record<RoleDesc, LucideIcon> = {
    admin: MonitorCog,
    moderator: ShieldCheck,
    adviser: User,
    purchasing_manager: ShoppingCart,
};

const getRoleLabel = (description: string) =>
    LABELS[description as RoleDesc] ??
    description
        .replace(/[._-]+/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());

export const RolePicker = ({ roles, value, onChange, error }: { roles: Role[]; value: string; onChange: (id: string) => void; error?: string }) => {
    const visibleRoles = roles
        .map((role) => ({
            ...role,
            description: String(role.description ?? "").toLowerCase(),
        }))
        .filter((role) => role.id && role.description);

    const RoleButton = ({ role }: { role: Role }) => {
        const desc = String(role.description ?? "").toLowerCase();
        const active = role.id && value === role.id;
        const Icon = ICONS[desc as RoleDesc] ?? User;
        const label = getRoleLabel(desc);

        return (
            <div className="flex flex-col items-center gap-2">
                <button
                    type="button"
                    onClick={() => onChange(role.id)}
                    className={`h-11 w-full rounded-sm border-0 bg-zinc-100 hover:bg-zinc-200 cursor-pointer
                    grid place-items-center transition
                    ${
                        active
                            ? "bg-primary/10 text-primary outline-none ring-1 ring-primary/25"
                            : "text-zinc-500 hover:text-zinc-700 outline-none focus:ring-4 focus:ring-primary/20"
                    }`}
                    aria-pressed={!!active}
                    title={label}
                    disabled={!role.id}
                >
                    <Icon size={18} />
                </button>
                <p className="text-[11px] text-zinc-600">
                    <span>{label}</span>
                </p>
            </div>
        );
    };

    return (
        <div className="w-full">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {visibleRoles.map((role) => (
                    <RoleButton key={role.id} role={role} />
                ))}
            </div>

            <p className={`mt-1 text-[11px] text-red-500 ${error ? "visible" : "invisible"}`}>{error ?? "placeholder"}</p>
        </div>
    );
};


