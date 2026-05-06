import { useEffect, useMemo, useState } from "react";
import { PageTitle } from "@/shared/components/components/PageTitle";
import { findAllRoles } from "@/shared/services/roleService";
import {
  assignPermissionsToRole,
  listAccessPermissions,
  listRolePermissions,
  type AccessPermissionItem,
} from "@/shared/services/accessControlService";
import { useFlashMessage } from "@/shared/hooks/useFlashMessage";
import { usePermissions } from "@/shared/hooks/usePermissions";
import { errorResponse, successResponse } from "@/shared/common/utils/response";

type RoleOption = { id: string; description: string };

const groupByModule = (permissions: AccessPermissionItem[]) => {
  const grouped = new Map<string, AccessPermissionItem[]>();
  for (const permission of permissions) {
    const key = permission.module || "general";
    const current = grouped.get(key) ?? [];
    current.push(permission);
    grouped.set(key, current);
  }
  return Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b));
};

export default function RolesPermissions() {
  const { showFlash, clearFlash } = useFlashMessage();
  const { can } = usePermissions();
  const canAssignRolePermissions = can("roles.assign_permissions");
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [selectedRoleDescription, setSelectedRoleDescription] = useState("");
  const [allPermissions, setAllPermissions] = useState<AccessPermissionItem[]>([]);
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadInitial = async () => {
      try {
        const [rolesData, permissionsData] = await Promise.all([
          findAllRoles(),
          listAccessPermissions(),
        ]);
        if (cancelled) return;
        const normalizedRoles = (rolesData ?? []).map((role) => ({
          id: String(role.id),
          description: String(role.description ?? "").toLowerCase(),
        }));
        setRoles(normalizedRoles);
        setAllPermissions(permissionsData ?? []);
        const firstRole = normalizedRoles[0];
        if (firstRole) {
          setSelectedRoleId(firstRole.id);
          setSelectedRoleDescription(firstRole.description);
        }
      } catch {
        if (!cancelled) showFlash(errorResponse("No se pudo cargar roles/permisos."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void loadInitial();
    return () => {
      cancelled = true;
    };
  }, [showFlash]);

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
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const saveMatrix = async () => {
    if (!selectedRoleId) return;
    clearFlash();
    setSaving(true);
    try {
      await assignPermissionsToRole(selectedRoleId, Array.from(selectedCodes));
      showFlash(successResponse("Permisos del rol actualizados."));
    } catch {
      showFlash(errorResponse("No se pudieron actualizar permisos del rol."));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-zinc-600">Cargando matriz de permisos...</div>;
  }

  return (
    <div className="w-full bg-gradient-to-b from-white via-white to-zinc-50 py-4 sm:py-6 2xl:py-8">
      <PageTitle title="Matriz de permisos por rol" />
      <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">Delegación por rol</h2>
              <p className="text-xs text-zinc-500">Selecciona un rol y marca sus permisos base.</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedRoleId}
                onChange={(e) => {
                  const nextId = e.target.value;
                  setSelectedRoleId(nextId);
                  const match = roles.find((role) => role.id === nextId);
                  setSelectedRoleDescription(match?.description ?? "");
                }}
                className="h-9 rounded-xl border border-zinc-200 bg-white px-3 text-xs"
              >
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.description}
                  </option>
                ))}
              </select>
              <button
                onClick={saveMatrix}
                disabled={saving || !selectedRoleId || !canAssignRolePermissions}
                className="h-9 rounded-xl bg-zinc-900 px-3 text-xs font-medium text-white disabled:opacity-60"
              >
                {saving ? "Guardando..." : "Guardar matriz"}
              </button>
            </div>
          </div>
          {!canAssignRolePermissions ? (
            <p className="mt-2 text-xs text-zinc-500">Solo lectura: falta permiso `roles.assign_permissions`.</p>
          ) : null}
        </div>

        <div className="mt-4 grid gap-3">
          {groupedPermissions.map(([module, permissions]) => (
            <section key={module} className="rounded-2xl border border-zinc-200 bg-white p-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">{module}</h3>
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {permissions.map((permission) => {
                  const checked = selectedCodes.has(permission.code);
                  return (
                    <label
                      key={permission.code}
                      className="flex cursor-pointer items-start gap-2 rounded-xl border border-zinc-200 p-2 text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!canAssignRolePermissions}
                        onChange={() => togglePermission(permission.code)}
                        className="mt-0.5"
                      />
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-zinc-800">{permission.code}</span>
                        <span className="block text-zinc-500">{permission.name}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        {selectedRoleDescription ? (
          <p className="mt-3 text-xs text-zinc-500">
            Rol actual: <span className="font-medium text-zinc-700">{selectedRoleDescription}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}

