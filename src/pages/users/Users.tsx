import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PageTitle } from "@/components/PageTitle";
import {
  countUsersByRole,
  listUsers,
  updateUser,
  type CountUsersByRoleResponse,
  type UserApiListItem,
} from "@/services/userService";
import { findAllRoles } from "@/services/roleService";
import { UsersHeader } from "./components/UsersHeader";
import { UserForm } from "./components/formUser";
import type { Role, RoleOption, User } from "./types/users.types";

const PRIMARY = "#21b8a6";
const ROLES: Role[] = ["admin", "moderator", "adviser"];
const PAGE_SIZE = 20;

// ---------- Utils ----------
const cn = (...s: Array<string | false | null | undefined>) => s.filter(Boolean).join(" ");
const fmtDate = (iso: string) => new Date(iso).toLocaleString();
const pageStyle: React.CSSProperties & { "--primary": string } = { "--primary": PRIMARY };
const normalizeUser = (u: UserApiListItem): User => ({
  id: u.id,
  name: u.name,
  email: u.email,
  phone: String(u.telefono ?? ""),
  role: u.rol,
  createdAt: u.createdAt,
});
const readError = (error: unknown) => {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { status?: number; data?: { message?: string | string[] } } }).response;
    const message = response?.data?.message;
    const normalizedMessage = Array.isArray(message) ? message.join(" | ") : String(message ?? "");
    return { status: response?.status ?? 0, message: normalizedMessage };
  }
  return { status: 0, message: "" };
};

function RoleChip({ role }: { role: Role }) {
  const map: Record<Role, string> = {
    admin: "border-zinc-300 bg-zinc-900 text-white",
    moderator: "border-[rgba(33,184,166,.25)] bg-[rgba(33,184,166,.08)] text-[rgba(12,98,88,1)]",
    adviser: "border-indigo-200 bg-indigo-50 text-indigo-700",
  };
  return <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", map[role])}>{role}</span>;
}

const fadeUp = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 8 } };

