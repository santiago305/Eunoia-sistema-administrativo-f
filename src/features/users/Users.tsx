import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import { PageTitle } from "@/shared/components/components/PageTitle";
import { Modal } from "@/shared/components/modales/Modal";
import { useFlashMessage } from "@/shared/hooks/useFlashMessage";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { errorResponse, successResponse } from "@/shared/common/utils/response";
import {
  countUsersByRole,
  deleteUser as deleteUserById,
  listUsers,
  restoreUser as restoreUserById,
  updateUserRole,
  type CountUsersByRoleResponse,
  type ListUsersResponse,
  type UserApiListItem,
} from "@/shared/services/userService";
import {
  getEffectivePermissionsDetailByUser,
  removeUserPermissionOverride,
  setUserPreferredHomePath,
  setUserPermissionOverride,
  type PermissionEffect,
  type UserPermissionOverride,
} from "@/shared/services/accessControlService";
import { findAllRoles } from "@/shared/services/roleService";
import { UsersHeader } from "./components/UsersHeader";
import { UsersLeftPanel } from "./components/UsersLeftPanel";
import { UsersRightPanel } from "./components/UsersRightPanel";
import { UserForm } from "./components/formUser";
import { RoleType } from "./types/roles.types";
import type { Role, RoleOption, User, UserListStatus } from "./types/users.types";

const ROLES = Object.values(RoleType) as Role[];

const cn = (...s: Array<string | false | null | undefined>) => s.filter(Boolean).join(" ");

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
    role: u.rol,
    deleted: Boolean(u.deleted),
    deletedAt: u.deletedAt ?? null,
    createdAt: raw.createdAt ?? raw.created_at ?? "",
    updatedAt: raw.updatedAt ?? raw.updated_at ?? raw.updateAt ?? null,
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

