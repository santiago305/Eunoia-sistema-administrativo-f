import type { CountUsersByRoleResponse } from "@/services/userService";

const PRIMARY = "#21b8a6";
const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  moderator: "Moderator",
  adviser: "Adviser",
};

const cn = (...s: Array<string | false | null | undefined>) => s.filter(Boolean).join(" ");

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-0.5 text-[15px] font-semibold leading-none text-zinc-900 2xl:text-[16px]">{value}</div>
    </div>
  );
}

export function UsersHeader({
  onCreateClick,
  visibleRoles,
  countsByRole,
  counts,
}: {
  onCreateClick: () => void;
  visibleRoles: string[];
  countsByRole: CountUsersByRoleResponse | null;
  counts: Record<string, number>;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-2xl font-semibold tracking-tight text-zinc-900">
              Gestión de usuarios
            </h1>
          </div>

          <p className="mt-1 text-[12px] text-zinc-600 2xl:text-[13px]">
            Administra las cuentas de usuario y sus permisos.
          </p>
        </div>

        <div className="shrink-0">
          <button
            onClick={onCreateClick}
            className="w-full rounded-xl px-3 py-2 text-[12px] font-medium text-white shadow-[0_10px_26px_rgba(33,184,166,.18)] transition active:scale-[.99] sm:w-auto sm:px-4 sm:py-2.5 sm:text-[13px]"
            style={{ background: PRIMARY }}
          >
            + Nuevo
          </button>
        </div>
      </div>

      <div
        className={cn(
          "grid gap-2",
          visibleRoles.length === 1
            ? "grid-cols-1"
            : visibleRoles.length === 2
            ? "grid-cols-2"
            : "grid-cols-2 sm:grid-cols-3"
        )}
      >
        {visibleRoles.map((role) => (
          <StatPill
            key={role}
            label={ROLE_LABELS[role] ?? role}
            value={(countsByRole?.byRole as Record<string, number> | undefined)?.[role] ?? counts[role] ?? 0}
          />
        ))}
      </div>
    </div>
  );
}
