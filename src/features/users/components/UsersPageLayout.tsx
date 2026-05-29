import type { ReactNode } from "react";
import { PageShell } from "@/shared/layouts/PageShell";
import { UserDetailsPanel } from "./UserDetailsPanel";
import { UsersPageHeader } from "./UsersPageHeader";
import { UsersSidebar } from "./UsersSidebar";
import type { Role, RoleOption, User, UserListStatus } from "../types/users.types";

type UsersPageLayoutProps = {
  totalUsers: number;
  query: string;
  onQueryChange: (value: string) => void;
  canCreate: boolean;
  onOpenCreateModal: () => void;
  status: UserListStatus;
  onStatusChange: (nextStatus: UserListStatus) => void;
  safePage: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
  onPrevPage: () => void;
  onNextPage: () => void;
  loading: boolean;
  total: number;
  users: User[];
  selectedId: string | null;
  usersError: string;
  onSelectUser: (id: string) => void;
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
  footer?: ReactNode;
};

export function UsersPageLayout({
  totalUsers,
  query,
  onQueryChange,
  canCreate,
  onOpenCreateModal,
  status,
  onStatusChange,
  safePage,
  totalPages,
  hasPrev,
  hasNext,
  onPrevPage,
  onNextPage,
  loading,
  total,
  users,
  selectedId,
  usersError,
  onSelectUser,
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
  footer,
}: UsersPageLayoutProps) {
  return (
    <PageShell>
      <div className="flex h-full min-h-0 w-full flex-1 flex-col">
        <UsersPageHeader
          totalUsers={totalUsers}
          query={query}
          onQueryChange={onQueryChange}
          canCreate={canCreate}
          onOpenCreateModal={onOpenCreateModal}
          status={status}
          onStatusChange={onStatusChange}
          safePage={safePage}
          totalPages={totalPages}
          hasPrev={hasPrev}
          hasNext={hasNext}
          onPrevPage={onPrevPage}
          onNextPage={onNextPage}
        />

        <div className="grid min-h-0 w-full flex-1 grid-cols-1 gap-0 lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[380px_minmax(0,1fr)]">
          <UsersSidebar
            loading={loading}
            total={total}
            users={users}
            selectedId={selectedId}
            usersError={usersError}
            onSelectUser={onSelectUser}
          />

          <main className="min-h-[520px] min-w-0 w-full overflow-auto lg:min-h-0 lg:pl-5">
            <UserDetailsPanel
              selected={selected}
              isSuperAdmin={isSuperAdmin}
              canAssignRoles={canAssignRoles}
              canUpdateUsers={canUpdateUsers}
              canDeleteUsers={canDeleteUsers}
              canRestoreUsers={canRestoreUsers}
              roleDraft={roleDraft}
              roles={roles}
              savingRole={savingRole}
              togglingStatus={togglingStatus}
              effectivePermissionsCount={effectivePermissionsCount}
              allowedOverrides={allowedOverrides}
              deniedOverrides={deniedOverrides}
              mailStorageQuotaGbDraft={mailStorageQuotaGbDraft}
              storagePercent={storagePercent}
              mailStorageUsedLabel={mailStorageUsedLabel}
              savingMailStorageQuota={savingMailStorageQuota}
              selectedCanManageGrantablePermissions={selectedCanManageGrantablePermissions}
              actorCanManageGrantablePermissions={actorCanManageGrantablePermissions}
              onOpenPermissions={onOpenPermissions}
              onOpenGrantablePermissions={onOpenGrantablePermissions}
              onDeactivate={onDeactivate}
              onRestore={onRestore}
              onRoleDraftChange={onRoleDraftChange}
              onSaveRole={onSaveRole}
              onChangeQuota={onChangeQuota}
              onMailStorageQuotaChange={onMailStorageQuotaChange}
              onSaveMailStorageQuota={onSaveMailStorageQuota}
            />
          </main>
        </div>
      </div>

      {footer}
    </PageShell>
  );
}
