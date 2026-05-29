import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { MASTER_ROLE_DESCRIPTION, getRoleLabel } from "./usersPage.helpers";
import type { Role, RoleOption, User } from "../types/users.types";

type UserRoleSectionProps = {
  selected: User;
  roleDraft: Role;
  roles: RoleOption[];
  isSuperAdmin: boolean;
  savingRole: boolean;
  onRoleDraftChange: (role: Role) => void;
  onSaveRole: () => void;
};

export function UserRoleSection({
  selected,
  roleDraft,
  roles,
  isSuperAdmin,
  savingRole,
  onRoleDraftChange,
  onSaveRole,
}: UserRoleSectionProps) {
  return (
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
            options={[
              ...(isSuperAdmin ? [{ value: "", label: "Sin rol" }] : []),
              ...roles
                .map((role) => ({ value: role.description, label: getRoleLabel(role.description) }))
                .filter((role) => role.value !== MASTER_ROLE_DESCRIPTION),
            ]}
            onChange={(value) => onRoleDraftChange(value as Role)}
            className="mt-3 h-10 rounded-sm text-sm"
          />
        </div>

        <SystemButton
          variant="secondary"
          loading={savingRole}
          disabled={roleDraft === (selected.role === "sin_rol" ? "" : selected.role)}
          onClick={onSaveRole}
        >
          Guardar rol
        </SystemButton>
      </div>
    </section>
  );
}
