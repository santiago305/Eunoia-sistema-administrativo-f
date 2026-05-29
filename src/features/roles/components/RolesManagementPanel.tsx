import { Pencil, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { Modal } from "@/shared/components/modales/Modal";
import type { RoleOption } from "@/features/roles/types/rolesPermissions.types";
import { getRoleLabel } from "@/features/roles/utils/rolesPermissions.utils";

type RolesManagementPanelProps = {
  roles: RoleOption[];
  canEditRoles: boolean;
  canDeleteRoles: boolean;
  saving: boolean;
  onRenameRole: (roleId: string, description: string) => Promise<void>;
  onDeactivateRole: (params: {
    roleId: string;
    replacementRoleId: string;
    confirmationText: string;
  }) => Promise<void>;
};

export function RolesManagementPanel({
  roles,
  canEditRoles,
  canDeleteRoles,
  saving,
  onRenameRole,
  onDeactivateRole,
}: RolesManagementPanelProps) {
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [deletingRoleId, setDeletingRoleId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [replacementRoleId, setReplacementRoleId] = useState("");
  const [confirmationText, setConfirmationText] = useState("");

  const editingRole = useMemo(
    () => roles.find((role) => role.id === editingRoleId) ?? null,
    [roles, editingRoleId],
  );
  const deletingRole = useMemo(
    () => roles.find((role) => role.id === deletingRoleId) ?? null,
    [roles, deletingRoleId],
  );
  const replacementOptions = useMemo(
    () =>
      roles
        .filter((role) => role.id !== deletingRoleId)
        .map((role) => ({
          value: role.id,
          label: getRoleLabel(role.description),
        })),
    [deletingRoleId, roles],
  );

  const expectedConfirmationText = deletingRole ? `Eliminar ${deletingRole.description}` : "";

  return (
    <section className="mt-4 border-t border-zinc-200/70 pt-4 xl:mt-5">
      <div className="px-1">
        <p className="text-sm font-semibold text-zinc-950">Roles</p>
        <p className="mt-0.5 text-xs text-zinc-500">Editar nombre o desactivar rol con reasignación.</p>
      </div>

      <div className="mt-2 space-y-1.5">
        {roles.map((role) => (
          <div
            key={role.id}
            className="flex items-center justify-between gap-2 rounded-sm border border-zinc-100 bg-white px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-zinc-900">{getRoleLabel(role.description)}</p>
              {role.createdByUserName || role.createdByUserId ? (
                <p className="truncate text-[11px] text-zinc-500">
                  Creado por: {role.createdByUserName || role.createdByUserId}
                </p>
              ) : null}
            </div>

            <div className="flex items-center gap-1">
              {canEditRoles ? (
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-sm text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
                  onClick={() => {
                    setEditingRoleId(role.id);
                    setEditValue(role.description);
                  }}
                  title="Editar rol"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              ) : null}

              {canDeleteRoles ? (
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-sm text-red-500 transition hover:bg-red-50 hover:text-red-700"
                  onClick={() => {
                    setDeletingRoleId(role.id);
                    setReplacementRoleId("");
                    setConfirmationText("");
                  }}
                  title="Desactivar rol"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={Boolean(editingRole)}
        onClose={() => setEditingRoleId(null)}
        title="Editar rol"
        description="Actualiza nombre del rol."
        className="w-[min(560px,calc(100vw-2rem))] rounded-sm border border-zinc-100"
        headerClassName="border-b-0 bg-white px-5 pt-5 pb-2"
        bodyClassName="px-5 pb-5 pt-2"
      >
        <div className="space-y-4">
          <FloatingInput
            label="Nombre del rol"
            name="edit-role-description"
            value={editValue}
            onChange={(event) => setEditValue(event.target.value)}
          />
          <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4">
            <SystemButton variant="outline" onClick={() => setEditingRoleId(null)} disabled={saving}>
              Cancelar
            </SystemButton>
            <SystemButton
              variant="primary"
              loading={saving}
              onClick={() => {
                if (!editingRole) return;
                void (async () => {
                  try {
                    await onRenameRole(editingRole.id, editValue.trim());
                    setEditingRoleId(null);
                  } catch {
                    // handled in parent
                  }
                })();
              }}
            >
              Guardar
            </SystemButton>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(deletingRole)}
        onClose={() => setDeletingRoleId(null)}
        title="Desactivar rol"
        description="Antes de desactivar, reasigna usuarios y confirma acción."
        className="w-[min(620px,calc(100vw-2rem))] rounded-sm border border-zinc-100"
        headerClassName="border-b-0 bg-white px-5 pt-5 pb-2"
        bodyClassName="px-5 pb-5 pt-2"
      >
        <div className="space-y-4">
          <p className="rounded-sm bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Usuarios del rol actual pasarán al rol seleccionado.
          </p>

          <FloatingSelect
            label="Rol de reemplazo"
            name="role-replacement"
            value={replacementRoleId}
            options={replacementOptions}
            onChange={setReplacementRoleId}
            placeholder="Selecciona rol"
          />

          <FloatingInput
            label={`Escribe: ${expectedConfirmationText}`}
            name="deactivate-role-confirmation"
            value={confirmationText}
            onChange={(event) => setConfirmationText(event.target.value)}
          />

          <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4">
            <SystemButton variant="outline" onClick={() => setDeletingRoleId(null)} disabled={saving}>
              Cancelar
            </SystemButton>
            <SystemButton
              variant="danger"
              loading={saving}
              disabled={!replacementRoleId || confirmationText.trim() !== expectedConfirmationText}
              onClick={() => {
                if (!deletingRole) return;
                void (async () => {
                  try {
                    await onDeactivateRole({
                      roleId: deletingRole.id,
                      replacementRoleId,
                      confirmationText: confirmationText.trim(),
                    });
                    setDeletingRoleId(null);
                  } catch {
                    // handled in parent
                  }
                })();
              }}
            >
              Desactivar rol
            </SystemButton>
          </div>
        </div>
      </Modal>
    </section>
  );
}
