import { Modal } from "@/shared/components/modales/Modal";
import type {
  AccessPermissionItem,
  PermissionEffect,
  UserPermissionOverride,
} from "@/shared/services/accessControlService";
import { UserForm } from "./formUser";
import { UserGrantablePermissionsModal } from "./UserGrantablePermissionsModal";
import { UserPermissionsModal } from "./UserPermissionsModal";
import type { User } from "../types/users.types";

type UsersPageModalsProps = {
  permissionsOpen: boolean;
  onClosePermissions: () => void;
  selected: User | null;
  allPermissions: AccessPermissionItem[];
  effectivePermissions: string[];
  permissionOverrides: UserPermissionOverride[];
  savingOverride: boolean;
  savePermissionOverride: (
    permissionCode: string,
    effect: PermissionEffect,
    reason?: string,
  ) => Promise<void>;
  deletePermissionOverride: (permissionCode: string) => Promise<void>;
  canManageOverrides: boolean;
  showManagementScope: boolean;
  canManageScope: boolean;
  managementRoleOptions: Array<{ value: string; label: string }>;
  managementUserOptions: Array<{ value: string; label: string }>;
  managementRoleValues: string[];
  managementUserValues: string[];
  savingManagementScope: boolean;
  onChangeManagementRoles: (nextValues: string[]) => void;
  onChangeManagementUsers: (nextValues: string[]) => void;
  onSaveManagementScope: () => Promise<void>;
  grantablePermissionsOpen: boolean;
  onCloseGrantablePermissions: () => void;
  grantablePermissionCodes: string[];
  savingGrantablePermissions: boolean;
  canAssignWildcard: boolean;
  onSaveGrantablePermissions: (permissionCodes: string[]) => Promise<void>;
  modalOpen: boolean;
  canCreateUsers: boolean;
  onCloseCreateModal: () => void;
  onCreated: () => void;
};

export function UsersPageModals({
  permissionsOpen,
  onClosePermissions,
  selected,
  allPermissions,
  effectivePermissions,
  permissionOverrides,
  savingOverride,
  savePermissionOverride,
  deletePermissionOverride,
  canManageOverrides,
  showManagementScope,
  canManageScope,
  managementRoleOptions,
  managementUserOptions,
  managementRoleValues,
  managementUserValues,
  savingManagementScope,
  onChangeManagementRoles,
  onChangeManagementUsers,
  onSaveManagementScope,
  grantablePermissionsOpen,
  onCloseGrantablePermissions,
  grantablePermissionCodes,
  savingGrantablePermissions,
  canAssignWildcard,
  onSaveGrantablePermissions,
  modalOpen,
  canCreateUsers,
  onCloseCreateModal,
  onCreated,
}: UsersPageModalsProps) {
  return (
    <>
      <UserPermissionsModal
        open={permissionsOpen}
        onClose={onClosePermissions}
        selected={selected}
        allPermissions={allPermissions}
        effectivePermissions={effectivePermissions}
        permissionOverrides={permissionOverrides}
        savingOverride={savingOverride}
        savePermissionOverride={savePermissionOverride}
        deletePermissionOverride={deletePermissionOverride}
        canManageOverrides={canManageOverrides}
        showManagementScope={showManagementScope}
        canManageScope={canManageScope}
        managementRoleOptions={managementRoleOptions}
        managementUserOptions={managementUserOptions}
        managementRoleValues={managementRoleValues}
        managementUserValues={managementUserValues}
        savingManagementScope={savingManagementScope}
        onChangeManagementRoles={onChangeManagementRoles}
        onChangeManagementUsers={onChangeManagementUsers}
        onSaveManagementScope={onSaveManagementScope}
      />

      <UserGrantablePermissionsModal
        open={grantablePermissionsOpen}
        onClose={onCloseGrantablePermissions}
        selected={selected}
        allPermissions={allPermissions}
        grantablePermissionCodes={grantablePermissionCodes}
        saving={savingGrantablePermissions}
        canAssignWildcard={canAssignWildcard}
        onSave={onSaveGrantablePermissions}
      />

      <Modal
        open={modalOpen && canCreateUsers}
        onClose={onCloseCreateModal}
        title="Crear usuario"
        className="w-[min(760px,calc(100vw-2rem))] rounded-sm border border-zinc-100"
        headerClassName="border-b-0 bg-white px-5 pt-5 pb-2"
        bodyClassName="px-5 pb-5 pt-2"
        overlayBlur
      >
        <UserForm closeModal={onCloseCreateModal} onCreated={onCreated} />
      </Modal>
    </>
  );
}
