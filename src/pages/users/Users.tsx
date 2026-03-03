import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PageTitle } from "@/components/PageTitle";
import { countUsersByRole, createUser, type CountUsersByRoleResponse } from "@/services/userService";
import { findAllRoles } from "@/services/roleService";

type Role = "admin" | "moderator" | "adviser";
type User = { id: string; name: string; email: string; phone: string; role: Role; createdAt: string };
type RoleOption = { id: string; description: Role };

const PRIMARY = "#21b8a6";
const ROLES: Role[] = ["admin", "moderator", "adviser"];
const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  moderator: "Moderator",
  adviser: "Adviser",
};
const PAGE_SIZE = 20;

// ---------- Mock API (cÃ¡mbialo por backend) ----------
function makeMockUsers(count = 220): User[] {
  const names = ["Santiago", "Valeria", "Mateo", "LucÃ­a", "Diego", "Camila", "SofÃ­a", "Juan", "Ana", "Carlos"];
  const last = ["GÃ³mez", "PÃ©rez", "Flores", "Ramos", "Torres", "DÃ­az", "Vega", "Castro", "Ortega", "Mendoza"];
  return Array.from({ length: count }).map((_, i) => {
    const first = names[i % names.length];
    const ln = last[(i * 3) % last.length];
    const id = String(i + 1);
    return {
      id,
      name: `${first} ${ln}`,
      email: `${first.toLowerCase()}.${ln.toLowerCase()}${i + 1}@mail.com`,
      phone: `+51 9${String(10000000 + i).slice(0, 8)}`,
      role: ROLES[i % ROLES.length],
      createdAt: new Date(Date.now() - i * 86400000).toISOString(),
    };
  });
}

let DB: User[] = makeMockUsers(260);

const api = {
  async listUsers() {
    return structuredClone(DB);
  },
  async createUser(payload: { name: string; email: string; password: string; phone: string; role: Role }) {
    const id = String(DB.length + 1);
    const u: User = {
      id,
      name: payload.name.trim(),
      email: payload.email.trim().toLowerCase(),
      phone: payload.phone.trim(),
      role: payload.role,
      createdAt: new Date().toISOString(),
    };
    DB = [u, ...DB];
    return structuredClone(u);
  },
  async updateUserRole(id: string, role: Role) {
    DB = DB.map((u) => (u.id === id ? { ...u, role } : u));
    return structuredClone(DB.find((u) => u.id === id)!);
  },
};

// ---------- Utils ----------
const cn = (...s: Array<string | false | null | undefined>) => s.filter(Boolean).join(" ");
const contains = (a: string, b: string) => (a || "").toLowerCase().includes((b || "").toLowerCase());
const fmtDate = (iso: string) => new Date(iso).toLocaleString();