export default function Users() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [usersError, setUsersError] = useState("");
  const [status] = useState<"all" | "active" | "inactive">("all");

  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [countsByRole, setCountsByRole] = useState<CountUsersByRoleResponse | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [roles, setRoles] = useState<RoleOption[]>([]);

  const [roleDraft, setRoleDraft] = useState<Role>("adviser");
  const [savingRole, setSavingRole] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setUsersError("");
      try {
        const data = await listUsers({
          status,
          page,
          q: query.trim() || undefined,
          order: "DESC",
        });
        const normalized = Array.isArray(data) ? data.map(normalizeUser) : [];
        if (!cancelled) {
          setUsers(normalized);
          setHasNextPage(normalized.length === PAGE_SIZE);
          setSelectedId((prev) => (prev && normalized.some((u) => u.id === prev) ? prev : (normalized[0]?.id ?? null)));
        }
      } catch (error: unknown) {
        const parsed = readError(error);
        const message =
          parsed.message.trim() ||
          (parsed.status === 401
            ? "Sesion no valida."
            : parsed.status === 403
              ? "Acceso denegado: rol insuficiente."
              : "No se pudo cargar la lista de usuarios.");
        if (!cancelled) {
          setUsers([]);
          setHasNextPage(false);
          setSelectedId(null);
          setUsersError(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, query, status]);

  useEffect(() => {
    let cancelled = false;
    const loadRoles = async () => {
      try {
        const response = await findAllRoles();
        const list = Array.isArray(response) ? response : response?.data;
        const normalized = (Array.isArray(list) ? list : [])
          .map((r: { id?: unknown; description?: unknown }) => ({
            id: String(r.id ?? ""),
            description: String(r.description ?? "").toLowerCase() as Role,
          }))
          .filter((r: RoleOption) => !!r.id && ROLES.includes(r.description));

        if (!cancelled) {
          setRoles(normalized);
        }
      } finally {
        if (!cancelled) void 0;
      }
    };
    void loadRoles();
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = useMemo(() => users.find((u) => u.id === selectedId) ?? null, [users, selectedId]);
  useEffect(() => {
    if (selected) setRoleDraft(selected.role);
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => setPage(1), [query]);

  const safePage = Math.max(1, page);

  const counts = useMemo(() => {
    const byRole = ROLES.reduce((acc, r) => ({ ...acc, [r]: 0 }), {} as Record<Role, number>);
    for (const u of users) byRole[u.role] += 1;
    return byRole;
  }, [users]);

  useEffect(() => {
    let cancelled = false;
    const loadCountsByRole = async () => {
      try {
        const q = query.trim();
        const data = await countUsersByRole({ q: q || undefined, status });
        if (!cancelled) setCountsByRole(data);
      } catch {
        if (!cancelled) setCountsByRole(null);
      }
    };
    void loadCountsByRole();
    return () => {
      cancelled = true;
    };
  }, [query, status]);

  const visibleRoles = useMemo(() => {
    const apiRoles = Object.keys(countsByRole?.byRole ?? {}) as Role[];
    return apiRoles.length ? apiRoles : ROLES;
  }, [countsByRole]);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") setModalOpen(false);
      if (ev.key === "/" && !ev.metaKey && !ev.ctrlKey && !ev.altKey) {
        const el = document.getElementById("users-search") as HTMLInputElement | null;
        if (el) {
          ev.preventDefault();
          el.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function saveRole() {
    if (!selected) return;
    if (roleDraft === selected.role) return;
    setSavingRole(true);
    try {
      const roleId = roles.find((r) => r.description === roleDraft)?.id;
      await updateUser(selected.id, (roleId ? { roleId } : { rol: roleDraft }) as never);
      setUsers((p) => p.map((u) => (u.id === selected.id ? { ...u, role: roleDraft } : u)));
    } finally {
      setSavingRole(false);
    }
  }

  return (
    <div
      className={cn(
        "w-full bg-gradient-to-b from-white via-white to-zinc-50",
        "h-[calc(100vh-var(--dashTop,0px))] overflow-hidden",
        "flex flex-col",
        "py-4 sm:py-6 2xl:py-8 3xl:py-10 4xl:py-12"
      )}
      style={pageStyle}
    >
      <PageTitle title="Gestión de usuarios" />
      <div className="mx-auto flex h-full w-full max-w-[1280px] min-h-0 flex-col px-4 sm:px-6 lg:max-w-[1440px] lg:px-8 2xl:max-w-[1680px] 2xl:px-10">
        {/* Top bar con referencias y resumen */}
        <UsersHeader
          onCreateClick={() => setModalOpen(true)}
          visibleRoles={visibleRoles}
          countsByRole={countsByRole}
          counts={counts}
        />

        {/* Main: ocupa TODO el resto */}
        <div className={cn("mt-4 grid min-h-0 flex-1 gap-3", "lg:grid-cols-[420px_1fr]", "2xl:gap-4 3xl:gap-5")}>
        {/* Left panel */}
        <section className="flex h-full flex-col rounded-2xl border border-zinc-200 bg-white shadow-[0_12px_34px_rgba(0,0,0,.04)]">
          {/* Search + pager */}
          <div className="border-b border-zinc-100 p-3">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">âŒ•</span>
              <input
                id="users-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscarâ€¦ ( / )"
                className={cn(
                  "w-full rounded-xl border border-zinc-200 bg-zinc-50 px-9 py-2.5 text-[13px] text-zinc-800",
                  "outline-none focus:border-[rgba(33,184,166,.45)] focus:bg-white focus:ring-4 focus:ring-[rgba(33,184,166,.10)]",
                  "2xl:text-[14px]"
                )}
              />
            </div>

            <div className="mt-2 flex items-center justify-between">
              <span className="text-[11px] text-zinc-500 2xl:text-[12px]">
                PÃ¡gina <span className="font-medium text-zinc-800">{safePage}</span>
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className={cn(
                    "rounded-lg border px-2.5 py-1.5 text-[12px] transition",
                    safePage === 1 ? "cursor-not-allowed border-zinc-200 bg-zinc-50 text-zinc-400" : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                  )}
                >
                  â†
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!hasNextPage}
                  className={cn(
                    "rounded-lg border px-2.5 py-1.5 text-[12px] transition",
                    !hasNextPage ? "cursor-not-allowed border-zinc-200 bg-zinc-50 text-zinc-400" : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                  )}
                >
                  â†’
                </button>
              </div>
            </div>
          </div>

          {/* âœ… Alto mÃ¡s reducido del Ã¡rea scroll: dejamos un â€œcinturÃ³nâ€ fijo abajo */}
          <div className="min-h-0 flex-1">
            {/* Scroll solo aquÃ­ */}
            <div className="h-full overflow-auto p-2.5">
              <div className="grid gap-2">
                <AnimatePresence initial={false}>
                  {loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
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
                          <div className="mt-1 text-[12px] text-zinc-600">
                            {usersError || `No encontramos â€œ${query}â€.`}
                          </div>
                          <button
                            onClick={() => setQuery("")}
                            className="mt-3 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[12px] text-zinc-700 hover:bg-zinc-50"
                          >
                            Limpiar
                          </button>
                        </motion.div>
                      )}
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Footer fijo */}
          <div className="border-t border-zinc-100 px-3 py-2 text-[11px] text-zinc-500 2xl:text-[12px]">
            20 por pÃ¡gina Â· {users.length} resultados en esta pÃ¡gina
          </div>
        </section>

        {/* Right panel */}
        <section className="h-auto rounded-2xl border border-zinc-200 bg-white shadow-[0_12px_34px_rgba(0,0,0,.04)]">
          <div className="flex h-full flex-col">
            <div className="border-b border-zinc-100 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-[13px] font-medium text-zinc-900 2xl:text-[14px]">Detalle</h2>
                  <p className="mt-1 text-[12px] text-zinc-600 2xl:text-[13px]">Solo rol editable</p>
                </div>
                <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 text-[11px] text-zinc-600 2xl:text-[12px]">
                  {selected ? `ID #${selected.id}` : "â€”"}
                </span>
              </div>
            </div>

            <div className="min-h-0 flex-1 p-4">
              {!selected ? (
                <div className="flex h-full items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 p-6 text-center">
                  <div>
                    <div className="text-[13px] font-medium text-zinc-900">Selecciona un usuario</div>
                    <div className="mt-1 text-[12px] text-zinc-600">Desde la lista izquierda.</div>
                  </div>
                </div>
              ) : (
                <motion.div
                  key={selected.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="grid h-full grid-rows-[auto_auto_1fr] gap-3"
                >
                  <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[11px] text-zinc-500">Nombre</div>
                        <div className="truncate text-[15px] font-medium text-zinc-900 2xl:text-[16px]">{selected.name}</div>
                      </div>
                      <RoleChip role={selected.role} />
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                        <div className="text-[11px] text-zinc-500">Email</div>
                        <div className="truncate text-[12px] text-zinc-800 2xl:text-[13px]">{selected.email}</div>
                      </div>
                      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                        <div className="text-[11px] text-zinc-500">Teléfono</div>
                        <div className="truncate text-[12px] text-zinc-800 2xl:text-[13px]">{selected.phone}</div>
                      </div>
                    </div>

                    <div className="mt-2 text-[11px] text-zinc-500 2xl:text-[12px]">Creado: {fmtDate(selected.createdAt)}</div>
                  </div>

                  <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[11px] text-zinc-500">Rol</div>
                        <div className="text-[13px] font-medium text-zinc-900 2xl:text-[14px]">Cambiar rol</div>
                      </div>
                      {roleDraft !== selected.role && (
                        <span className="rounded-full border border-[rgba(33,184,166,.25)] bg-[rgba(33,184,166,.08)] px-2 py-1 text-[11px] text-[rgba(12,98,88,1)]">
                          Pendiente
                        </span>
                      )}
                    </div>

                    <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
                      <select
                        value={roleDraft}
                        onChange={(e) => setRoleDraft(e.target.value as Role)}
                        className={cn(
                          "w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-[13px] text-zinc-800",
                          "outline-none focus:border-[rgba(33,184,166,.45)] focus:bg-white focus:ring-4 focus:ring-[rgba(33,184,166,.10)]",
                          "2xl:text-[14px]"
                        )}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={saveRole}
                        disabled={savingRole || roleDraft === selected.role}
                        className={cn(
                          "rounded-xl px-4 py-2.5 text-[13px] font-medium text-white transition",
                          savingRole || roleDraft === selected.role ? "cursor-not-allowed opacity-60" : "active:scale-[.99]"
                        )}
                        style={{ background: PRIMARY, boxShadow: "0 10px 26px rgba(33,184,166,.16)" }}
                      >
                        {savingRole ? "Guardandoâ€¦" : "Guardar"}
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-zinc-200 bg-gradient-to-br from-white to-zinc-50 p-4">
                    <div className="text-[12px] text-zinc-600 2xl:text-[13px]">
                      Espacio para futuras acciones (permisos, logs, reset password) sin romper el alto.
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </section>
        </div>
      </div>

      {/* âœ… Modal centrado: crear usuario */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-3"
            onMouseDown={(e) => e.target === e.currentTarget && setModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 14, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 14, scale: 0.99 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <UserForm closeModal={() => setModalOpen(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}





