import { useEffect, useMemo, useState } from "react";
import { isAxiosError } from "axios";
import { RolesPermissionsHeader } from "@/features/roles/components/RolesPermissionsHeader";
import { RoleModuleConfigPanel } from "@/features/roles/components/RoleModuleConfigPanel";
import { RolePermissionsMatrix } from "@/features/roles/components/RolePermissionsMatrix";
import { RolesPermissionsSkeleton } from "@/features/roles/components/RolesPermissionsSkeleton";
import { CreateRoleModal } from "@/features/roles/components/CreateRoleModal";
import { RolesManagementPanel } from "@/features/roles/components/RolesManagementPanel";
import type {
  ModuleLabelConfigItem,
  ModuleLabelConfigMap,
  RoleOption,
  VisibleMailLabelItem,
} from "@/features/roles/types/rolesPermissions.types";
import {
  MODULE_LABEL_KEYS,
  getPercent,
  groupByModule,
} from "@/features/roles/utils/rolesPermissions.utils";
import { useFeedbackToast } from "@/shared/hooks/useFeedbackToast";
import { usePermissions } from "@/shared/hooks/usePermissions";
import { errorResponse, successResponse } from "@/shared/common/utils/response";
import { PageShell } from "@/shared/layouts/PageShell";
import { createRole, deactivateRole, findAllRoles, updateRole } from "@/shared/services/roleService";
import {
  assignPermissionsToRole,
  listAccessPermissions,
  listRolePermissions,
  type AccessPermissionItem,
} from "@/shared/services/accessControlService";
import {
  listMailLabels,
  listModuleLabelConfigs,
  upsertModuleLabelConfig,
} from "@/features/mail/services/messages.service";
import { getPermissionModuleLabel } from "@/features/users/utils/permissionPresentation";
import { TooltipProvider } from "@/shared/components/ui/tooltip";

type BackendErrorPayload = { message?: string | string[] };

const getSafeErrorMessage = (error: unknown, fallback: string) => {
  if (!isAxiosError<BackendErrorPayload>(error)) return fallback;
  const message = error.response?.data?.message;
  const resolved = Array.isArray(message) ? message[0] : message;
  return typeof resolved === "string" && resolved.trim() ? resolved.trim() : fallback;
};