function validateCreate(v: { name: string; email: string; password: string; telefono: string; roleId: string }) {
  const e: Record<string, string> = {};
  if (!v.name.trim()) e.name = "Nombre requerido";
  if (!v.email.trim() || !/^\S+@\S+\.\S+$/.test(v.email)) e.email = "Email invÃ¡lido";
  if (!v.password.trim()) e.password = "ContraseÃ±a requerida";
  if (!v.telefono.trim()) e.telefono = "TelÃ©fono requerido";
  if (!v.roleId.trim()) e.roleId = "Rol requerido";
  return e;
}

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

  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [countsByRole, setCountsByRole] = useState<CountUsersByRoleResponse | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [create, setCreate] = useState({ name: "", email: "", password: "", telefono: "", avatarUrl: "", roleId: "" });
  const [createErr, setCreateErr] = useState<Record<string, string>>({});
  const [createGeneralErr, setCreateGeneralErr] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);

  const [roleDraft, setRoleDraft] = useState<Role>("adviser");
  const [savingRole, setSavingRole] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const data = await api.listUsers();
      setUsers(data);
      setSelectedId(data[0]?.id ?? null);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadRoles = async () => {
      setLoadingRoles(true);
      try {
        const response = await findAllRoles();
        const list = Array.isArray(response) ? response : response?.data;
        const normalized = (Array.isArray(list) ? list : [])
          .map((r: any) => ({
            id: String(r?.id ?? ""),
            description: String(r?.description ?? "").toLowerCase() as Role,
          }))
          .filter((r: RoleOption) => !!r.id && ROLES.includes(r.description));

        if (!cancelled) {
          setRoles(normalized);
          const adviser = normalized.find((r: RoleOption) => r.description === "adviser");
          setCreate((prev) => ({ ...prev, roleId: prev.roleId || adviser?.id || "" }));
        }
      } finally {
        if (!cancelled) setLoadingRoles(false);
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

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return users;
    return users.filter((u) => contains(u.name, q) || contains(u.email, q) || contains(u.phone, q));
  }, [users, query]);

  useEffect(() => setPage(1), [query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = useMemo(() => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE), [filtered, safePage]);

  const counts = useMemo(() => {
    const byRole = ROLES.reduce((acc, r) => ({ ...acc, [r]: 0 }), {} as Record<Role, number>);
    for (const u of filtered) byRole[u.role] += 1;
    return byRole;
  }, [filtered]);

  useEffect(() => {
    let cancelled = false;
    const loadCountsByRole = async () => {
      try {
        const q = query.trim();
        const data = await countUsersByRole({ q: q || undefined, status: "all" });
        if (!cancelled) setCountsByRole(data);
      } catch {
        if (!cancelled) setCountsByRole(null);
      }
    };
    void loadCountsByRole();
    return () => {
      cancelled = true;
    };
  }, [query]);

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

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    const errs = validateCreate(create);
    setCreateErr(errs);
    setCreateGeneralErr([]);
    if (Object.keys(errs).length) return;

    setCreating(true);
    try {
      await createUser({
        name: create.name.trim(),
        email: create.email.trim().toLowerCase(),
        password: create.password,
        roleId: create.roleId,
        telefono: create.telefono.trim(),
        avatarUrl: create.avatarUrl.trim() || undefined,
      });

      const selectedRole = roles.find((r) => r.id === create.roleId)?.description ?? "adviser";
      const u: User = {
        id: `${Date.now()}`,
        name: create.name.trim(),
        email: create.email.trim().toLowerCase(),
        phone: create.telefono.trim(),
        role: selectedRole,
        createdAt: new Date().toISOString(),
      };
      setUsers((p) => [u, ...p]);
      setSelectedId(u.id);
      const adviser = roles.find((r) => r.description === "adviser");
      setCreate({ name: "", email: "", password: "", telefono: "", avatarUrl: "", roleId: adviser?.id ?? "" });
      setCreateErr({});
      setCreateGeneralErr([]);
      setModalOpen(false);
      setQuery("");
      setPage(1);
    } catch (error: any) {
      const status = Number(error?.response?.status ?? 0);
      const raw = error?.response?.data?.message;
      const rawMessage = Array.isArray(raw) ? raw.join(" | ") : String(raw ?? "No se pudo crear el usuario");
      const chunks = rawMessage
        .split("|")
        .map((m: string) => m.trim())
        .filter(Boolean);

      const nextFieldErrors: Record<string, string> = {};
      const general: string[] = [];
      for (const msg of chunks) {
        const lower = msg.toLowerCase();
        if (lower.includes("name")) nextFieldErrors.name = msg;
        else if (lower.includes("email")) nextFieldErrors.email = msg;
        else if (lower.includes("password")) nextFieldErrors.password = msg;
        else if (lower.includes("roleid") || lower.includes("rol")) nextFieldErrors.roleId = msg;
        else if (lower.includes("telefono")) nextFieldErrors.telefono = msg;
        else general.push(msg);
      }

      if (status === 400) {
        setCreateErr((prev) => ({ ...prev, ...nextFieldErrors }));
        setCreateGeneralErr(general);
      } else if (status === 401 || status === 403) {
        setCreateGeneralErr(chunks.length ? chunks : ["No tienes permisos para crear usuarios"]);
      } else {
        setCreateGeneralErr(chunks.length ? chunks : ["Se produjo un error al crear al usuario"]);
      }
    } finally {
      setCreating(false);
    }
  }

  async function saveRole() {
    if (!selected) return;
    if (roleDraft === selected.role) return;
    setSavingRole(true);
    try {
      const updated = await api.updateUserRole(selected.id, roleDraft);
      setUsers((p) => p.map((u) => (u.id === updated.id ? updated : u)));
    } finally {
      setSavingRole(false);
    }
  }

  return (
    <div
      className={cn(
        "w-full bg-gradient-to-b from-white via-white to-zinc-50",
        // âœ… Sin scroll global: usa todo el alto del Ã¡rea del dashboard
        "h-[calc(100vh-var(--dashTop,0px))] overflow-hidden",
        "flex flex-col",
        "py-4 sm:py-6 2xl:py-8 3xl:py-10 4xl:py-12"
      )}
      style={{ ["--primary" as any]: PRIMARY } as React.CSSProperties}
    >
      <PageTitle title="GestiÃ³n de usuarios" />
      <div className="mx-auto flex h-full w-full max-w-[1280px] min-h-0 flex-col px-4 sm:px-6 lg:max-w-[1440px] lg:px-8 2xl:max-w-[1680px] 2xl:px-10">
        {/* Top bar con referencias y resumen */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mt-2 flex items-center gap-2">
              <h1 className="truncate text-2xl font-semibold tracking-tight text-zinc-900">
                GestiÃ³n de usuarios
              </h1>
            </div>

            <p className="mt-1 text-[12px] text-zinc-600 2xl:text-[13px]">
              Administra las cuentas de usuario y sus permisos.
            </p>

            <div className={cn("mt-3 grid grid-cols-2 gap-2", visibleRoles.length === 1 ? "sm:grid-cols-1" : "sm:grid-cols-3")}>
              {visibleRoles.map((role) => (
                <StatPill key={role} label={ROLE_LABELS[role]} value={countsByRole?.byRole?.[role] ?? counts[role] ?? 0} />
              ))}
            </div>
          </div>

          <button
            onClick={() => setModalOpen(true)}
            className="rounded-xl px-3 py-2 text-[12px] font-medium text-white shadow-[0_10px_26px_rgba(33,184,166,.18)] transition active:scale-[.99] sm:px-4 sm:py-2.5 sm:text-[13px]"
            style={{ background: PRIMARY }}
          >
            + Nuevo
          </button>
        </div>

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
                PÃ¡gina <span className="font-medium text-zinc-800">{safePage}</span> / {totalPages}
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
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className={cn(
                    "rounded-lg border px-2.5 py-1.5 text-[12px] transition",
                    safePage === totalPages ? "cursor-not-allowed border-zinc-200 bg-zinc-50 text-zinc-400" : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
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
                      {paged.map((u) => {
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

                      {!paged.length && (
                        <motion.div {...fadeUp} className="rounded-xl border border-zinc-200 bg-white p-6 text-center">
                          <div className="text-[13px] font-medium text-zinc-900">Sin resultados</div>
                          <div className="mt-1 text-[12px] text-zinc-600">No encontramos â€œ{query}â€.</div>
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
            20 por pÃ¡gina Â· {filtered.length} resultados
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
                        <div className="text-[11px] text-zinc-500">TelÃ©fono</div>
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
              className="w-full max-w-[560px] rounded-2xl border border-zinc-200 bg-white shadow-[0_30px_90px_rgba(0,0,0,.22)]"
            >
              <div className="flex items-center justify-between border-b border-zinc-100 p-4">
                <div>
                  <div className="text-[13px] font-medium text-zinc-900">Crear usuario</div>
                  <div className="mt-1 text-[12px] text-zinc-600">Completa los datos</div>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[12px] text-zinc-700 hover:bg-zinc-50"
                >
                  âœ•
                </button>
              </div>

              <form onSubmit={submitCreate} className="p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Nombre" value={create.name} onChange={(v) => setCreate((p) => ({ ...p, name: v }))} placeholder="Ej: Santiago PÃ©rez" error={createErr.name} span2 />
                  <Field label="Email" value={create.email} onChange={(v) => setCreate((p) => ({ ...p, email: v }))} placeholder="usuario@mail.com" error={createErr.email} />
                  <Field label="TelÃ©fono" value={create.telefono} onChange={(v) => setCreate((p) => ({ ...p, telefono: v }))} placeholder="+51 9xxxxxxxx" error={createErr.telefono} />
                  <Field label="ContraseÃ±a" type="password" value={create.password} onChange={(v) => setCreate((p) => ({ ...p, password: v }))} placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" error={createErr.password} />
                  <Field
                    label="Avatar URL (opcional)"
                    value={create.avatarUrl}
                    onChange={(v) => setCreate((p) => ({ ...p, avatarUrl: v }))}
                    placeholder="https://..."
                    span2
                  />
                  <div>
                    <label className="text-[11px] text-zinc-600">Rol</label>
                    <select
                      value={create.roleId}
                      onChange={(e) => setCreate((p) => ({ ...p, roleId: e.target.value }))}
                      disabled={loadingRoles}
                      className={cn(
                        "mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-[13px] text-zinc-800 outline-none",
                        "focus:border-[rgba(33,184,166,.45)] focus:bg-white focus:ring-4 focus:ring-[rgba(33,184,166,.10)]"
                      )}
                    >
                      <option value="">{loadingRoles ? "Cargando roles..." : "Selecciona un rol"}</option>
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {ROLE_LABELS[r.description]}
                        </option>
                      ))}
                    </select>
                    {createErr.roleId && <div className="mt-1 text-[11px] text-red-600">{createErr.roleId}</div>}
                  </div>

                  <div className="flex items-end gap-2">
                    <button
                      type="button"
                      onClick={() => setModalOpen(false)}
                      className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-[13px] text-zinc-700 hover:bg-zinc-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={creating}
                      className={cn(
                        "w-full rounded-xl px-4 py-2.5 text-[13px] font-medium text-white transition",
                        creating ? "cursor-not-allowed opacity-70" : "active:scale-[.99]"
                      )}
                      style={{ background: PRIMARY, boxShadow: "0 10px 26px rgba(33,184,166,.16)" }}
                    >
                      {creating ? "Creandoâ€¦" : "Crear"}
                    </button>
                  </div>
                </div>

                {!!createGeneralErr.length && (
                  <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
                    {createGeneralErr.join(" · ")}
                  </div>
                )}

                <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-[11px] text-zinc-600">
                  RecomendaciÃ³n: email Ãºnico y contraseÃ±a hasheada en servidor.
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  error,
  span2,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  error?: string;
  span2?: boolean;
}) {
  return (
    <div className={span2 ? "sm:col-span-2" : ""}>
      <label className="text-[11px] text-zinc-600">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "mt-1 w-full rounded-xl border px-3 py-2.5 text-[13px] text-zinc-800 outline-none",
          error ? "border-red-300 bg-red-50" : "border-zinc-200 bg-zinc-50",
          "focus:border-[rgba(33,184,166,.45)] focus:bg-white focus:ring-4 focus:ring-[rgba(33,184,166,.10)]"
        )}
      />
      {error && <div className="mt-1 text-[11px] text-red-600">{error}</div>}
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-0.5 text-[15px] font-semibold leading-none text-zinc-900 2xl:text-[16px]">{value}</div>
    </div>
  );
}



