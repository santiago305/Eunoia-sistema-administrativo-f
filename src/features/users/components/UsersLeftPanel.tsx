import type { Dispatch, SetStateAction } from "react";
import type { User, UserListStatus } from "../types/users.types";
import { ROLE_LABELS } from "../types/roles.types";

const cn = (...s: Array<string | false | null | undefined>) => s.filter(Boolean).join(" ");

function RoleChip({ role }: { role: User["role"] }) {
  const map: Record<User["role"], string> = {
    admin: "bg-primary/10 text-primary",
    moderator: "bg-emerald-50 text-emerald-700",
    adviser: "bg-indigo-50 text-indigo-700",
    purchasing_manager: "bg-amber-50 text-amber-700",
  };

  return <span className={cn("rounded-sm px-2 py-0.5 text-[11px] font-medium", map[role])}>{ROLE_LABELS[role]}</span>;
}

interface UsersLeftPanelProps {
  query: string;
  setQuery: (value: string) => void;
  safePage: number;
  setPage: Dispatch<SetStateAction<number>>;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  totalPages: number;
  total: number;
  loading: boolean;
  users: User[];
  selectedId: string | null;
  setSelectedId: (id: string) => void;
  usersError: string;
  status: UserListStatus;
  setStatus: (status: UserListStatus) => void;
}

export function UsersLeftPanel({
  query,
  setQuery,
  safePage,
  setPage,
  hasPrevPage,
  hasNextPage,
  totalPages,
  loading,
  users,
  selectedId,
  setSelectedId,
  usersError,
  status,
  setStatus,
  total,
}: UsersLeftPanelProps) {
  return (
    <section className="flex h-full flex-col overflow-hidden rounded-sm bg-white">
      <div className="p-3">
        <div className="mb-3 flex items-center justify-between px-1">
          <div>
            <p className="text-sm font-semibold text-zinc-900">Lista</p>
            <p className="text-xs text-zinc-500">{total} usuarios encontrados</p>
          </div>
        </div>

        <div className="mb-2 grid grid-cols-2 gap-1 rounded-sm bg-zinc-100 p-1">
          {([
            { key: "active", label: "Activos" },
            { key: "inactive", label: "Eliminados" },
          ] as const).map((opt) => (
            <button
              key={opt.key}
              onClick={() => setStatus(opt.key)}
              className={cn(
                "rounded-sm px-2 py-1.5 text-[11px] font-medium transition 2xl:text-[12px]",
                status === opt.key ? "bg-primary/10 text-zinc-900" : "text-zinc-600 hover:text-zinc-800",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">⌕</span>
          <input
            id="users-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar... ( / )"
            className={cn(
              "w-full rounded-sm border-0 bg-zinc-100 px-9 py-2.5 text-[13px] text-zinc-800",
              "outline-none focus:bg-white focus:ring-2 focus:ring-primary/30",
              "2xl:text-[14px]",
            )}
          />
        </div>

        <div className="mt-2 flex items-center justify-between">
          <span className="text-[11px] text-zinc-500 2xl:text-[12px]">
            Pagina <span className="font-medium text-zinc-800">{safePage}</span> de{" "}
            <span className="font-medium text-zinc-800">{Math.max(1, totalPages)}</span>
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!hasPrevPage}
              className={cn(
                "rounded-sm px-2.5 py-1.5 text-[12px] transition",
                !hasPrevPage ? "cursor-not-allowed bg-zinc-50 text-zinc-400" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200",
              )}
            >
              ←
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasNextPage}
              className={cn(
                "rounded-sm px-2.5 py-1.5 text-[12px] transition",
                !hasNextPage ? "cursor-not-allowed bg-zinc-50 text-zinc-400" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200",
              )}
            >
              →
            </button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <div className="h-full overflow-auto p-2.5">
          <div className="grid gap-2">
            {users.map((u) => {
              const active = u.id === selectedId;
              return (
                <button
                  key={u.id}
                  onClick={() => setSelectedId(u.id)}
                  className={cn(
                    "w-full rounded-sm p-3 text-left transition-colors",
                    active
                      ? "bg-primary/10 text-zinc-950 ring-1 ring-primary/20"
                      : "bg-zinc-50 hover:bg-zinc-100",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-medium text-zinc-900 2xl:text-[14px]">{u.name}</div>
                      <div className="mt-1 truncate text-[12px] text-zinc-600 2xl:text-[13px]">{u.email}</div>
                      <div className="mt-1 truncate text-[11px] text-zinc-500 2xl:text-[12px]">{u.phone}</div>
                    </div>
                    <RoleChip role={u.role} />
                  </div>
                </button>
              );
            })}

            {!loading && !users.length ? (
              <div className="rounded-sm bg-zinc-50 p-6 text-center">
                <div className="text-[13px] font-medium text-zinc-900">Sin resultados</div>
                <div className="mt-1 text-[12px] text-zinc-600">{usersError || "No encontramos usuarios."}</div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