export default function Users() {
  const { showFlash, clearFlash } = useFlashMessage();

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

  const [roleDraft, setRoleDraft] = useState<Role>("adviser");
  const [savingRole, setSavingRole] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [effectivePermissions, setEffectivePermissions] = useState<string[]>([]);
  const [permissionOverrides, setPermissionOverrides] = useState<UserPermissionOverride[]>([]);
  const [savingOverride, setSavingOverride] = useState(false);
  const [preferredHomePathDraft, setPreferredHomePathDraft] = useState("");
  const [savingPreferredHomePath, setSavingPreferredHomePath] = useState(false);

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
  }, [debouncedQuery, page, status, reloadTick]);

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
          setPreferredHomePathDraft(
            typeof data?.preferredHomePath === "string" ? data.preferredHomePath : "",
          );
        }
      } catch {
        if (!cancelled) {
          setEffectivePermissions([]);
          setPermissionOverrides([]);
          setPreferredHomePathDraft("");
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

  const counts = useMemo(() => {
    const byRole = {} as Record<Role, number>;

    for (const u of users) {
      byRole[u.role] = (byRole[u.role] ?? 0) + 1;
    }

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

  async function saveRole() {
    if (!selected) return;
    if (roleDraft === selected.role) return;
    clearFlash();
    setSavingRole(true);

    try {
      const roleId = roles.find((r) => r.description === roleDraft)?.id;
      if (!roleId) {
        showFlash(errorResponse("No se pudo resolver el rol seleccionado."));
        return;
      }

      const res = await updateUserRole(selected.id, { roleId });
      const nowIso = new Date().toISOString();
      setUsers((p) => p.map((u) => (u.id === selected.id ? { ...u, role: roleDraft, updatedAt: nowIso } : u)));
      showFlash(successResponse((res as { message?: string })?.message || "Rol actualizado"));
    } catch (error: unknown) {
      const parsed = readError(error);
      showFlash(errorResponse(parsed.message.trim() || "No se pudo actualizar el rol."));
    } finally {
      setSavingRole(false);
    }
  }

  async function deactivateUser() {
    if (!selected) return;
    clearFlash();
    setTogglingStatus(true);

    try {
      const res = await deleteUserById(selected.id);
      const nowIso = new Date().toISOString();
      setUsers((prev) =>
        prev.map((u) => (u.id === selected.id ? { ...u, deleted: true, deletedAt: u.deletedAt ?? nowIso, updatedAt: nowIso } : u)),
      );
      showFlash(successResponse((res as { message?: string })?.message || "Usuario desactivado"));
    } catch (error: unknown) {
      const parsed = readError(error);
      showFlash(errorResponse(parsed.message.trim() || "No se pudo desactivar el usuario."));
    } finally {
      setTogglingStatus(false);
    }
  }

  async function restoreUser() {
    if (!selected) return;
    clearFlash();
    setTogglingStatus(true);

    try {
      const res = await restoreUserById(selected.id);
      const nowIso = new Date().toISOString();
      setUsers((prev) => prev.map((u) => (u.id === selected.id ? { ...u, deleted: false, deletedAt: null, updatedAt: nowIso } : u)));
      showFlash(successResponse((res as { message?: string })?.message || "Usuario restablecido"));
    } catch (error: unknown) {
      const parsed = readError(error);
      showFlash(errorResponse(parsed.message.trim() || "No se pudo restablecer el usuario."));
    } finally {
      setTogglingStatus(false);
    }
  }

  async function savePermissionOverride(permissionCode: string, effect: PermissionEffect, reason?: string) {
    if (!selected?.id) return;
    clearFlash();
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
      showFlash(successResponse("Permiso delegado correctamente."));
    } catch (error: unknown) {
      const parsed = readError(error);
      showFlash(errorResponse(parsed.message.trim() || "No se pudo delegar el permiso."));
    } finally {
      setSavingOverride(false);
    }
  }

  async function deletePermissionOverride(permissionCode: string) {
    if (!selected?.id) return;
    clearFlash();
    setSavingOverride(true);
    try {
      await removeUserPermissionOverride(selected.id, permissionCode);
      const data = await getEffectivePermissionsDetailByUser(selected.id);
      setEffectivePermissions(Array.isArray(data?.permissions) ? data.permissions : []);
      setPermissionOverrides(Array.isArray(data?.overrides) ? data.overrides : []);
      showFlash(successResponse("Override eliminado correctamente."));
    } catch (error: unknown) {
      const parsed = readError(error);
      showFlash(errorResponse(parsed.message.trim() || "No se pudo eliminar el override."));
    } finally {
      setSavingOverride(false);
    }
  }

  async function savePreferredHomePath() {
    if (!selected?.id) return;
    clearFlash();
    setSavingPreferredHomePath(true);
    try {
      const preferredHomePath = preferredHomePathDraft.trim() || null;
      await setUserPreferredHomePath({
        userId: selected.id,
        preferredHomePath,
      });
      showFlash(successResponse("Pagina inicial actualizada."));
    } catch (error: unknown) {
      const parsed = readError(error);
      showFlash(errorResponse(parsed.message.trim() || "No se pudo actualizar la pagina inicial."));
    } finally {
      setSavingPreferredHomePath(false);
    }
  }

  return (
    <div
      className={cn(
        "w-full bg-gradient-to-b from-white via-white to-zinc-50",
        "h-[calc(100vh-var(--dashTop,0px))]",
        "flex flex-col",
        "py-4 sm:py-6 2xl:py-8 3xl:py-10 4xl:py-12",
      )}
    >
      <PageTitle title="Gestión de usuarios" />
      <div className="mx-auto flex h-full w-full max-w-[1280px] min-h-0 flex-col px-4 sm:px-6 lg:max-w-[1440px] lg:px-8 2xl:max-w-[1680px] 2xl:px-10">
        <UsersHeader
          onCreateClick={() => setModalOpen(true)}
          visibleRoles={visibleRoles}
          countsByRole={countsByRole}
          counts={counts}
        />

        <div className={cn("mt-4 grid min-h-0 flex-1 gap-3", "lg:grid-cols-[420px_1fr]", "2xl:gap-4 3xl:gap-5")}>
          <UsersLeftPanel
            query={query}
            setQuery={handleQueryChange}
            safePage={safePage}
            setPage={setPage}
            hasPrevPage={pagination.hasPrev}
            hasNextPage={pagination.hasNext}
            totalPages={Math.max(1, pagination.totalPages)}
            total={pagination.total}
            loading={loading}
            users={users}
            selectedId={selectedId}
            setSelectedId={handleSelectUser}
            usersError={usersError}
            status={status}
            setStatus={handleStatusChange}
          />
          <UsersRightPanel
            selected={selected}
            roleDraft={roleDraft}
            setRoleDraft={setRoleDraft}
            savingRole={savingRole}
            saveRole={saveRole}
            togglingStatus={togglingStatus}
            deactivateUser={deactivateUser}
            restoreUser={restoreUser}
            effectivePermissions={effectivePermissions}
            permissionOverrides={permissionOverrides}
            savingOverride={savingOverride}
            savePermissionOverride={savePermissionOverride}
            deletePermissionOverride={deletePermissionOverride}
            preferredHomePath={preferredHomePathDraft}
            setPreferredHomePathDraft={setPreferredHomePathDraft}
            savingPreferredHomePath={savingPreferredHomePath}
            savePreferredHomePath={savePreferredHomePath}
          />
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Crear usuario"
      >
        <UserForm
          closeModal={() => setModalOpen(false)}
          onCreated={() => setReloadTick((prev) => prev + 1)}
        />
      </Modal>
    </div>
  );
}
