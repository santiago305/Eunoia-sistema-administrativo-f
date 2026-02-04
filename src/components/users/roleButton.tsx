import { MonitorCog, ShieldCheck, User } from "lucide-react";

type Role = { id: string; description: string };

type RoleDesc = "admin" | "moderator" | "adviser";

const LABELS: Record<RoleDesc, string> = {
    admin: "Administrador",
    moderator: "Moderador",
    adviser: "Asesor",
};

const ICONS: Record<RoleDesc, any> = {
    admin: MonitorCog,
    moderator: ShieldCheck,
    adviser: User,
};

export const RolePicker = ({ roles, value, onChange, error }: { roles: Role[]; value: string; onChange: (id: string) => void; error?: string }) => {
    const getRoleIdByDesc = (desc: RoleDesc) => roles.find((r) => String(r?.description).toLowerCase() === desc)?.id ?? "";

    const RoleButton = ({ desc, className}: { desc: RoleDesc , className?:string}) => {
        const id = getRoleIdByDesc(desc);
        const active = id && value === id;
        const Icon = ICONS[desc];

        return (
            <div className="flex flex-col items-center gap-2">
                <button
                    type="button"
                    onClick={() => onChange(id)}
                    className={`h-14 w-13 rounded-xl bg-gray-200 hover:bg-gray-300 cursor-pointer
                    grid place-items-center transition ${className}
                    ${
                        active
                            ? "ring-4 ring-[#21b8a6]/35 text-gray-700 outline-none focus:ring-4 focus:ring-[#21b8a6]/20"
                            : "text-gray-500 hover:text-gray-700 outline-none focus:ring-4 focus:ring-[#21b8a6]/20"
                    }`}
                    aria-pressed={!!active}
                    title={LABELS[desc]}
                    disabled={!id}
                >
                    <Icon size={22} />
                </button>
                <p className={`text-gray-500 text-md ${className}`}>
                    <span>{LABELS[desc]}</span>
                </p>
            </div>
        );
    };

    return (
        <div className="w-full">
            <div className="flex justify-center gap-8">
                <RoleButton desc="admin" className="md:ml-5" />
                <RoleButton desc="moderator" />
                <RoleButton desc="adviser" className="md:ml-5" />
            </div>

            <p className={`text-sm text-start ml-5 mt-1 text-red-400 ${error ? "visible" : "invisible"}`}>{error ?? "placeholder"}</p>
        </div>
    );
};
