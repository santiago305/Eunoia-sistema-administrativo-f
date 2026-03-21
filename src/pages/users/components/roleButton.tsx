import { MonitorCog, ShieldCheck, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Role = { id: string; description: string };

type RoleDesc = "admin" | "moderator" | "adviser";

const LABELS: Record<RoleDesc, string> = {
    admin: "Administrador",
    moderator: "Moderador",
    adviser: "Asesor",
};

const ICONS: Record<RoleDesc, LucideIcon> = {
    admin: MonitorCog,
    moderator: ShieldCheck,
    adviser: User,
};

export const RolePicker = ({ roles, value, onChange, error }: { roles: Role[]; value: string; onChange: (id: string) => void; error?: string }) => {
    const getRoleIdByDesc = (desc: RoleDesc) => roles.find((r) => String(r?.description).toLowerCase() === desc)?.id ?? "";

    const RoleButton = ({ desc }: { desc: RoleDesc }) => {
        const id = getRoleIdByDesc(desc);
        const active = id && value === id;
        const Icon = ICONS[desc];

        return (
            <div className="flex flex-col items-center gap-2">
                <button
                    type="button"
                    onClick={() => onChange(id)}
                    className={`h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 cursor-pointer
                    grid place-items-center transition
                    ${
                        active
                            ? "border-primary/40 bg-primary/10 text-zinc-700 ring-4 ring-primary/20 outline-none"
                            : "text-zinc-500 hover:text-zinc-700 outline-none focus:ring-4 focus:ring-primary/20"
                    }`}
                    aria-pressed={!!active}
                    title={LABELS[desc]}
                    disabled={!id}
                >
                    <Icon size={18} />
                </button>
                <p className="text-[11px] text-zinc-600">
                    <span>{LABELS[desc]}</span>
                </p>
            </div>
        );
    };

    return (
        <div className="w-full">
            <div className="grid grid-cols-3 gap-2">
                <RoleButton desc="admin" />
                <RoleButton desc="moderator" />
                <RoleButton desc="adviser" />
            </div>

            <p className={`mt-1 text-[11px] text-red-500 ${error ? "visible" : "invisible"}`}>{error ?? "placeholder"}</p>
        </div>
    );
};


