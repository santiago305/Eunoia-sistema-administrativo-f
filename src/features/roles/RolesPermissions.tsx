import { ChevronRight, Info, Tag } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { findAllRoles } from "@/shared/services/roleService";
import {
  assignPermissionsToRole,
  listAccessPermissions,
  listRolePermissions,
  type AccessPermissionItem,
} from "@/shared/services/accessControlService";
import { useFeedbackToast } from "@/shared/hooks/useFeedbackToast";
import { usePermissions } from "@/shared/hooks/usePermissions";
import { errorResponse, successResponse } from "@/shared/common/utils/response";
import { PageShell } from "@/shared/layouts/PageShell";
import {
  listMailLabels,
  listModuleLabelConfigs,
  upsertModuleLabelConfig,
} from "@/features/mail/services/messages.service";
import type { MailLabelItem } from "@/features/mail/types/message.types";
import {
  getPermissionLabel,
  getPermissionModuleLabel,
} from "@/features/users/utils/permissionPresentation";
import { ROLE_LABELS, type Role } from "@/features/users/types/roles.types";

type RoleOption = { id: string; description: string };
type ModuleLabelConfigItem = {
  id: string;
  moduleKey: string;
  labelId: string | null;
  updatedByUserId: string | null;
  updatedAt: string;
};

const MODULE_LABEL_KEYS = [
  "purchases",
  "production",
  "warehouse",
  "catalog",
  "supplies",
  "security",
  "roles",
  "providers",
  "corporate",
  "system",
];

const cn = (...s: Array<string | false | null | undefined>) => s.filter(Boolean).join(" ");

