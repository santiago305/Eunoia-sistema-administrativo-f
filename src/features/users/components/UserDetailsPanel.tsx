import { MASTER_ROLE_DESCRIPTION } from "./usersPage.helpers";
import { UserInfoSection } from "./UserInfoSection";
import { UserPermissionsSummary } from "./UserPermissionsSummary";
import { UserProfileHeader } from "./UserProfileHeader";
import { UserRoleSection } from "./UserRoleSection";
import { UserStoragePanel } from "./UserStoragePanel";
import { UsersEmptyState } from "./UsersEmptyState";
import type { Role, RoleOption, User } from "../types/users.types";

type UserDetailsPanelProps = {
  selected: User | null;
  isSuperAdmin: boolean;
  canAssignRoles: boolean;
  canUpdateUsers: boolean;
  canDeleteUsers: boolean;
  canRestoreUsers: boolean;
  roleDraft: Role;
  roles: RoleOption[];
  savingRole: boolean;
  togglingStatus: boolean;
  effectivePermissionsCount: number;
  allowedOverrides: number;
  deniedOverrides: number;
  mailStorageQuotaGbDraft: number;
  storagePercent: number;
  mailStorageUsedLabel: string;
  savingMailStorageQuota: boolean;
  selectedCanManageGrantablePermissions: boolean;
  actorCanManageGrantablePermissions: boolean;
  onOpenPermissions: () => void;
  onOpenGrantablePermissions: () => void;
  onDeactivate: () => void;
  onRestore: () => void;
  onRoleDraftChange: (role: Role) => void;
  onSaveRole: () => void;
  onChangeQuota: (direction: 1 | -1) => void;
  onMailStorageQuotaChange: (value: number) => void;
  onSaveMailStorageQuota: () => void;
};

export function UserDetailsPanel({
  selected,
  isSuperAdmin,
  canAssignRoles,
  canUpdateUsers,
  canDeleteUsers,
  canRestoreUsers,
  roleDraft,
  roles,
  savingRole,
  togglingStatus,
  effectivePermissionsCount,
  allowedOverrides,
  deniedOverrides,
  mailStorageQuotaGbDraft,
  storagePercent,
  mailStorageUsedLabel,
  savingMailStorageQuota,
  selectedCanManageGrantablePermissions,
  actorCanManageGrantablePermissions,
  onOpenPermissions,
  onOpenGrantablePermissions,
  onDeactivate,
  onRestore,
  onRoleDraftChange,
  onSaveRole,
  onChangeQuota,
  onMailStorageQuotaChange,
  onSaveMailStorageQuota,
}: UserDetailsPanelProps) {
  if (!selected) {
    return (
      <UsersEmptyState
        className="h-full min-h-[520px]"
        size="lg"
        title="Selecciona un usuario"
        description="El panel de detalle ocupa todo el ancho disponible aunque no exista informacion seleccionada."
      />
    );
  }

  const selectedIsDeleted = Boolean(selected.deleted || selected.deletedAt);

  return (
    <div className="flex min-h-full w-full flex-col">
      <UserProfileHeader
        selected={selected}
        selectedIsDeleted={selectedIsDeleted}
        canDeleteUsers={canDeleteUsers}
        canRestoreUsers={canRestoreUsers}
        togglingStatus={togglingStatus}
        selectedCanManageGrantablePermissions={selectedCanManageGrantablePermissions}
        actorCanManageGrantablePermissions={actorCanManageGrantablePermissions}
        onOpenPermissions={onOpenPermissions}
        onOpenGrantablePermissions={onOpenGrantablePermissions}
        onDeactivate={onDeactivate}
        onRestore={onRestore}
      />

      <div className="grid w-full gap-5 py-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <UserInfoSection selected={selected} isSuperAdmin={isSuperAdmin} />

          {canAssignRoles && selected.role !== MASTER_ROLE_DESCRIPTION ? (
            <UserRoleSection
              selected={selected}
              roleDraft={roleDraft}
              roles={roles}
              isSuperAdmin={isSuperAdmin}
              savingRole={savingRole}
              onRoleDraftChange={onRoleDraftChange}
              onSaveRole={onSaveRole}
            />
          ) : null}

          <UserPermissionsSummary
            effectivePermissionsCount={effectivePermissionsCount}
            allowedOverrides={allowedOverrides}
            deniedOverrides={deniedOverrides}
            onOpenPermissions={onOpenPermissions}
          />
        </div>

        <UserStoragePanel
          canEditQuota={canUpdateUsers && isSuperAdmin}
          quotaGb={mailStorageQuotaGbDraft}
          storagePercent={storagePercent}
          usedLabel={mailStorageUsedLabel}
          saving={savingMailStorageQuota}
          onChangeQuota={onChangeQuota}
          onQuotaInputChange={onMailStorageQuotaChange}
          onSaveQuota={onSaveMailStorageQuota}
        />
      </div>
    </div>
  );
}
