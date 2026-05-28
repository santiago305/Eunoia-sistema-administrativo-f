import {
  ChevronLeft,
  ChevronRight,
  Database,
  KeyRound,
  Minus,
  Plus,
  Power,
  RotateCcw,
  Search,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import { Modal } from "@/shared/components/modales/Modal";
import { useFeedbackToast } from "@/shared/hooks/useFeedbackToast";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { errorResponse, successResponse } from "@/shared/common/utils/response";
import {
  countUsersByRole,
  deleteUser as deleteUserById,
  getUserMailStorageSummary,
  listUsers,
  restoreUser as restoreUserById,
  updateUserMailStorageQuota,
  updateUserManagementScope,
  updateUserRole,
  type CountUsersByRoleResponse,
  type ListUsersResponse,
  type UserApiListItem,
} from "@/shared/services/userService";
import {
  getEffectivePermissionsDetailByUser,
  listAccessPermissions,
  removeUserPermissionOverride,
  setUserPermissionOverride,
  type AccessPermissionItem,
  type PermissionEffect,
  type UserPermissionOverride,
} from "@/shared/services/accessControlService";
import { findAllRoles } from "@/shared/services/roleService";
import { UserForm } from "./components/formUser";
import { UserPermissionsModal } from "./components/UserPermissionsModal";
import { ROLE_LABELS } from "./types/roles.types";
import type { Role, RoleOption, User, UserListStatus } from "./types/users.types";
import { usePermissions } from "@/shared/hooks/usePermissions";
import { useAuth } from "@/shared/hooks/useAuth";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { PageShell } from "@/shared/layouts/PageShell";
import { formatDateTimeLabel } from "./utils/dateFormat";

const cn = (...s: Array<string | false | null | undefined>) => s.filter(Boolean).join(" ");
const MASTER_ROLE_DESCRIPTION = "super_administrator";

const normalizeUser = (u: UserApiListItem): User => {
  const raw = u as UserApiListItem & {
    created_at?: string | null;
    updated_at?: string | null;
    updateAt?: string | null;
  };

  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: String(u.telefono ?? ""),
    role: u.rol ?? "sin_rol",
    deleted: Boolean(u.deleted),
    deletedAt: u.deletedAt ?? null,
    createdAt: raw.createdAt ?? raw.created_at ?? "",
    updatedAt: raw.updatedAt ?? raw.updated_at ?? raw.updateAt ?? null,
    createdByUserId: (u as UserApiListItem & { createdByUserId?: string | null }).createdByUserId ?? null,
    createdByUserName: (u as UserApiListItem & { createdByUserName?: string | null }).createdByUserName ?? null,
    manageableRoleDescriptions:
      (u as UserApiListItem & { manageableRoleDescriptions?: string[] | null }).manageableRoleDescriptions ?? null,
    manageableUserIds: (u as UserApiListItem & { manageableUserIds?: string[] | null }).manageableUserIds ?? null,
  };
};

const readError = (error: unknown) => {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { status?: number; data?: { message?: string | string[] } } }).response;
    const message = response?.data?.message;
    const normalizedMessage = Array.isArray(message) ? message.join(" | ") : String(message ?? "");
    return { status: response?.status ?? 0, message: normalizedMessage };
  }

  return { status: 0, message: "" };
};

function getRoleLabel(role: string | null | undefined) {
  const normalized = String(role ?? "").trim().toLowerCase();
  if (!normalized || normalized === "sin_rol") return "Sin rol";
  return (
    ROLE_LABELS[normalized as Role] ??
    normalized
      .replace(/[._-]+/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase())
  );
}

function getInitials(name?: string | null) {
  const parts = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  return parts.map((part) => part[0]?.toUpperCase()).join("") || "US";
}

function roleTone(role: User["role"]) {
  const map: Record<User["role"], string> = {
    super_administrator: "bg-rose-50 text-rose-700 ring-rose-100",
    admin: "bg-primary/10 text-primary ring-primary/20",
    moderator: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    adviser: "bg-indigo-50 text-indigo-700 ring-indigo-100",
    purchasing_manager: "bg-amber-50 text-amber-700 ring-amber-100",
    sin_rol: "bg-zinc-100 text-zinc-700 ring-zinc-200",
  };

  return map[role] ?? "bg-zinc-50 text-zinc-700 ring-zinc-100";
}

