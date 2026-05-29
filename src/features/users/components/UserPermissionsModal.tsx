import { ChevronRight, Info, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { Modal } from "@/shared/components/modales/Modal";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { FloatingMultiSelect } from "@/shared/components/components/FloatingMultiSelect";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import type {
  AccessPermissionItem,
  PermissionEffect,
  UserPermissionOverride,
} from "@/shared/services/accessControlService";
import {
  buildUserPermissionGroups,
  getNextPermissionOverrideEffect,
  type PresentedPermission,
} from "../utils/permissionPresentation";
import type { User } from "../types/users.types";

const cn = (...s: Array<string | false | null | undefined>) => s.filter(Boolean).join(" ");

type UserPermissionsModalProps = {
  open: boolean;
  onClose: () => void;
  selected: User | null;
  allPermissions: AccessPermissionItem[];
  effectivePermissions: string[];
  permissionOverrides: UserPermissionOverride[];
  savingOverride: boolean;
  canManageOverrides: boolean;
  savePermissionOverride: (
    permissionCode: string,
    effect: PermissionEffect,
    reason?: string,
  ) => Promise<void>;
  deletePermissionOverride: (permissionCode: string) => Promise<void>;
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
};

const getPermissionTone = (permission: PresentedPermission) => {
  if (permission.state === "denied") {
    return {
      row: "bg-red-50/70 text-red-950",
      label: "Denegado",
      labelClass: "bg-red-100 text-red-700",
    };
  }
  if (permission.state === "granted") {
    return {
      row: "bg-emerald-50/70 text-emerald-950",
      label: "Extra",
      labelClass: "bg-emerald-100 text-emerald-700",
    };
  }
  if (permission.state === "inherited") {
    return {
      row: "bg-zinc-50 text-zinc-950",
      label: "Rol",
      labelClass: "bg-zinc-200/70 text-zinc-700",
    };
  }
  return {
    row: "bg-white text-zinc-900",
    label: "Libre",
    labelClass: "bg-zinc-100 text-zinc-500",
  };
};

export function UserPermissionsModal({
  open,
  onClose,
  selected,
  allPermissions,
  effectivePermissions,
  permissionOverrides,
  savingOverride,
  canManageOverrides,
  savePermissionOverride,
  deletePermissionOverride,
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
}: UserPermissionsModalProps) {
  const groups = useMemo(
    () =>
      buildUserPermissionGroups({
        permissions: allPermissions,
        effectivePermissions,
        overrides: permissionOverrides,
      }),
    [allPermissions, effectivePermissions, permissionOverrides],
  );
  const [openModules, setOpenModules] = useState<Set<string>>(new Set());

  const toggleModule = (module: string) => {
    setOpenModules((prev) => {
      const next = new Set(prev);
      if (next.has(module)) next.delete(module);
      else next.add(module);
      return next;
    });
  };

  const applyPermissionToggle = async (permission: PresentedPermission) => {
    if (!canManageOverrides || savingOverride) return;
    const effect = getNextPermissionOverrideEffect(permission.state);
    await savePermissionOverride(
      permission.code,
      effect,
      effect === "DENY"
        ? "Denegado desde el panel de usuario"
        : "Otorgado desde el panel de usuario",
    );
  };

  const getOverride = (code: string) =>
    permissionOverrides.find((item) => item.permissionCode === code);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Permisos del usuario"
      description={
        selected
          ? `Ajustes directos para ${selected.name}. No modifican el rol.`
          : "Selecciona un usuario para gestionar permisos."
      }
      className="w-[min(980px,calc(100vw-2rem))] rounded-sm border border-zinc-100"
      headerClassName="border-b-0 bg-white px-5 pt-5 pb-2"
      bodyClassName="px-5 pb-5 pt-2"
      overlayBlur
    >
      <TooltipProvider delayDuration={120}>
        <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
          <aside className="rounded-sm bg-primary/5 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-primary">Resumen</p>
            <p className="mt-3 text-3xl font-semibold leading-none text-zinc-950">{effectivePermissions.length}</p>
            <p className="mt-1 text-sm text-zinc-500">permisos efectivos</p>
            <div className="mt-5 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-sm bg-white p-3">
                <p className="text-zinc-500">Extras</p>
                <p className="mt-1 text-lg font-semibold text-zinc-950">
                  {permissionOverrides.filter((item) => item.effect === "ALLOW").length}
                </p>
              </div>
              <div className="rounded-sm bg-white p-3">
                <p className="text-zinc-500">Denegados</p>
                <p className="mt-1 text-lg font-semibold text-zinc-950">
                  {permissionOverrides.filter((item) => item.effect === "DENY").length}
                </p>
              </div>
            </div>
            <p className="mt-5 text-xs leading-5 text-zinc-500">
              Marcado significa que el usuario tiene acceso. Si quitas un permiso del rol,
              se guarda como denegado solo para este usuario.
            </p>
          </aside>

          <section className="min-h-[520px] rounded-sm bg-zinc-50 p-2">
            {showManagementScope ? (
              <div className="mb-3 rounded-sm border border-zinc-200 bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Alcance de gestión</p>
                <p className="mt-1 text-xs text-zinc-500">
                  Define qué roles y usuarios adicionales puede ver/gestionar este usuario al crear cuentas.
                </p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <FloatingMultiSelect
                    label="Roles permitidos"
                    name="management-role-scope"
                    value={managementRoleValues}
                    options={managementRoleOptions}
                    disabled={!canManageScope || savingManagementScope}
                    onChange={onChangeManagementRoles}
                    placeholder="Sin alcance por rol"
                  />
                  <FloatingMultiSelect
                    label="Usuarios permitidos"
                    name="management-user-scope"
                    value={managementUserValues}
                    options={managementUserOptions}
                    disabled={!canManageScope || savingManagementScope}
                    onChange={onChangeManagementUsers}
                    placeholder="Sin alcance por usuario"
                    searchable
                  />
                </div>
                <div className="mt-3 flex justify-end">
                  <SystemButton
                    type="button"
                    variant="secondary"
                    disabled={!canManageScope}
                    onClick={() => void onSaveManagementScope()}
                    loading={savingManagementScope}
                  >
                    Guardar alcance
                  </SystemButton>
                </div>
              </div>
            ) : null}

            <div className="max-h-[66vh] overflow-y-auto pr-1">
              {groups.map((group) => {
                const isOpen = openModules.has(group.module);
                return (
                  <div key={group.module} className="mb-2 overflow-hidden rounded-sm bg-white">
                    <button
                      type="button"
                      onClick={() => toggleModule(group.module)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-zinc-50"
                    >
                      <ChevronRight
                        className={cn(
                          "h-4 w-4 text-zinc-400 transition-transform",
                          isOpen && "rotate-90",
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-zinc-900">{group.label}</p>
                        <p className="text-xs text-zinc-500">
                          {group.selectedCount} de {group.totalCount} permisos activos
                        </p>
                      </div>
                      <span className="rounded-sm bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600">
                        {group.totalCount}
                      </span>
                    </button>

                    {isOpen ? (
                      <div className="grid gap-1 px-2 pb-2">
                        {group.permissions.map((permission) => {
                          const checked =
                            permission.state === "inherited" || permission.state === "granted";
                          const tone = getPermissionTone(permission);
                          const override = getOverride(permission.code);

                          return (
                            <div
                              key={permission.code}
                              className={cn(
                                "grid gap-3 rounded-sm px-3 py-2.5 transition sm:grid-cols-[minmax(0,1fr)_auto]",
                                tone.row,
                              )}
                            >
                              <label className="flex min-w-0 cursor-pointer items-start gap-3">
                                <Checkbox
                                  checked={checked}
                                  disabled={!canManageOverrides || savingOverride}
                                  onCheckedChange={() => void applyPermissionToggle(permission)}
                                  className="mt-0.5"
                                />
                                <span className="min-w-0">
                                  <span className="flex items-center gap-2">
                                    <span className="truncate text-sm font-medium">{permission.label}</span>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Info className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="max-w-xs text-xs">
                                        {permission.helper}
                                      </TooltipContent>
                                    </Tooltip>
                                  </span>
                                  <span className="mt-0.5 block truncate font-mono text-[11px] text-zinc-500">
                                    {permission.code}
                                  </span>
                                  {override?.reason ? (
                                    <span className="mt-1 block text-xs text-zinc-500">
                                      Motivo: {override.reason}
                                    </span>
                                  ) : null}
                                </span>
                              </label>

                              <div className="flex items-center justify-end gap-2">
                                <span className={cn("rounded-sm px-2 py-1 text-[11px] font-medium", tone.labelClass)}>
                                  {tone.label}
                                </span>
                                {override?.permissionCode ? (
                                  <button
                                    type="button"
                                    disabled={!canManageOverrides || savingOverride}
                                    onClick={() => void deletePermissionOverride(override.permissionCode!)}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-sm text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-50"
                                    title="Volver al permiso del rol"
                                  >
                                    <RotateCcw className="h-4 w-4" />
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <div className="mt-4 flex justify-end">
          <SystemButton variant="secondary" onClick={onClose}>
            Cerrar
          </SystemButton>
        </div>
      </TooltipProvider>
    </Modal>
  );
}
