import { LockKeyhole, Plus, Save, ShieldCheck } from "lucide-react";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { SystemButton } from "@/shared/components/components/SystemButton";
import type { RoleOption } from "@/features/roles/types/rolesPermissions.types";
import { getRoleLabel } from "@/features/roles/utils/rolesPermissions.utils";

type RolesPermissionsHeaderProps = {
  roles: RoleOption[];
  selectedRoleId: string;
  selectedRoleDescription: string;
  selectedRoleCreatedByLabel?: string | null;
  selectedCodesCount: number;
  totalPermissionsCount: number;
  activeModules: number;
  totalPercent: number;
  saving: boolean;
  canAssignRolePermissions: boolean;
  canCreateRoles: boolean;
  onRoleChange: (roleId: string) => void;
  onSave: () => void;
  onCreateRole: () => void;
};

export function RolesPermissionsHeader({
  roles,
  selectedRoleId,
  selectedRoleDescription,
  selectedRoleCreatedByLabel,
  selectedCodesCount,
  totalPermissionsCount,
  activeModules,
  totalPercent,
  saving,
  canAssignRolePermissions,
  canCreateRoles,
  onRoleChange,
  onSave,
  onCreateRole,
}: RolesPermissionsHeaderProps) {
  const roleOptions = roles.map((role) => ({
    value: role.id,
    label: getRoleLabel(role.description),
  }));

  return (
    <section className="border-b border-zinc-200/70 pb-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="grid gap-3 sm:grid-cols-[minmax(220px,280px)_1fr] sm:items-center">
          <FloatingSelect
            label="Rol operativo"
            name="roles-permissions-role"
            value={selectedRoleId}
            options={roleOptions}
            onChange={onRoleChange}
            placeholder="Seleccionar rol"
            disabled={roles.length === 0}
            className="h-10 rounded-sm text-sm font-semibold"
          />

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <span className="inline-flex items-center gap-2 font-semibold text-zinc-950">
                <ShieldCheck className="h-4 w-4 text-primary" />
                {getRoleLabel(selectedRoleDescription)}
              </span>
              <span className="text-zinc-500">
                <strong className="font-semibold text-zinc-900">{selectedCodesCount}</strong> activos
              </span>
              <span className="text-zinc-500">
                <strong className="font-semibold text-zinc-900">{totalPermissionsCount}</strong> total
              </span>
              <span className="text-zinc-500">
                <strong className="font-semibold text-zinc-900">{activeModules}</strong> módulos
              </span>
            </div>
            {selectedRoleCreatedByLabel ? (
              <p className="mt-1 text-xs text-zinc-500">Creado por: {selectedRoleCreatedByLabel}</p>
            ) : null}

            <div className="mt-3 h-1 overflow-hidden rounded-sm bg-zinc-100">
              <div
                className="h-full rounded-sm bg-gradient-to-r from-primary/90 via-sky-400/80 to-primary/20 transition-all duration-500"
                style={{ width: `${totalPercent}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          {canCreateRoles ? (
            <SystemButton
              onClick={onCreateRole}
              variant="outline"
              className="h-10 w-full justify-center gap-2 rounded-sm sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              Nuevo rol
            </SystemButton>
          ) : null}

          <SystemButton
            onClick={onSave}
            loading={saving}
            disabled={!selectedRoleId || !canAssignRolePermissions}
            className="h-10 w-full justify-center gap-2 rounded-sm sm:w-auto"
          >
            <Save className="h-4 w-4" />
            Guardar cambios
          </SystemButton>
        </div>
      </div>

      {!canAssignRolePermissions ? (
        <div className="mt-3 flex items-start gap-2 rounded-sm bg-amber-50/70 px-3 py-2 text-xs leading-5 text-amber-700">
          <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Solo lectura: falta permiso roles.assign_permissions.
        </div>
      ) : null}
    </section>
  );
}
