import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
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
} from "@/shared/services/userService";
import {
  getEffectivePermissionsDetailByUser,
  getUserGrantablePermissions,
  listAccessPermissions,
  removeUserPermissionOverride,
  setUserGrantablePermissions,
  setUserPermissionOverride,
  type AccessPermissionItem,
  type PermissionEffect,
  type UserPermissionOverride,
} from "@/shared/services/accessControlService";
import { findAllRoles } from "@/shared/services/roleService";
import { usePermissions } from "@/shared/hooks/usePermissions";
import { useAuth } from "@/shared/hooks/useAuth";
import { UsersPageLayout } from "./components/UsersPageLayout";
import { UsersPageModals } from "./components/UsersPageModals";
import {
  MASTER_ROLE_DESCRIPTION,
  getRoleLabel,
  normalizeUser,
  readError,
} from "./components/usersPage.helpers";
import type { Role, RoleOption, User, UserListStatus } from "./types/users.types";

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
  const [grantablePermissionsOpen, setGrantablePermissionsOpen] = useState(false);
  const [grantablePermissionCodes, setGrantablePermissionCodes] = useState<string[]>([]);
  const [savingGrantablePermissions, setSavingGrantablePermissions] = useState(false);
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
    setGrantablePermissionCodes([]);
  }, [selected?.id]);

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
        setPermissionOverrides([]);
        return;
      }

      setEffectivePermissions([]);
      setPermissionOverrides([]);

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

  const safePage = Math.max(1, pagination.page || page);
  const totalUsers = countsByRole?.total ?? pagination.total;
  const storagePercent = Math.max(0, Math.min(100, Math.round(mailStorageUsedPercent ?? 0)));

  const allowedOverrides = useMemo(
    () => permissionOverrides.filter((item) => item.effect === "ALLOW").length,
    [permissionOverrides],
  );
  const deniedOverrides = useMemo(
    () => permissionOverrides.filter((item) => item.effect === "DENY").length,
    [permissionOverrides],
  );

  const selectedHasUserManagementBase = [
    "users.read",
    "users.create",
    "users.update",
    "users.delete",
    "users.restore",
    "users.assign_roles",
  ].every((permissionCode) => effectivePermissions.includes(permissionCode));
  const selectedHasDelegationBase = [
    "users.assign_permissions",
    "users.deny_permissions",
    "users.manage_grantable_permissions",
  ].every((permissionCode) => effectivePermissions.includes(permissionCode));
  const selectedCanUseManagementScope = selectedHasUserManagementBase;
  const selectedCanManageGrantablePermissions =
    selectedCanUseManagementScope &&
    selectedHasDelegationBase;
  const actorCanManageManagementScope = isSuperAdmin || can("users.assign_permissions");
  const actorCanManageGrantablePermissions =
    isSuperAdmin ||
    (can("users.create") &&
      can("users.assign_permissions") &&
      can("users.manage_grantable_permissions"));
  const canManageGrantablePermissions =
    actorCanManageGrantablePermissions &&
    selectedCanManageGrantablePermissions;
  const canManageScopeForSelected =
    actorCanManageManagementScope &&
    selectedCanUseManagementScope;

  const managementRoleOptions = useMemo(
    () =>
      roles
        .map((role) => ({
          value: role.description,
          label: getRoleLabel(role.description),
        }))
        .filter((role) => role.value !== MASTER_ROLE_DESCRIPTION),
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

  const changeQuota = (direction: 1 | -1) => {
    const next = Math.max(1, Math.min(5, Number(mailStorageQuotaGbDraft) + direction));
    setMailStorageQuotaGbDraft(next);
  };

  async function saveRole() {
    if (!selected) return;

    const normalizedSelectedRole = selected.role === "sin_rol" ? "" : selected.role;
    if (roleDraft === normalizedSelectedRole) return;

    clearFeedback();
    setSavingRole(true);

    try {
      let roleId: string | null = null;

      if (roleDraft) {
        roleId = roles.find((r) => r.description === roleDraft)?.id ?? null;
        if (!roleId) {
          showFeedback(errorResponse("No se pudo resolver el rol seleccionado."));
          return;
        }
      } else if (!isSuperAdmin) {
        showFeedback(errorResponse("Solo super administrador puede quitar el rol."));
        return;
      }

      const res = await updateUserRole(selected.id, { roleId });
      const nowIso = new Date().toISOString();

      setUsers((prev) =>
        prev.map((user) =>
          user.id === selected.id ? { ...user, role: roleDraft || "sin_rol", updatedAt: nowIso } : user,
        ),
      );
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
        prev.map((user) =>
          user.id === selected.id
            ? { ...user, deleted: true, deletedAt: user.deletedAt ?? nowIso, updatedAt: nowIso }
            : user,
        ),
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

      setUsers((prev) =>
        prev.map((user) =>
          user.id === selected.id ? { ...user, deleted: false, deletedAt: null, updatedAt: nowIso } : user,
        ),
      );
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

  async function openGrantablePermissionsModal() {
    if (!selected?.id || !canManageGrantablePermissions) return;

    clearFeedback();

    try {
      const response = await getUserGrantablePermissions(selected.id);
      setGrantablePermissionCodes(Array.isArray(response?.permissionCodes) ? response.permissionCodes : []);
      setGrantablePermissionsOpen(true);
    } catch (error: unknown) {
      const parsed = readError(error);
      showFeedback(errorResponse(parsed.message.trim() || "No se pudo cargar permisos delegables."));
    }
  }

  async function saveGrantablePermissions(permissionCodes: string[]) {
    if (!selected?.id) return;

    clearFeedback();
    setSavingGrantablePermissions(true);

    try {
      const response = await setUserGrantablePermissions({
        userId: selected.id,
        permissionCodes,
      });
      setGrantablePermissionCodes(Array.isArray(response?.permissionCodes) ? response.permissionCodes : permissionCodes);
      showFeedback(successResponse("Permisos delegables actualizados."));
      setGrantablePermissionsOpen(false);
    } catch (error: unknown) {
      const parsed = readError(error);
      showFeedback(errorResponse(parsed.message.trim() || "No se pudo guardar permisos delegables."));
    } finally {
      setSavingGrantablePermissions(false);
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
      showFeedback(successResponse("Alcance de gestion actualizado."));
    } catch (error: unknown) {
      const parsed = readError(error);
      showFeedback(errorResponse(parsed.message.trim() || "No se pudo actualizar el alcance de gestion."));
    } finally {
      setSavingManagementScope(false);
    }
  }

  return (
    <UsersPageLayout
      totalUsers={totalUsers}
      query={query}
      onQueryChange={handleQueryChange}
      canCreate={can("users.create")}
      onOpenCreateModal={() => setModalOpen(true)}
      status={status}
      onStatusChange={handleStatusChange}
      safePage={safePage}
      totalPages={Math.max(1, pagination.totalPages)}
      hasPrev={pagination.hasPrev}
      hasNext={pagination.hasNext}
      onPrevPage={() => setPage((current) => Math.max(1, current - 1))}
      onNextPage={() => setPage((current) => current + 1)}
      loading={loading}
      total={pagination.total}
      users={users}
      selectedId={selectedId}
      usersError={usersError}
      onSelectUser={handleSelectUser}
      selected={selected}
      isSuperAdmin={isSuperAdmin}
      canAssignRoles={can("users.assign_roles")}
      canUpdateUsers={can("users.update")}
      canDeleteUsers={can("users.delete")}
      canRestoreUsers={can("users.restore")}
      roleDraft={roleDraft}
      roles={roles}
      savingRole={savingRole}
      togglingStatus={togglingStatus}
      effectivePermissionsCount={effectivePermissions.length}
      allowedOverrides={allowedOverrides}
      deniedOverrides={deniedOverrides}
      mailStorageQuotaGbDraft={mailStorageQuotaGbDraft}
      storagePercent={storagePercent}
      mailStorageUsedLabel={mailStorageUsedLabel}
      savingMailStorageQuota={savingMailStorageQuota}
      selectedCanManageGrantablePermissions={selectedCanManageGrantablePermissions}
      actorCanManageGrantablePermissions={actorCanManageGrantablePermissions}
      onOpenPermissions={() => setPermissionsOpen(true)}
      onOpenGrantablePermissions={() => void openGrantablePermissionsModal()}
      onDeactivate={() => void deactivateUser()}
      onRestore={() => void restoreUser()}
      onRoleDraftChange={setRoleDraft}
      onSaveRole={() => void saveRole()}
      onChangeQuota={changeQuota}
      onMailStorageQuotaChange={setMailStorageQuotaGbDraft}
      onSaveMailStorageQuota={() => void saveMailStorageQuota()}
      footer={
        <UsersPageModals
          permissionsOpen={permissionsOpen}
          onClosePermissions={() => setPermissionsOpen(false)}
          selected={selected}
          allPermissions={allPermissions}
          effectivePermissions={effectivePermissions}
          permissionOverrides={permissionOverrides}
          savingOverride={savingOverride}
          savePermissionOverride={savePermissionOverride}
          deletePermissionOverride={deletePermissionOverride}
          canManageOverrides={can("users.assign_permissions") || can("users.deny_permissions")}
          showManagementScope={selectedCanUseManagementScope}
          canManageScope={canManageScopeForSelected}
          managementRoleOptions={managementRoleOptions}
          managementUserOptions={managementUserOptions}
          managementRoleValues={managementRoleScopeDraft}
          managementUserValues={managementUserScopeDraft}
          savingManagementScope={savingManagementScope}
          onChangeManagementRoles={setManagementRoleScopeDraft}
          onChangeManagementUsers={setManagementUserScopeDraft}
          onSaveManagementScope={saveManagementScope}
          grantablePermissionsOpen={grantablePermissionsOpen}
          onCloseGrantablePermissions={() => setGrantablePermissionsOpen(false)}
          grantablePermissionCodes={grantablePermissionCodes}
          savingGrantablePermissions={savingGrantablePermissions}
          canAssignWildcard={isSuperAdmin}
          onSaveGrantablePermissions={saveGrantablePermissions}
          modalOpen={modalOpen}
          canCreateUsers={can("users.create")}
          onCloseCreateModal={() => setModalOpen(false)}
          onCreated={() => setReloadTick((prev) => prev + 1)}
        />
      }
    />
  );
}

