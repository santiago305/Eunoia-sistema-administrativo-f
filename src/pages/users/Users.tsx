import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PageTitle } from "@/components/PageTitle";
import {
  countUsersByRole,
  listUsers,
  updateUser,
  type CountUsersByRoleResponse,
  type ListUsersResponse,
  type UserApiListItem,
} from "@/services/userService";
import { findAllRoles } from "@/services/roleService";
import { UsersHeader } from "./components/UsersHeader";
import { UsersLeftPanel } from "./components/UsersLeftPanel";
import { UsersRightPanel } from "./components/UsersRightPanel";
import { UserForm } from "./components/formUser";
import { RoleType } from "./types/roles.types";
import type { Role, RoleOption, User, UserListStatus } from "./types/users.types";

const ROLES = Object.values(RoleType) as Role[];

// ---------- Utils ----------
const cn = (...s: Array<string | false | null | undefined>) => s.filter(Boolean).join(" ");
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

export default function Users() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [usersError, setUsersError] = useState("");
  const [status, setStatus] = useState<UserListStatus>("all");

  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pick<ListUsersResponse, "total" | "page" | "pageSize" | "totalPages" | "hasPrev" | "hasNext">>({
    total: 0,
    page: 1,
    pageSize: 0,
    totalPages: 1,
    hasPrev: false,
    hasNext: false,
  });
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
        });
        const normalized = Array.isArray(data?.items) ? data.items.map(normalizeUser) : [];
        if (!cancelled) {
          setUsers(normalized);
          setPagination({
            total: data?.total ?? 0,
            page: data?.page ?? page,
            pageSize: data?.pageSize ?? 0,
            totalPages: data?.totalPages ?? 1,
            hasPrev: Boolean(data?.hasPrev),
            hasNext: Boolean(data?.hasNext),
          });
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
          setPagination((prev) => ({ ...prev, hasPrev: false, hasNext: false }));
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
        const list = Array.isArray(response) ? response : [];
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

  useEffect(() => setPage(1), [query, status]);

  const safePage = Math.max(1, pagination.page || page);

  const counts = useMemo(() => {
    const byRole = {} as Record<Role, number>;
    for (const u of users) byRole[u.role] = (byRole[u.role] ?? 0) + 1;
    return byRole;
  }, [users]);

  useEffect(() => {
    let cancelled = false;
    const loadCountsByRole = async () => {
      try {
        const data = await countUsersByRole({ status: "all" });
        if (!cancelled) setCountsByRole(data);
      } catch {
        if (!cancelled) setCountsByRole(null);
      }
    };
    void loadCountsByRole();
    return () => {
      cancelled = true;
    };
  }, []);

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
        "h-[calc(100vh-var(--dashTop,0px))]",
        "flex flex-col",
        "py-4 sm:py-6 2xl:py-8 3xl:py-10 4xl:py-12"
      )}
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

        <div className={cn("mt-4 grid min-h-0 flex-1 gap-3", "lg:grid-cols-[420px_1fr]", "2xl:gap-4 3xl:gap-5")}>
          <UsersLeftPanel
            query={query}
            setQuery={setQuery}
            safePage={safePage}
            setPage={setPage}
            hasPrevPage={pagination.hasPrev}
            hasNextPage={pagination.hasNext}
            totalPages={Math.max(1, pagination.totalPages)}
            total={pagination.total}
            loading={loading}
            users={users}
            selectedId={selectedId}
            setSelectedId={setSelectedId}
            usersError={usersError}
            status={status}
            setStatus={setStatus}
          />
          <UsersRightPanel
            selected={selected}
            roleDraft={roleDraft}
            setRoleDraft={setRoleDraft}
            savingRole={savingRole}
            saveRole={saveRole}
          />
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