const groupByModule = (permissions: AccessPermissionItem[]) => {
  const grouped = new Map<string, AccessPermissionItem[]>();
  for (const permission of permissions) {
    const key = permission.module || "general";
    const current = grouped.get(key) ?? [];
    current.push(permission);
    grouped.set(key, current);
  }

  return Array.from(grouped.entries())
    .map(([module, items]) => ({
      module,
      label: getPermissionModuleLabel(module),
      permissions: items.sort((a, b) => getPermissionLabel(a).localeCompare(getPermissionLabel(b))),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
};

const getRoleLabel = (role: string) =>
  ROLE_LABELS[role as Role] ??
  role
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function RolesPermissions() {
  const { showFeedback, clearFeedback } = useFeedbackToast();
  const { can } = usePermissions();
  const canAssignRolePermissions = can("roles.assign_permissions");
  const canManageNotifications = can("notifications.manage");
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [selectedRoleDescription, setSelectedRoleDescription] = useState("");
  const [allPermissions, setAllPermissions] = useState<AccessPermissionItem[]>([]);
  const [mailLabels, setMailLabels] = useState<MailLabelItem[]>([]);
  const [moduleConfigs, setModuleConfigs] = useState<Record<string, string | null>>({});
  const [savingModuleKey, setSavingModuleKey] = useState<string | null>(null);
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());
  const [openModules, setOpenModules] = useState<Set<string>>(new Set(["purchases"]));
  const [configsOpen, setConfigsOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadInitial = async () => {
      try {
        const [rolesData, permissionsData, labelsData, configsData] = await Promise.all([
          findAllRoles(),
          listAccessPermissions(),
          listMailLabels(),
          listModuleLabelConfigs(),
        ]);
        if (cancelled) return;

        const normalizedRoles = (rolesData ?? []).map((role) => ({
          id: String(role.id),
          description: String(role.description ?? "").toLowerCase(),
        }));

        const configMap: Record<string, string | null> = {};
        MODULE_LABEL_KEYS.forEach((key) => {
          configMap[key] = null;
        });
        (configsData ?? []).forEach((item: ModuleLabelConfigItem) => {
          configMap[item.moduleKey] = item.labelId ?? null;
        });

        setRoles(normalizedRoles);
        setAllPermissions(permissionsData ?? []);
        setMailLabels((labelsData ?? []).filter((item) => item.isVisible && item.type !== "SYSTEM"));
        setModuleConfigs(configMap);

        const firstRole = normalizedRoles[0];
        if (firstRole) {
          setSelectedRoleId(firstRole.id);
          setSelectedRoleDescription(firstRole.description);
        }
      } catch {
        if (!cancelled) showFeedback(errorResponse("No se pudo cargar permisos."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void loadInitial();
    return () => {
      cancelled = true;
    };
  }, [showFeedback]);

  useEffect(() => {
    let cancelled = false;
    const loadRolePermissions = async () => {
      if (!selectedRoleId) return;
      try {
        const data = await listRolePermissions(selectedRoleId);
        if (cancelled) return;
        setSelectedCodes(new Set(data.permissions ?? []));
      } catch {
        if (!cancelled) setSelectedCodes(new Set());
      }
    };
    void loadRolePermissions();
    return () => {
      cancelled = true;
    };
  }, [selectedRoleId]);

  const groupedPermissions = useMemo(() => groupByModule(allPermissions), [allPermissions]);

  const togglePermission = (code: string) => {
    if (!canAssignRolePermissions) return;
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const toggleModule = (module: string) => {
    setOpenModules((prev) => {
      const next = new Set(prev);
      if (next.has(module)) next.delete(module);
      else next.add(module);
      return next;
    });
  };

  const saveMatrix = async () => {
    if (!selectedRoleId) return;
    clearFeedback();
    setSaving(true);
    try {
      await assignPermissionsToRole(selectedRoleId, Array.from(selectedCodes));
      showFeedback(successResponse("Permisos del rol actualizados."));
    } catch {
      showFeedback(errorResponse("No se pudieron actualizar permisos del rol."));
    } finally {
      setSaving(false);
    }
  };

  const saveModuleLabelConfig = async (moduleKey: string, nextLabelId: string | null) => {
    if (!canManageNotifications) return;
    setSavingModuleKey(moduleKey);
    try {
      await upsertModuleLabelConfig(moduleKey, nextLabelId);
      setModuleConfigs((prev) => ({ ...prev, [moduleKey]: nextLabelId }));
      showFeedback(successResponse(`Configuracion guardada para ${getPermissionModuleLabel(moduleKey)}.`));
    } catch {
      showFeedback(errorResponse(`No se pudo guardar la etiqueta de ${getPermissionModuleLabel(moduleKey)}.`));
    } finally {
      setSavingModuleKey(null);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-zinc-600">Cargando permisos...</div>;
  }

  return (
    <PageShell
      contentClassName="gap-0"
    >
      <TooltipProvider delayDuration={120}>
        <div className="w-full">
          <header className="border-b border-zinc-100 pb-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-primary">Cuentas</p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">Permisos</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">
                  Define los permisos base de cada rol. Los cambios de esta pantalla afectan al rol completo;
                  los permisos individuales se controlan desde Usuarios.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <select
                  value={selectedRoleId}
                  onChange={(event) => {
                    const nextId = event.target.value;
                    setSelectedRoleId(nextId);
                    const match = roles.find((role) => role.id === nextId);
                    setSelectedRoleDescription(match?.description ?? "");
                  }}
                  className="h-11 min-w-[220px] rounded-sm border-0 bg-zinc-100 px-3 text-sm text-zinc-900 outline-none ring-1 ring-zinc-200 transition focus:ring-2 focus:ring-primary/30"
                >
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {getRoleLabel(role.description)}
                    </option>
                  ))}
                </select>
                <SystemButton
                  onClick={saveMatrix}
                  loading={saving}
                  disabled={!selectedRoleId || !canAssignRolePermissions}
                >
                  Guardar matriz
                </SystemButton>
              </div>
            </div>

            {!canAssignRolePermissions ? (
              <p className="mt-4 text-xs text-zinc-500">
                Solo lectura: falta permiso roles.assign_permissions.
              </p>
            ) : null}
          </header>

          <div className="mt-4 grid gap-4 xl:grid-cols-[320px_1fr]">
            <aside className="grid content-start gap-3">
              <section className="rounded-sm bg-primary/5 p-4">
                <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-400">Rol actual</p>
                <p className="mt-2 text-2xl font-semibold text-zinc-950">
                  {getRoleLabel(selectedRoleDescription)}
                </p>
                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  {selectedCodes.size} permisos activos de {allPermissions.length} disponibles.
                </p>
              </section>

              <section className="overflow-hidden rounded-sm bg-white">
                <button
                  type="button"
                  onClick={() => setConfigsOpen((prev) => !prev)}
                  className="flex w-full items-center gap-3 px-4 py-4 text-left transition hover:bg-zinc-50"
                >
                  <ChevronRight className={cn("h-4 w-4 text-zinc-400 transition", configsOpen && "rotate-90")} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-zinc-900">Configuraciones</p>
                    <p className="text-xs text-zinc-500">Etiquetas por modulo</p>
                  </div>
                  <Tag className="h-4 w-4 text-zinc-400" />
                </button>

                {configsOpen ? (
                  <div className="grid gap-2 px-3 pb-3">
                    {MODULE_LABEL_KEYS.map((moduleKey) => (
                      <label key={moduleKey} className="rounded-sm bg-zinc-50 p-3 text-xs">
                        <span className="mb-2 block font-medium text-zinc-800">{getPermissionModuleLabel(moduleKey)}</span>
                        <select
                          value={moduleConfigs[moduleKey] ?? ""}
                          disabled={!canManageNotifications || savingModuleKey === moduleKey}
                          onChange={(event) => {
                            const rawValue = event.target.value;
                            void saveModuleLabelConfig(moduleKey, rawValue ? rawValue : null);
                          }}
                          className="h-9 w-full rounded-sm border-0 bg-white px-2 text-xs text-zinc-800 outline-none ring-1 ring-zinc-200 focus:ring-2 focus:ring-primary/30"
                        >
                          <option value="">Sin etiqueta</option>
                          {mailLabels.map((label) => (
                            <option key={label.id} value={label.id}>
                              {label.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                    {!canManageNotifications ? (
                      <p className="px-1 text-xs text-zinc-500">Solo lectura: falta permiso notifications.manage.</p>
                    ) : null}
                  </div>
                ) : null}
              </section>
            </aside>

            <main className="rounded-sm bg-white p-3">
              <div className="grid gap-2">
                {groupedPermissions.map((group) => {
                  const isOpen = openModules.has(group.module);
                  const selectedCount = group.permissions.filter((permission) => selectedCodes.has(permission.code)).length;

                  return (
                    <section key={group.module} className="overflow-hidden rounded-sm bg-zinc-50">
                      <button
                        type="button"
                        onClick={() => toggleModule(group.module)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-zinc-100/70"
                      >
                        <ChevronRight className={cn("h-4 w-4 text-zinc-400 transition", isOpen && "rotate-90")} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-zinc-900">{group.label}</p>
                          <p className="text-xs text-zinc-500">
                            {selectedCount} de {group.permissions.length} permisos marcados
                          </p>
                        </div>
                        <span className="rounded-sm bg-white px-2.5 py-1 text-xs text-zinc-600">
                          {group.permissions.length}
                        </span>
                      </button>

                      {isOpen ? (
                        <div className="grid gap-1 px-2 pb-2 md:grid-cols-2 2xl:grid-cols-3">
                          {group.permissions.map((permission) => {
                            const checked = selectedCodes.has(permission.code);
                            return (
                              <label
                                key={permission.code}
                                className={cn(
                                  "flex cursor-pointer items-start gap-3 rounded-sm bg-white px-3 py-2.5 transition",
                                  checked ? "text-zinc-950" : "text-zinc-500",
                                )}
                              >
                                <Checkbox
                                  checked={checked}
                                  disabled={!canAssignRolePermissions}
                                  onCheckedChange={() => togglePermission(permission.code)}
                                  className="mt-0.5"
                                />
                                <span className="min-w-0">
                                  <span className="flex items-center gap-2">
                                    <span className="truncate text-sm font-medium">{getPermissionLabel(permission)}</span>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Info className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="max-w-xs text-xs">
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
            </main>
          </div>
        </div>
      </TooltipProvider>
    </PageShell>
  );
}