export default function RolesPermissions() {
  const { showFeedback, clearFeedback } = useFeedbackToast();
  const { can } = usePermissions();
  const canAssignRolePermissions = can("roles.assign_permissions");
  const canCreateRoles = can("roles.create");
  const canUpdateRoles = can("roles.update");
  const canDeleteRoles = can("roles.delete");
  const canManageNotifications = can("notifications.manage");

  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [selectedRoleDescription, setSelectedRoleDescription] = useState("");
  const [allPermissions, setAllPermissions] = useState<AccessPermissionItem[]>([]);
  const [mailLabels, setMailLabels] = useState<VisibleMailLabelItem[]>([]);
  const [moduleConfigs, setModuleConfigs] = useState<ModuleLabelConfigMap>({});
  const [savingModuleKey, setSavingModuleKey] = useState<string | null>(null);
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());
  const [openModules, setOpenModules] = useState<Set<string>>(new Set());
  const [configsOpen, setConfigsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [createRoleOpen, setCreateRoleOpen] = useState(false);
  const [creatingRole, setCreatingRole] = useState(false);
  const [savingRoleCrud, setSavingRoleCrud] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadInitial = async () => {
      try {
        const [rolesData, permissionsData, labelsData, configsData] = await Promise.all([
          findAllRoles(),
          canAssignRolePermissions ? listAccessPermissions().catch(() => []) : Promise.resolve([]),
          canManageNotifications ? listMailLabels().catch(() => []) : Promise.resolve([]),
          canManageNotifications ? listModuleLabelConfigs().catch(() => []) : Promise.resolve([]),
        ]);

        if (cancelled) return;

        const normalizedRoles = (rolesData ?? [])
          .filter((role) => !role.deleted)
          .map((role) => ({
          id: String(role.id),
          description: String(role.description ?? "").toLowerCase(),
          createdByUserId: (role as { createdByUserId?: string | null }).createdByUserId ?? null,
          createdByUserName: (role as { createdByUserName?: string | null }).createdByUserName ?? null,
          }));

        const configMap: ModuleLabelConfigMap = {};
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
      } catch (error) {
        if (!cancelled) showFeedback(errorResponse(getSafeErrorMessage(error, "No se pudo cargar permisos.")));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadInitial();

    return () => {
      cancelled = true;
    };
  }, [canAssignRolePermissions, canManageNotifications, showFeedback]);

  useEffect(() => {
    let cancelled = false;

    const loadRolePermissions = async () => {
      if (!canAssignRolePermissions) {
        setSelectedCodes(new Set());
        return;
      }
      if (!selectedRoleId) {
        setSelectedCodes(new Set());
        return;
      }

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
  }, [canAssignRolePermissions, selectedRoleId]);

  const groupedPermissions = useMemo(() => groupByModule(allPermissions), [allPermissions]);
  const selectedRoleMeta = useMemo(
    () => roles.find((role) => role.id === selectedRoleId) ?? null,
    [roles, selectedRoleId],
  );

  const reloadRoles = async () => {
    const rolesData = await findAllRoles({ status: "all" });
    const normalizedRoles = (rolesData ?? [])
      .filter((role) => !role.deleted)
      .map((role) => ({
      id: String(role.id),
      description: String(role.description ?? "").toLowerCase(),
      createdByUserId: (role as { createdByUserId?: string | null }).createdByUserId ?? null,
      createdByUserName: (role as { createdByUserName?: string | null }).createdByUserName ?? null,
      }));
    setRoles(normalizedRoles);
    const currentSelected = normalizedRoles.find((role) => role.id === selectedRoleId);
    if (currentSelected) {
      setSelectedRoleDescription(currentSelected.description);
    }
    return normalizedRoles;
  };

  const activeModules = useMemo(
    () =>
      groupedPermissions.filter((group) =>
        group.permissions.some((permission) => selectedCodes.has(permission.code)),
      ).length,
    [groupedPermissions, selectedCodes],
  );

  const totalPercent = getPercent(selectedCodes.size, allPermissions.length);

  const handleRoleChange = (nextId: string) => {
    setSelectedRoleId(nextId);
    const match = roles.find((role) => role.id === nextId);
    setSelectedRoleDescription(match?.description ?? "");
  };

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

  const toggleEveryPermissionInModule = (permissions: AccessPermissionItem[]) => {
    if (!canAssignRolePermissions) return;

    setSelectedCodes((prev) => {
      const next = new Set(prev);
      const allSelected = permissions.every((permission) => next.has(permission.code));

      permissions.forEach((permission) => {
        if (allSelected) next.delete(permission.code);
        else next.add(permission.code);
      });

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
    } catch (error) {
      showFeedback(errorResponse(getSafeErrorMessage(error, "No se pudieron actualizar permisos del rol.")));
    } finally {
      setSaving(false);
    }
  };

  const saveModuleLabelConfig = async (moduleKey: string, nextLabelId: string | null) => {
    if (!canManageNotifications) return;
    if ((moduleConfigs[moduleKey] ?? null) === nextLabelId) return;

    setSavingModuleKey(moduleKey);

    try {
      await upsertModuleLabelConfig(moduleKey, nextLabelId);
      setModuleConfigs((prev) => ({ ...prev, [moduleKey]: nextLabelId }));
      showFeedback(successResponse(`Configuración guardada para ${getPermissionModuleLabel(moduleKey)}.`));
    } catch {
      showFeedback(errorResponse(`No se pudo guardar la etiqueta de ${getPermissionModuleLabel(moduleKey)}.`));
    } finally {
      setSavingModuleKey(null);
    }
  };

  const handleCreateRole = async (description: string) => {
    clearFeedback();
    setCreatingRole(true);

    try {
      const result = await createRole({ description });
      const updatedRoles = await reloadRoles();
      const createdRoleId =
        (result?.data && typeof result.data === "object" ? String(result.data.id ?? "") : "") || "";
      if (createdRoleId) {
        handleRoleChange(createdRoleId);
      } else {
        const createdRole = updatedRoles.find((role) => role.description === description.trim().toLowerCase());
        if (createdRole?.id) handleRoleChange(createdRole.id);
      }
      showFeedback(successResponse(result?.message || "Rol creado correctamente."));
      setCreateRoleOpen(false);
    } catch (error) {
      showFeedback(errorResponse(getSafeErrorMessage(error, "No se pudo crear el rol.")));
    } finally {
      setCreatingRole(false);
    }
  };

  const handleRenameRole = async (roleId: string, description: string) => {
    if (!description.trim()) {
      showFeedback(errorResponse("Nombre de rol requerido."));
      return;
    }
    setSavingRoleCrud(true);
    clearFeedback();
    try {
      const response = await updateRole(roleId, { description: description.trim() });
      await reloadRoles();
      showFeedback(successResponse(response?.message || "Rol actualizado correctamente."));
    } catch (error) {
      showFeedback(errorResponse(getSafeErrorMessage(error, "No se pudo actualizar rol.")));
      throw new Error("rename_role_failed");
    } finally {
      setSavingRoleCrud(false);
    }
  };

  const handleDeactivateRole = async (params: {
    roleId: string;
    replacementRoleId: string;
    confirmationText: string;
  }) => {
    setSavingRoleCrud(true);
    clearFeedback();
    try {
      const response = await deactivateRole(params.roleId, {
        replacementRoleId: params.replacementRoleId,
        confirmationText: params.confirmationText,
      });
      const updatedRoles = await reloadRoles();
      if (selectedRoleId === params.roleId) {
        const fallbackRole = updatedRoles.find((role) => role.id === params.replacementRoleId) ?? updatedRoles[0];
        if (fallbackRole) handleRoleChange(fallbackRole.id);
      }
      showFeedback(successResponse(response?.message || "Rol desactivado correctamente."));
    } catch (error) {
      showFeedback(errorResponse(getSafeErrorMessage(error, "No se pudo desactivar rol.")));
      throw new Error("deactivate_role_failed");
    } finally {
      setSavingRoleCrud(false);
    }
  };

  if (loading) return <RolesPermissionsSkeleton />;

  return (
    <PageShell>
      <TooltipProvider delayDuration={120}>
        <div className="w-full space-y-5">
          <RolesPermissionsHeader
            roles={roles}
            selectedRoleId={selectedRoleId}
            selectedRoleDescription={selectedRoleDescription}
            selectedRoleCreatedByLabel={selectedRoleMeta?.createdByUserName ?? selectedRoleMeta?.createdByUserId ?? null}
            selectedCodesCount={selectedCodes.size}
            totalPermissionsCount={allPermissions.length}
            activeModules={activeModules}
            totalPercent={totalPercent}
            saving={saving}
            canAssignRolePermissions={canAssignRolePermissions}
            canCreateRoles={canCreateRoles}
            onRoleChange={handleRoleChange}
            onSave={saveMatrix}
            onCreateRole={() => setCreateRoleOpen(true)}
          />

          <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)] xl:items-start">
            <aside className="xl:sticky xl:top-4">
              <RoleModuleConfigPanel
                configsOpen={configsOpen}
                moduleConfigs={moduleConfigs}
                mailLabels={mailLabels}
                canManageNotifications={canManageNotifications}
                savingModuleKey={savingModuleKey}
                onToggleConfigs={() => setConfigsOpen((prev) => !prev)}
                onSaveModuleConfig={saveModuleLabelConfig}
              />
              <RolesManagementPanel
                roles={roles}
                canEditRoles={canUpdateRoles}
                canDeleteRoles={canDeleteRoles}
                saving={savingRoleCrud}
                onRenameRole={handleRenameRole}
                onDeactivateRole={handleDeactivateRole}
              />
            </aside>

            <main className="min-w-0">
              <RolePermissionsMatrix
                groupedPermissions={groupedPermissions}
                openModules={openModules}
                selectedCodes={selectedCodes}
                canAssignRolePermissions={canAssignRolePermissions}
                onToggleModule={toggleModule}
                onTogglePermission={togglePermission}
                onToggleEveryPermissionInModule={toggleEveryPermissionInModule}
              />
            </main>
          </div>
        </div>
      </TooltipProvider>

      <CreateRoleModal
        open={createRoleOpen}
        saving={creatingRole}
        onClose={() => setCreateRoleOpen(false)}
        onCreate={handleCreateRole}
      />
    </PageShell>
  );
}
