import { ChevronRight, Info } from "lucide-react";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";
import type { AccessPermissionItem } from "@/shared/services/accessControlService";
import type { PermissionModuleGroup } from "@/features/roles/types/rolesPermissions.types";
import { cn, getPercent } from "@/features/roles/utils/rolesPermissions.utils";
import { getPermissionLabel } from "@/features/users/utils/permissionPresentation";

type RolePermissionsMatrixProps = {
  groupedPermissions: PermissionModuleGroup[];
  openModules: Set<string>;
  selectedCodes: Set<string>;
  canAssignRolePermissions: boolean;
  onToggleModule: (module: string) => void;
  onTogglePermission: (code: string) => void;
  onToggleEveryPermissionInModule: (permissions: AccessPermissionItem[]) => void;
};

export function RolePermissionsMatrix({
  groupedPermissions,
  openModules,
  selectedCodes,
  canAssignRolePermissions,
  onToggleModule,
  onTogglePermission,
  onToggleEveryPermissionInModule,
}: RolePermissionsMatrixProps) {
  return (
    <div className="divide-y divide-zinc-200/70">
      {groupedPermissions.map((group) => {
        const isOpen = openModules.has(group.module);
        const selectedCount = group.permissions.filter((permission) =>
          selectedCodes.has(permission.code),
        ).length;
        const modulePercent = getPercent(selectedCount, group.permissions.length);
        const allSelected = selectedCount === group.permissions.length && group.permissions.length > 0;

        return (
          <section key={group.module} className="py-2 first:pt-0 last:pb-0">
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <button
                type="button"
                onClick={() => onToggleModule(group.module)}
                className="group grid min-w-0 gap-2 rounded-sm px-1 py-2 text-left transition hover:bg-zinc-50/80"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <ChevronRight className={cn("h-4 w-4 text-zinc-400 transition", isOpen && "rotate-90")} />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="truncate text-sm font-semibold text-zinc-950">{group.label}</span>
                      <span className="text-xs text-zinc-500">
                        {selectedCount} de {group.permissions.length}
                      </span>
                    </span>
                  </span>
                </span>

                <span className="ml-7 block h-1 overflow-hidden rounded-sm bg-zinc-100">
                  <span
                    className="block h-full rounded-sm bg-gradient-to-r from-primary/90 via-sky-400/70 to-primary/10 transition-all duration-500"
                    style={{ width: `${modulePercent}%` }}
                  />
                </span>
              </button>

              <button
                type="button"
                disabled={!canAssignRolePermissions}
                onClick={() => onToggleEveryPermissionInModule(group.permissions)}
                className="rounded-sm px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50 sm:self-stretch"
              >
                {allSelected ? "Limpiar" : "Marcar"}
              </button>
            </div>

            {isOpen ? (
              <div className="ml-0 mt-2 grid gap-1.5 pl-0 sm:ml-7 md:grid-cols-2 2xl:grid-cols-3">
                {group.permissions.map((permission) => {
                  const checked = selectedCodes.has(permission.code);

                  return (
                    <label
                      key={permission.code}
                      className={cn(
                        "group flex cursor-pointer items-start gap-3 rounded-sm px-2.5 py-2.5 transition",
                        checked
                          ? "bg-gradient-to-r from-primary/10 via-white to-transparent text-zinc-950"
                          : "text-zinc-500 hover:bg-zinc-50/90 hover:text-zinc-900",
                        !canAssignRolePermissions && "cursor-not-allowed opacity-70",
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        disabled={!canAssignRolePermissions}
                        onCheckedChange={() => onTogglePermission(permission.code)}
                        className="mt-0.5 rounded-sm border-zinc-300 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-white"
                      />

                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium">{getPermissionLabel(permission)}</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info
                                className={cn(
                                  "h-3.5 w-3.5 shrink-0 transition",
                                  checked ? "text-primary/60" : "text-zinc-400 group-hover:text-zinc-500",
                                )}
                              />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs rounded-sm text-xs">
                              {permission.description || permission.code}
                            </TooltipContent>
                          </Tooltip>
                        </span>
                        <span className="mt-0.5 block truncate font-mono text-[11px] text-zinc-400">
                          {permission.code}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