export default function Users() {
  const { showFeedback, clearFeedback } = useFeedbackToast();
  const { can } = usePermissions();
  const { isSuperAdmin } = useAuth();

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [usersError, setUsersError] = useState("");
  const [status, setStatus] = useState<UserListStatus>("active");

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 250);
  const [page, setPage] = useState(1);
  const [reloadTick, setReloadTick] = useState(0);
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

  const [roleDraft, setRoleDraft] = useState<Role>("");
  const [savingRole, setSavingRole] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [effectivePermissions, setEffectivePermissions] = useState<string[]>([]);
  const [permissionOverrides, setPermissionOverrides] = useState<UserPermissionOverride[]>([]);
  const [allPermissions, setAllPermissions] = useState<AccessPermissionItem[]>([]);
  const [savingOverride, setSavingOverride] = useState(false);
  const [mailStorageQuotaGbDraft, setMailStorageQuotaGbDraft] = useState(1);
  const [savingMailStorageQuota, setSavingMailStorageQuota] = useState(false);
  const [mailStorageUsedPercent, setMailStorageUsedPercent] = useState(0);
  const [mailStorageUsedLabel, setMailStorageUsedLabel] = useState("");
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [managementRoleScopeDraft, setManagementRoleScopeDraft] = useState<string[]>([]);
  const [managementUserScopeDraft, setManagementUserScopeDraft] = useState<string[]>([]);
  const [savingManagementScope, setSavingManagementScope] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setUsersError("");

      try {
        const data = await listUsers({
          status,
          page,
          q: debouncedQuery.trim() || undefined,
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
          setSelectedId((prev) => (prev && normalized.some((u) => u.id === prev) ? prev : null));
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
  }, [debouncedQuery, page, status, reloadTick]);

  useEffect(() => {
    let cancelled = false;

    const loadRoles = async () => {
      try {
        const [response, permissionsResponse] = await Promise.all([
          findAllRoles(),
          listAccessPermissions().catch(() => []),
        ]);
        const list = Array.isArray(response) ? response : [];
        const normalized = (Array.isArray(list) ? list : [])
          .map((r: { id?: unknown; description?: unknown }) => ({
            id: String(r.id ?? ""),
            description: String(r.description ?? "").toLowerCase() as Role,
          }))
          .filter((r: RoleOption) => !!r.id && !!r.description);

        if (!cancelled) {
          setRoles(normalized);
          setAllPermissions(Array.isArray(permissionsResponse) ? permissionsResponse : []);
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
    if (selected) setRoleDraft(selected.role === "sin_rol" ? "" : selected.role);
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setManagementRoleScopeDraft(Array.isArray(selected?.manageableRoleDescriptions) ? selected.manageableRoleDescriptions : []);
    setManagementUserScopeDraft(Array.isArray(selected?.manageableUserIds) ? selected.manageableUserIds : []);
  }, [selected?.id, selected?.manageableRoleDescriptions, selected?.manageableUserIds]);

  useEffect(() => {
    let cancelled = false;

    const loadStorage = async () => {
      if (!selected?.id) {
        setMailStorageQuotaGbDraft(1);
        setMailStorageUsedPercent(0);
        setMailStorageUsedLabel("");
        return;
      }
      try {
        const data = await getUserMailStorageSummary(selected.id);
        if (cancelled) return;
        setMailStorageQuotaGbDraft(Number(data?.quotaGb ?? 1));
        setMailStorageUsedPercent(Number(data?.usedPercent ?? 0));
        const usedMb = Number(data?.usedBytes ?? 0) / (1024 * 1024);
        const quotaMb = Number(data?.quotaBytes ?? 0) / (1024 * 1024);
        setMailStorageUsedLabel(`${usedMb.toFixed(1)} MB de ${quotaMb.toFixed(1)} MB`);
      } catch {
        if (cancelled) return;
      }
    };

    void loadStorage();
    return () => {
      cancelled = true;
    };
  }, [selected?.id]);

  useEffect(() => {
    let cancelled = false;
    const loadEffectivePermissions = async () => {
      if (!selected?.id) {
        setEffectivePermissions([]);
        return;
      }
      try {
        const data = await getEffectivePermissionsDetailByUser(selected.id);
        if (!cancelled) {
          setEffectivePermissions(Array.isArray(data?.permissions) ? data.permissions : []);
          setPermissionOverrides(Array.isArray(data?.overrides) ? data.overrides : []);
        }
      } catch {
        if (!cancelled) {
          setEffectivePermissions([]);
          setPermissionOverrides([]);
        }
      }
    };

    void loadEffectivePermissions();
    return () => {
      cancelled = true;
    };
  }, [selected?.id]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, status]);

  const safePage = Math.max(1, pagination.page || page);

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
  }, [reloadTick]);

  const handleQueryChange = useCallback((value: string) => {
    startTransition(() => {
      setQuery(value);
    });
  }, []);

  const handleStatusChange = useCallback((nextStatus: UserListStatus) => {
    startTransition(() => {
      setStatus(nextStatus);
    });
  }, []);

  const handleSelectUser = useCallback((id: string) => {
    startTransition(() => {
      setSelectedId(id);
    });
  }, []);

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

  const selectedIsDeleted = Boolean(selected?.deleted || selected?.deletedAt);
  const allowedOverrides = useMemo(
    () => permissionOverrides.filter((item) => item.effect === "ALLOW").length,
    [permissionOverrides],
  );
  const deniedOverrides = useMemo(
    () => permissionOverrides.filter((item) => item.effect === "DENY").length,
    [permissionOverrides],
  );

  const storagePercent = Math.max(0, Math.min(100, Math.round(mailStorageUsedPercent ?? 0)));
  const totalUsers = countsByRole?.total ?? pagination.total;
  const managementRoleOptions = useMemo(
    () =>
      roles.map((role) => ({
        value: role.description,
        label: getRoleLabel(role.description),
      })).filter((role) => role.value !== MASTER_ROLE_DESCRIPTION),
    [roles],
  );
  const managementUserOptions = useMemo(
    () =>
      users
        .filter((user) => user.id !== selected?.id)
        .map((user) => ({
          value: user.id,
          label: `${user.name} (${user.email})`,
        })),
    [selected?.id, users],
  );

  const changeQuota = (direction: 1 | -1) => {
    const next = Math.max(1, Math.min(5, Number(mailStorageQuotaGbDraft) + direction));
    setMailStorageQuotaGbDraft(next);
  };

  async function saveRole() {
    if (!selected) return;
    if (!roleDraft) return;
    if (roleDraft === selected.role) return;
    clearFeedback();
    setSavingRole(true);

    try {
      const roleId = roles.find((r) => r.description === roleDraft)?.id;
      if (!roleId) {
        showFeedback(errorResponse("No se pudo resolver el rol seleccionado."));
        return;
      }

      const res = await updateUserRole(selected.id, { roleId });
      const nowIso = new Date().toISOString();
      setUsers((p) => p.map((u) => (u.id === selected.id ? { ...u, role: roleDraft, updatedAt: nowIso } : u)));
      showFeedback(successResponse((res as { message?: string })?.message || "Rol actualizado"));
    } catch (error: unknown) {
      const parsed = readError(error);
      showFeedback(errorResponse(parsed.message.trim() || "No se pudo actualizar el rol."));
    } finally {
      setSavingRole(false);
    }
  }

  async function deactivateUser() {
    if (!selected) return;
    clearFeedback();
    setTogglingStatus(true);

    try {
      const res = await deleteUserById(selected.id);
      const nowIso = new Date().toISOString();
      setUsers((prev) =>
        prev.map((u) => (u.id === selected.id ? { ...u, deleted: true, deletedAt: u.deletedAt ?? nowIso, updatedAt: nowIso } : u)),
      );
      showFeedback(successResponse((res as { message?: string })?.message || "Usuario desactivado"));
    } catch (error: unknown) {
      const parsed = readError(error);
      showFeedback(errorResponse(parsed.message.trim() || "No se pudo desactivar el usuario."));
    } finally {
      setTogglingStatus(false);
    }
  }

  async function restoreUser() {
    if (!selected) return;
    clearFeedback();
    setTogglingStatus(true);

    try {
      const res = await restoreUserById(selected.id);
      const nowIso = new Date().toISOString();
      setUsers((prev) => prev.map((u) => (u.id === selected.id ? { ...u, deleted: false, deletedAt: null, updatedAt: nowIso } : u)));
      showFeedback(successResponse((res as { message?: string })?.message || "Usuario restablecido"));
    } catch (error: unknown) {
      const parsed = readError(error);
      showFeedback(errorResponse(parsed.message.trim() || "No se pudo restablecer el usuario."));
    } finally {
      setTogglingStatus(false);
    }
  }

  async function savePermissionOverride(permissionCode: string, effect: PermissionEffect, reason?: string) {
    if (!selected?.id) return;
    clearFeedback();
    setSavingOverride(true);
    try {
      await setUserPermissionOverride({
        userId: selected.id,
        permissionCode,
        effect,
        reason,
      });
      const data = await getEffectivePermissionsDetailByUser(selected.id);
      setEffectivePermissions(Array.isArray(data?.permissions) ? data.permissions : []);
      setPermissionOverrides(Array.isArray(data?.overrides) ? data.overrides : []);
      showFeedback(successResponse("Permiso delegado correctamente."));
    } catch (error: unknown) {
      const parsed = readError(error);
      showFeedback(errorResponse(parsed.message.trim() || "No se pudo delegar el permiso."));
    } finally {
      setSavingOverride(false);
    }
  }

  async function deletePermissionOverride(permissionCode: string) {
    if (!selected?.id) return;
    clearFeedback();
    setSavingOverride(true);
    try {
      await removeUserPermissionOverride(selected.id, permissionCode);
      const data = await getEffectivePermissionsDetailByUser(selected.id);
      setEffectivePermissions(Array.isArray(data?.permissions) ? data.permissions : []);
      setPermissionOverrides(Array.isArray(data?.overrides) ? data.overrides : []);
      showFeedback(successResponse("Override eliminado correctamente."));
    } catch (error: unknown) {
      const parsed = readError(error);
      showFeedback(errorResponse(parsed.message.trim() || "No se pudo eliminar el override."));
    } finally {
      setSavingOverride(false);
    }
  }

  async function saveMailStorageQuota() {
    if (!selected?.id) return;
    clearFeedback();
    setSavingMailStorageQuota(true);
    try {
      const quotaGb = Math.max(1, Math.min(5, Math.trunc(Number(mailStorageQuotaGbDraft || 1))));
      const data = await updateUserMailStorageQuota(selected.id, quotaGb);
      setMailStorageQuotaGbDraft(Number(data?.quotaGb ?? quotaGb));
      setMailStorageUsedPercent(Number(data?.usedPercent ?? 0));
      const usedMb = Number(data?.usedBytes ?? 0) / (1024 * 1024);
      const quotaMb = Number(data?.quotaBytes ?? 0) / (1024 * 1024);
      setMailStorageUsedLabel(`${usedMb.toFixed(1)} MB de ${quotaMb.toFixed(1)} MB`);
      showFeedback(successResponse("Cuota de almacenamiento actualizada."));
    } catch (error: unknown) {
      const parsed = readError(error);
      showFeedback(errorResponse(parsed.message.trim() || "No se pudo actualizar la cuota de almacenamiento."));
    } finally {
      setSavingMailStorageQuota(false);
    }
  }

  async function saveManagementScope() {
    if (!selected?.id) return;
    clearFeedback();
    setSavingManagementScope(true);
    try {
      await updateUserManagementScope(selected.id, {
        manageableRoleDescriptions: managementRoleScopeDraft,
        manageableUserIds: managementUserScopeDraft,
      });
      setUsers((prev) =>
        prev.map((user) =>
          user.id === selected.id
            ? {
                ...user,
                manageableRoleDescriptions: managementRoleScopeDraft,
                manageableUserIds: managementUserScopeDraft,
              }
            : user,
        ),
      );
      showFeedback(successResponse("Alcance de gestión actualizado."));
    } catch (error: unknown) {
      const parsed = readError(error);
      showFeedback(errorResponse(parsed.message.trim() || "No se pudo actualizar el alcance de gestión."));
    } finally {
      setSavingManagementScope(false);
    }
  }

  return (
    <PageShell>
      <div className="flex h-full min-h-0 w-full flex-1 flex-col">
        <div className="w-full border-b border-zinc-100 pb-3">
          <div className="flex w-full flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                <span className="uppercase tracking-[0.16em]">Cuentas</span>
                <span className="text-zinc-300">/</span>
                <span>{totalUsers} usuarios</span>
              </div>
              <p className="mt-1 text-xl font-semibold tracking-tight text-zinc-950 sm:text-2xl">Usuarios</p>
            </div>

            <div className="grid w-full gap-2 sm:grid-cols-[minmax(0,1fr)_auto] xl:max-w-[720px]">
              <div className="relative min-w-0">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  id="users-search"
                  value={query}
                  onChange={(event) => handleQueryChange(event.target.value)}
                  placeholder="Buscar usuario, correo o telefono..."
                  className="h-10 w-full rounded-sm border-0 bg-zinc-50 pl-9 pr-3 text-sm text-zinc-800 outline-none ring-1 ring-zinc-100 transition focus:bg-white focus:ring-2 focus:ring-primary/25"
                />
              </div>

              {can("users.create") ? (
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-sm bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:brightness-110 active:scale-[0.99]"
                >
                  <UserPlus className="h-4 w-4" />
                  Nuevo usuario
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-3 flex w-full flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="grid w-full grid-cols-2 gap-1 rounded-sm bg-zinc-50 p-1 sm:w-[260px]">
              {([
                { key: "active", label: "Activos" },
                { key: "inactive", label: "Eliminados" },
              ] as const).map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => handleStatusChange(option.key)}
                  className={cn(
                    "h-8 rounded-sm px-2 text-xs font-medium transition",
                    status === option.key ? "bg-white text-zinc-950 shadow-sm ring-1 ring-zinc-100" : "text-zinc-500 hover:text-zinc-800",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between gap-2 text-xs text-zinc-500 sm:justify-end">
              <span>
                Pagina <span className="font-medium text-zinc-800">{safePage}</span> de{" "}
                <span className="font-medium text-zinc-800">{Math.max(1, pagination.totalPages)}</span>
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={!pagination.hasPrev}
                  className="grid h-8 w-8 place-items-center rounded-sm text-zinc-600 ring-1 ring-zinc-100 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:text-zinc-300"
                  aria-label="Pagina anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPage((current) => current + 1)}
                  disabled={!pagination.hasNext}
                  className="grid h-8 w-8 place-items-center rounded-sm text-zinc-600 ring-1 ring-zinc-100 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:text-zinc-300"
                  aria-label="Pagina siguiente"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid min-h-0 w-full flex-1 grid-cols-1 gap-0 lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[380px_minmax(0,1fr)]">
          <aside className="min-h-[320px] w-full border-b border-zinc-100 lg:min-h-0 lg:border-b-0 lg:border-r">
            <div className="flex h-full min-h-0 flex-col">
              <div className="flex items-center justify-between gap-3 border-b border-zinc-100 py-3 pr-0 lg:pr-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-zinc-950">Lista de usuarios</p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {loading ? "Cargando..." : `${pagination.total} resultados`}
                  </p>
                </div>
                <span className="text-xs text-zinc-400">/ para buscar</span>
              </div>

              <div className="min-h-0 flex-1 overflow-auto pr-0 lg:pr-4">
                {users.length ? (
                  <div className="divide-y divide-zinc-100">
                    {users.map((user) => {
                      const isActive = user.id === selectedId;
                      const isDeleted = Boolean(user.deleted || user.deletedAt);

                      return (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => handleSelectUser(user.id)}
                          className={cn(
                            "group relative flex w-full items-start gap-3 py-3 text-left transition",
                            isActive ? "pl-3 pr-2" : "px-0 hover:px-2",
                          )}
                        >
                          {isActive ? <span className="absolute left-0 top-3 h-[calc(100%-1.5rem)] w-1 rounded-sm bg-primary" /> : null}

                          <span
                            className={cn(
                              "grid h-9 w-9 shrink-0 place-items-center rounded-sm text-xs font-semibold ring-1 transition",
                              isActive ? "bg-primary/10 text-primary ring-primary/20" : "bg-zinc-50 text-zinc-500 ring-zinc-100 group-hover:bg-white",
                            )}
                          >
                            {getInitials(user.name)}
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className="flex min-w-0 items-start justify-between gap-2">
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-medium text-zinc-900">{user.name}</span>
                                <span className="mt-0.5 block truncate text-xs text-zinc-500">{user.email}</span>
                              </span>
                              <span className={cn("shrink-0 rounded-sm px-2 py-0.5 text-[11px] font-medium ring-1", roleTone(user.role))}>
                                {getRoleLabel(user.role)}
                              </span>
                            </span>

                            <span className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-zinc-400">
                              <span>{user.phone || "Sin telefono"}</span>
                              {isDeleted ? <span className="text-red-500">Desactivado</span> : <span className="text-emerald-600">Activo</span>}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex h-full min-h-[360px] w-full items-center justify-center px-4 text-center">
                    <div className="max-w-sm">
                      <div className="mx-auto grid h-12 w-12 place-items-center rounded-sm bg-zinc-50 ring-1 ring-zinc-100">
                        <ShieldCheck className="h-5 w-5 text-zinc-400" />
                      </div>
                      <p className="mt-4 text-sm font-semibold text-zinc-900">No hay usuarios para mostrar</p>
                      <p className="mt-1 text-sm leading-6 text-zinc-500">
                        {usersError || "Cambia el filtro, limpia la busqueda o crea un nuevo usuario."}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </aside>

          <main className="min-h-[520px] min-w-0 w-full overflow-auto lg:min-h-0 lg:pl-5">
            {selected ? (
              <div className="flex min-h-full w-full flex-col">
                <div className="flex w-full flex-col gap-4 border-b border-zinc-100 py-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-sm bg-gradient-to-br from-primary/15 via-primary/5 to-transparent text-base font-semibold text-primary ring-1 ring-primary/15">
                      {getInitials(selected.name)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "rounded-sm px-2 py-0.5 text-[11px] font-medium ring-1",
                            selectedIsDeleted ? "bg-red-50 text-red-700 ring-red-100" : "bg-emerald-50 text-emerald-700 ring-emerald-100",
                          )}
                        >
                          {selectedIsDeleted ? "Desactivado" : "Activo"}
                        </span>
                        <span className={cn("rounded-sm px-2 py-0.5 text-[11px] font-medium ring-1", roleTone(selected.role))}>
                          {getRoleLabel(selected.role)}
                        </span>
                      </div>
                      <h2 className="mt-2 truncate text-xl font-semibold tracking-tight text-zinc-950 sm:text-2xl">{selected.name}</h2>
                      <p className="mt-1 truncate text-sm text-zinc-500">{selected.email}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <SystemButton variant="secondary" leftIcon={<KeyRound className="h-4 w-4" />} onClick={() => setPermissionsOpen(true)}>
                      Permisos
                    </SystemButton>

                    {!selectedIsDeleted && can("users.delete") ? (
                      <SystemButton
                        variant="danger"
                        loading={togglingStatus}
                        leftIcon={<Power className="h-4 w-4" />}
                        onClick={() => void deactivateUser()}
                      >
                        Desactivar
                      </SystemButton>
                    ) : null}

                    {selectedIsDeleted && can("users.restore") ? (
                      <SystemButton
                        variant="success"
                        loading={togglingStatus}
                        leftIcon={<RotateCcw className="h-4 w-4" />}
                        onClick={() => void restoreUser()}
                      >
                        Activar
                      </SystemButton>
                    ) : null}
                  </div>
                </div>

                <div className="grid w-full gap-5 py-5 xl:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="min-w-0">
                    <div className="grid divide-y divide-zinc-100 border-y border-zinc-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                      {[
                        { label: "Telefono", value: selected.phone || "-" },
                        { label: "Creado", value: formatDateTimeLabel(selected.createdAt) },
                        { label: "Actualizado", value: formatDateTimeLabel(selected.updatedAt) },
                      ].map((item) => (
                        <div key={item.label} className="min-w-0 px-0 py-3 sm:px-4 first:sm:pl-0">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-400">{item.label}</p>
                          <p className="mt-1 truncate text-sm font-medium text-zinc-800">{item.value}</p>
                        </div>
                      ))}
                    </div>

                    {isSuperAdmin ? (
                      <div className="border-b border-zinc-100 py-4">
                        <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-400">Creado por</p>
                        <p className="mt-1 truncate text-sm font-medium text-zinc-800">
                          {selected.createdByUserName?.trim() || selected.createdByUserId || "No registrado"}
                        </p>
                      </div>
                    ) : null}

                    {can("users.assign_roles") && selected.role !== MASTER_ROLE_DESCRIPTION ? (
                      <section className="border-b border-zinc-100 py-5">
                        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px] lg:items-end">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-zinc-950">Rol del usuario</p>
                            <p className="mt-1 text-sm leading-6 text-zinc-500">
                              Cambia el rol base sin modificar permisos individuales ya delegados.
                            </p>
                            <FloatingSelect
                              label="Rol operativo"
                              name="users-role-draft"
                              value={roleDraft}
                              options={roles
                                .map((role) => ({ value: role.description, label: getRoleLabel(role.description) }))
                                .filter((role) => role.value !== MASTER_ROLE_DESCRIPTION)}
                              onChange={(value) => setRoleDraft(value as Role)}
                              className="mt-3 h-10 rounded-sm text-sm"
                            />
                          </div>

                          <SystemButton variant="secondary" loading={savingRole} disabled={roleDraft === selected.role} onClick={() => void saveRole()}>
                            Guardar rol
                          </SystemButton>
                        </div>
                      </section>
                    ) : null}

                    <section className="border-b border-zinc-100 py-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-zinc-950">Permisos directos</p>
                          <p className="mt-1 text-sm leading-6 text-zinc-500">
                            {effectivePermissions.length} efectivos · {allowedOverrides} extras · {deniedOverrides} denegados
                          </p>
                        </div>
                        <SystemButton variant="outline" onClick={() => setPermissionsOpen(true)}>
                          Administrar
                        </SystemButton>
                      </div>

                      <div className="mt-4 grid gap-2 sm:grid-cols-3">
                        {[
                          { label: "Efectivos", value: effectivePermissions.length, tone: "from-primary/30" },
                          { label: "Permitidos", value: allowedOverrides, tone: "from-emerald-300/40" },
                          { label: "Denegados", value: deniedOverrides, tone: "from-red-300/40" },
                        ].map((item) => (
                          <div key={item.label} className="relative overflow-hidden rounded-sm border border-zinc-100 px-3 py-3">
                            <span className={cn("absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r to-transparent", item.tone)} />
                            <p className="text-xs text-zinc-500">{item.label}</p>
                            <p className="mt-1 text-xl font-semibold text-zinc-950">{item.value}</p>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>

                  <aside className="min-w-0 border-t border-zinc-100 pt-5 xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-primary" />
                      <p className="text-sm font-semibold text-zinc-950">Almacenamiento</p>
                    </div>

                    <div className="mt-4 flex items-end justify-between gap-3">
                      <div>
                        <p className="text-3xl font-semibold leading-none text-zinc-950">{mailStorageQuotaGbDraft} GB</p>
                        <p className="mt-2 text-xs text-zinc-500">Cuota asignada</p>
                      </div>
                      <span className="text-sm font-medium text-zinc-700">{storagePercent}%</span>
                    </div>

                    <div className="mt-4 h-2 overflow-hidden rounded-sm bg-zinc-100">
                      <div
                        className="h-full rounded-sm bg-gradient-to-r from-primary/70 via-primary/50 to-primary/20 transition-all"
                        style={{ width: `${storagePercent}%` }}
                      />
                    </div>

                    <p className="mt-2 text-xs text-zinc-500">{mailStorageUsedLabel || "Sin uso registrado"}</p>

                    {can("users.update") && isSuperAdmin ? (
                      <div className="mt-5">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => changeQuota(-1)}
                            disabled={savingMailStorageQuota || mailStorageQuotaGbDraft <= 1}
                            className="grid h-9 w-9 place-items-center rounded-sm text-zinc-700 ring-1 ring-zinc-100 transition hover:bg-zinc-50 disabled:opacity-35"
                            title="Bajar almacenamiento"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <input
                            type="range"
                            min={1}
                            max={5}
                            step={1}
                            value={mailStorageQuotaGbDraft}
                            onChange={(event) => setMailStorageQuotaGbDraft(Number(event.target.value))}
                            className="h-2 flex-1 accent-primary"
                            aria-label="Cuota de almacenamiento"
                          />
                          <button
                            type="button"
                            onClick={() => changeQuota(1)}
                            disabled={savingMailStorageQuota || mailStorageQuotaGbDraft >= 5}
                            className="grid h-9 w-9 place-items-center rounded-sm text-zinc-700 ring-1 ring-zinc-100 transition hover:bg-zinc-50 disabled:opacity-35"
                            title="Subir almacenamiento"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                        <SystemButton className="mt-4" fullWidth variant="primary" loading={savingMailStorageQuota} onClick={() => void saveMailStorageQuota()}>
                          Guardar cuota
                        </SystemButton>
                      </div>
                    ) : null}
                  </aside>
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-[520px] w-full items-center justify-center px-4 text-center">
                <div className="max-w-sm">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-sm bg-zinc-50 ring-1 ring-zinc-100">
                    <ShieldCheck className="h-6 w-6 text-zinc-400" />
                  </div>
                  <p className="mt-4 text-sm font-semibold text-zinc-950">Selecciona un usuario</p>
                  <p className="mt-1 text-sm leading-6 text-zinc-500">
                    El panel de detalle ocupa todo el ancho disponible aunque no exista informacion seleccionada.
                  </p>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      <UserPermissionsModal
        open={permissionsOpen}
        onClose={() => setPermissionsOpen(false)}
        selected={selected}
        allPermissions={allPermissions}
        effectivePermissions={effectivePermissions}
        permissionOverrides={permissionOverrides}
        savingOverride={savingOverride}
        savePermissionOverride={savePermissionOverride}
        deletePermissionOverride={deletePermissionOverride}
        canManageOverrides={can("users.assign_permissions") || can("users.deny_permissions")}
        canManageScope={isSuperAdmin && can("users.assign_permissions")}
        managementRoleOptions={managementRoleOptions}
        managementUserOptions={managementUserOptions}
        managementRoleValues={managementRoleScopeDraft}
        managementUserValues={managementUserScopeDraft}
        savingManagementScope={savingManagementScope}
        onChangeManagementRoles={setManagementRoleScopeDraft}
        onChangeManagementUsers={setManagementUserScopeDraft}
        onSaveManagementScope={saveManagementScope}
      />

      <Modal
        open={modalOpen && can("users.create")}
        onClose={() => setModalOpen(false)}
        title="Crear usuario"
        className="w-[min(760px,calc(100vw-2rem))] rounded-sm border border-zinc-100"
        headerClassName="border-b-0 bg-white px-5 pt-5 pb-2"
        bodyClassName="px-5 pb-5 pt-2"
        overlayBlur
      >
        <UserForm closeModal={() => setModalOpen(false)} onCreated={() => setReloadTick((prev) => prev + 1)} />
      </Modal>
    </PageShell>
  );
}
