import { AnimatePresence, motion } from "framer-motion";
import type { Dispatch, SetStateAction } from "react";
import type { User, UserListStatus } from "../types/users.types";
import { ROLE_LABELS } from "../types/roles.types";

const cn = (...s: Array<string | false | null | undefined>) => s.filter(Boolean).join(" ");
const fadeUp = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 8 } };

function RoleChip({ role }: { role: User["role"] }) {
  const map: Record<User["role"], string> = {
    admin: "border-zinc-300 bg-zinc-900 text-white",
    moderator: "border-[rgba(33,184,166,.25)] bg-[rgba(33,184,166,.08)] text-[rgba(12,98,88,1)]",
    adviser: "border-indigo-200 bg-indigo-50 text-indigo-700",
  };
  return <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", map[role])}>{ROLE_LABELS[role]}</span>;
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
}: UsersLeftPanelProps) {
  return (
    <section className="flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_12px_34px_rgba(0,0,0,.04)]">
      <div className="border-b border-zinc-100 p-3">
        <div className="mb-2 grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 p-1">
          {([
            { key: "active", label: "Activos" },
            { key: "inactive", label: "Eliminados" },
          ] as const).map((opt) => (
            <button
              key={opt.key}
              onClick={() => setStatus(opt.key)}
              className={cn(
                "rounded-lg px-2 py-1.5 text-[11px] font-medium transition 2xl:text-[12px]",
                status === opt.key ? "bg-white text-zinc-800 shadow-sm" : "text-zinc-600 hover:text-zinc-800"
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
              "w-full rounded-xl border border-zinc-200 bg-zinc-50 px-9 py-2.5 text-[13px] text-zinc-800",
              "outline-none focus:border-[rgba(33,184,166,.45)] focus:bg-white focus:ring-4 focus:ring-[rgba(33,184,166,.10)]",
              "2xl:text-[14px]"
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
                "rounded-lg border px-2.5 py-1.5 text-[12px] transition",
                !hasPrevPage ? "cursor-not-allowed border-zinc-200 bg-zinc-50 text-zinc-400" : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
              )}
            >
              ←
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasNextPage}
              className={cn(
                "rounded-lg border px-2.5 py-1.5 text-[12px] transition",
                !hasNextPage ? "cursor-not-allowed border-zinc-200 bg-zinc-50 text-zinc-400" : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
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
            <AnimatePresence initial={false}>
              {loading ? (
                Array.from({ length: 0 }).map((_, i) => (
                  <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border border-zinc-200 bg-white p-3">
                    <div className="h-3 w-40 animate-pulse rounded bg-zinc-100" />
                    <div className="mt-2 h-3 w-56 animate-pulse rounded bg-zinc-100" />
                  </motion.div>
                ))
              ) : (
                <>
                  {users.map((u) => {
                    const active = u.id === selectedId;
                    return (
                      <motion.button
                        key={u.id}
                        layout
                        {...fadeUp}
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.995 }}
                        onClick={() => setSelectedId(u.id)}
                        className={cn(
                          "w-full rounded-xl border p-3 text-left transition",
                          active
                            ? "border-[rgba(33,184,166,.45)] bg-[rgba(33,184,166,.05)] shadow-[0_10px_22px_rgba(33,184,166,.10)]"
                            : "border-zinc-200 bg-white hover:bg-zinc-50"
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
                      </motion.button>
                    );
                  })}

                  {!users.length && (
                    <motion.div {...fadeUp} className="rounded-xl border border-zinc-200 bg-white p-6 text-center">
                      <div className="text-[13px] font-medium text-zinc-900">Sin resultados</div>
                      <div className="mt-1 text-[12px] text-zinc-600">{usersError || `No encontramos usuarios.`}</div>
                    </motion.div>
                  )}
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
