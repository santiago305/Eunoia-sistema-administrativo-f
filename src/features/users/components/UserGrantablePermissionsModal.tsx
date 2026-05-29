import { ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/shared/components/modales/Modal";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { Checkbox } from "@/shared/components/ui/checkbox";
import type { AccessPermissionItem } from "@/shared/services/accessControlService";
import { buildUserPermissionGroups } from "../utils/permissionPresentation";
import type { User } from "../types/users.types";

const cn = (...s: Array<string | false | null | undefined>) => s.filter(Boolean).join(" ");

type UserGrantablePermissionsModalProps = {
  open: boolean;
  onClose: () => void;
  selected: User | null;
  allPermissions: AccessPermissionItem[];
  grantablePermissionCodes: string[];
  saving: boolean;
  canAssignWildcard: boolean;
  onSave: (permissionCodes: string[]) => Promise<void>;
};

export function UserGrantablePermissionsModal({
  open,
  onClose,
  selected,
  allPermissions,
  grantablePermissionCodes,
  saving,
  canAssignWildcard,
  onSave,
}: UserGrantablePermissionsModalProps) {
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());
  const [openModules, setOpenModules] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSelectedCodes(new Set(grantablePermissionCodes));
  }, [grantablePermissionCodes, open]);

  const visiblePermissions = useMemo(
    () =>
      allPermissions.filter((permission) =>
        canAssignWildcard ? true : permission.code !== "*",
      ),
    [allPermissions, canAssignWildcard],
  );

  const groups = useMemo(
    () =>
      buildUserPermissionGroups({
        permissions: visiblePermissions,
        effectivePermissions: Array.from(selectedCodes),
        overrides: [],
      }),
    [visiblePermissions, selectedCodes],
  );

  const totalSelected = selectedCodes.size;

  const toggleModule = (module: string) => {
    setOpenModules((prev) => {
      const next = new Set(prev);
      if (next.has(module)) next.delete(module);
      else next.add(module);
      return next;
    });
  };

  const togglePermission = (permissionCode: string) => {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(permissionCode)) next.delete(permissionCode);
      else next.add(permissionCode);
      return next;
    });
  };

  const toggleModuleSelection = (permissionCodes: string[]) => {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      const moduleFullySelected = permissionCodes.every((permissionCode) => next.has(permissionCode));
      if (moduleFullySelected) {
        permissionCodes.forEach((permissionCode) => next.delete(permissionCode));
      } else {
        permissionCodes.forEach((permissionCode) => next.add(permissionCode));
      }
      return next;
    });
  };

  const save = async () => {
    await onSave(Array.from(selectedCodes).sort());
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Permisos que puede otorgar"
      description={
        selected
          ? `Define qué permisos puede delegar ${selected.name} a otros usuarios o roles.`
          : "Selecciona un usuario para configurar permisos delegables."
      }
      className="w-[min(980px,calc(100vw-2rem))] rounded-sm border border-zinc-100"
      headerClassName="border-b-0 bg-white px-5 pt-5 pb-2"
      bodyClassName="px-5 pb-5 pt-2"
      overlayBlur
    >
      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-sm bg-primary/5 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-primary">Delegación</p>
          <p className="mt-3 text-3xl font-semibold leading-none text-zinc-950">{totalSelected}</p>
          <p className="mt-1 text-sm text-zinc-500">permisos delegables</p>
          <p className="mt-5 text-xs leading-5 text-zinc-500">
            Estos permisos controlan qué puede otorgar o denegar este usuario cuando edita permisos de terceros.
          </p>
        </aside>

        <section className="min-h-[520px] rounded-sm bg-zinc-50 p-2">
          <div className="max-h-[66vh] overflow-y-auto pr-1">
            {groups.map((group) => {
              const isOpen = openModules.has(group.module);
              const modulePermissionCodes = group.permissions.map((permission) => permission.code);
              const moduleSelectedCount = modulePermissionCodes.filter((permissionCode) =>
                selectedCodes.has(permissionCode),
              ).length;
              const moduleAllSelected =
                modulePermissionCodes.length > 0 &&
                moduleSelectedCount === modulePermissionCodes.length;

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
                        {moduleSelectedCount} de {group.totalCount} delegables
                      </p>
                    </div>
                    <span className="rounded-sm bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600">
                      {group.totalCount}
                    </span>
                  </button>

                  {isOpen ? (
                    <div className="grid gap-1 px-2 pb-2">
                      <div className="flex items-center justify-between rounded-sm bg-zinc-50 px-3 py-2">
                        <span className="text-xs font-medium text-zinc-700">Seleccionar módulo completo</span>
                        <Checkbox
                          checked={moduleAllSelected}
                          disabled={saving}
                          onCheckedChange={() => toggleModuleSelection(modulePermissionCodes)}
                        />
                      </div>

                      {group.permissions.map((permission) => (
                        <div
                          key={permission.code}
                          className="grid gap-3 rounded-sm bg-white px-3 py-2.5 transition sm:grid-cols-[minmax(0,1fr)_auto]"
                        >
                          <label className="flex min-w-0 cursor-pointer items-start gap-3">
                            <Checkbox
                              checked={selectedCodes.has(permission.code)}
                              disabled={saving}
                              onCheckedChange={() => togglePermission(permission.code)}
                              className="mt-0.5"
                            />
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium text-zinc-900">{permission.label}</span>
                              <span className="mt-0.5 block truncate font-mono text-[11px] text-zinc-500">
                                {permission.code}
                              </span>
                            </span>
                          </label>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <SystemButton variant="secondary" onClick={onClose}>
          Cerrar
        </SystemButton>
        <SystemButton variant="primary" loading={saving} onClick={() => void save()}>
          Guardar delegación
        </SystemButton>
      </div>
    </Modal>
  );
}
