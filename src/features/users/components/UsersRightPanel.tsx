import { Database, KeyRound, Minus, Plus, Power, RotateCcw, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { SystemButton } from "@/shared/components/components/SystemButton";
import type {
  AccessPermissionItem,
  PermissionEffect,
  UserPermissionOverride,
} from "@/shared/services/accessControlService";
import { ROLE_LABELS, RoleType } from "../types/roles.types";
import type { Role, User } from "../types/users.types";
import { formatDateTimeLabel } from "../utils/dateFormat";
import { UserPermissionsModal } from "./UserPermissionsModal";

const ROLES = Object.values(RoleType) as Role[];

const cn = (...s: Array<string | false | null | undefined>) => s.filter(Boolean).join(" ");

function getRoleLabel(role: string) {
  return ROLE_LABELS[role as Role] ?? role.replace(/[._-]+/g, " ");
}

function DetailLine({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-400">{label}</p>
      <p className="mt-1 truncate text-sm text-zinc-800">{value || "-"}</p>
    </div>
  );
}

interface UsersRightPanelProps {
  selected: User | null;
  roleDraft: Role;
  setRoleDraft: (role: Role) => void;
  savingRole: boolean;
  saveRole: () => Promise<void>;
  canEditRole: boolean;
  togglingStatus: boolean;
  deactivateUser: () => Promise<void>;
  restoreUser: () => Promise<void>;
  canDeleteUser: boolean;
  canRestoreUser: boolean;
  effectivePermissions: string[];
  permissionOverrides: UserPermissionOverride[];
  allPermissions: AccessPermissionItem[];
  savingOverride: boolean;
  savePermissionOverride: (permissionCode: string, effect: PermissionEffect, reason?: string) => Promise<void>;
  deletePermissionOverride: (permissionCode: string) => Promise<void>;
  canManageOverrides: boolean;
  mailStorageQuotaGbDraft: number;
  setMailStorageQuotaGbDraft: (value: number) => void;
  savingMailStorageQuota: boolean;
  saveMailStorageQuota: () => Promise<void>;
  canEditMailStorageQuota: boolean;
  mailStorageUsedPercent?: number;
  mailStorageUsedLabel?: string;
}

export function UsersRightPanel({
  selected,
  roleDraft,
  setRoleDraft,
  savingRole,
  saveRole,
  canEditRole,
  togglingStatus,
  deactivateUser,
  restoreUser,
  canDeleteUser,
  canRestoreUser,
  effectivePermissions,
  permissionOverrides,
  allPermissions,
  savingOverride,
  savePermissionOverride,
  deletePermissionOverride,
  canManageOverrides,
  mailStorageQuotaGbDraft,
  setMailStorageQuotaGbDraft,
  savingMailStorageQuota,
  saveMailStorageQuota,
  canEditMailStorageQuota,
  mailStorageUsedPercent,
  mailStorageUsedLabel,
}: UsersRightPanelProps) {
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const isDeleted = Boolean(selected?.deleted || selected?.deletedAt);
  const allowedOverrides = useMemo(
    () => permissionOverrides.filter((item) => item.effect === "ALLOW").length,
    [permissionOverrides],
  );
  const deniedOverrides = useMemo(
    () => permissionOverrides.filter((item) => item.effect === "DENY").length,
    [permissionOverrides],
  );

  const changeQuota = (direction: 1 | -1) => {
    const next = Math.max(1, Math.min(5, Number(mailStorageQuotaGbDraft) + direction));
    setMailStorageQuotaGbDraft(next);
  };

  if (!selected) {
    return (
      <section className="flex h-full min-h-[420px] items-center justify-center rounded-sm bg-white">
        <div className="max-w-xs text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-sm bg-primary/10">
            <ShieldCheck className="h-6 w-6 text-zinc-500" />
          </div>
          <p className="mt-4 text-sm font-semibold text-zinc-900">Selecciona un usuario</p>
          <p className="mt-1 text-sm leading-6 text-zinc-500">
            Aqui veras sus datos, cuota y permisos directos.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="h-full rounded-sm bg-white">
      <div className="flex h-full flex-col p-5">
        <div className="flex flex-col gap-4 border-b border-zinc-100 pb-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "rounded-sm px-2.5 py-1 text-xs font-medium",
                  isDeleted ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700",
                )}
              >
                {isDeleted ? "Desactivado" : "Activo"}
              </span>
              <span className="rounded-sm bg-primary/10 px-2.5 py-1 text-xs font-medium text-zinc-800">
                {getRoleLabel(selected.role)}
              </span>
            </div>
            <h2 className="mt-3 truncate text-2xl font-semibold tracking-tight text-zinc-950">
              {selected.name}
            </h2>
            <p className="mt-1 truncate text-sm text-zinc-500">{selected.email}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <SystemButton
              variant="secondary"
              leftIcon={<KeyRound className="h-4 w-4" />}
              onClick={() => setPermissionsOpen(true)}
            >
              Permisos
            </SystemButton>

            {!isDeleted && canDeleteUser ? (
              <SystemButton
                variant="danger"
                loading={togglingStatus}
                leftIcon={<Power className="h-4 w-4" />}
                onClick={() => void deactivateUser()}
              >
                Desactivar
              </SystemButton>
            ) : null}

            {isDeleted && canRestoreUser ? (
              <SystemButton
                variant="success"
                loading={togglingStatus}
                leftIcon={<RotateCcw className="h-4 w-4" />}
                onClick={() => void restoreUser()}
              >
                Activar
              </SystemButton>
            ) : null}
          </div>
        </div>

        <div className="grid gap-5 py-5 xl:grid-cols-[1fr_310px]">
          <div className="grid content-start gap-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <DetailLine label="Telefono" value={selected.phone} />
              <DetailLine label="Creado" value={formatDateTimeLabel(selected.createdAt)} />
              <DetailLine label="Actualizado" value={formatDateTimeLabel(selected.updatedAt)} />
            </div>

            {canEditRole ? (
              <div className="rounded-sm bg-zinc-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-400">Rol</p>
                    <select
                      value={roleDraft}
                      onChange={(event) => setRoleDraft(event.target.value as Role)}
                      className="mt-2 h-11 w-full rounded-sm border-0 bg-white px-3 text-sm text-zinc-900 outline-none ring-1 ring-zinc-200 transition focus:ring-2 focus:ring-primary/30"
                    >
                      {ROLES.map((role) => (
                        <option key={role} value={role}>
                          {getRoleLabel(role)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <SystemButton
                    variant="secondary"
                    loading={savingRole}
                    disabled={roleDraft === selected.role}
                    onClick={() => void saveRole()}
                  >
                    Guardar rol
                  </SystemButton>
                </div>
              </div>
            ) : null}

            <div className="rounded-sm bg-zinc-50 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-400">Permisos</p>
                  <p className="mt-2 text-sm text-zinc-600">
                    {effectivePermissions.length} efectivos, {allowedOverrides} extras y {deniedOverrides} denegados.
                  </p>
                </div>
                <SystemButton
                  variant="outline"
                  size="sm"
                  onClick={() => setPermissionsOpen(true)}
                >
                  Administrar
                </SystemButton>
              </div>
            </div>
          </div>

          <aside className="rounded-sm bg-primary/5 p-4">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Almacenamiento</p>
            </div>
            <p className="mt-4 text-4xl font-semibold leading-none text-zinc-950">{mailStorageQuotaGbDraft} GB</p>
            <p className="mt-2 text-sm text-zinc-500">{mailStorageUsedLabel ?? "Sin uso registrado"}</p>

            <div className="mt-5 h-2 overflow-hidden rounded-sm bg-zinc-200">
              <div
                className="h-full rounded-sm bg-primary transition-all"
                style={{
                  width: `${Math.max(0, Math.min(100, Math.round(mailStorageUsedPercent ?? 0)))}%`,
                }}
              />
            </div>

            {canEditMailStorageQuota ? (
              <>
                <div className="mt-5 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => changeQuota(-1)}
                    disabled={savingMailStorageQuota || mailStorageQuotaGbDraft <= 1}
                    className="grid h-10 w-10 place-items-center rounded-sm bg-white text-zinc-700 ring-1 ring-zinc-200 transition hover:bg-zinc-50 disabled:opacity-35"
                    title="Bajar almacenamiento"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    step={1}
                    value={mailStorageQuotaGbDraft}
                    onChange={(event) => setMailStorageQuotaGbDraft(Number(event.target.value))}
                    className="h-2 flex-1 accent-primary"
                    aria-label="Cuota de almacenamiento"
                  />
                  <button
                    type="button"
                    onClick={() => changeQuota(1)}
                    disabled={savingMailStorageQuota || mailStorageQuotaGbDraft >= 5}
                    className="grid h-10 w-10 place-items-center rounded-sm bg-white text-zinc-700 ring-1 ring-zinc-200 transition hover:bg-zinc-50 disabled:opacity-35"
                    title="Subir almacenamiento"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <SystemButton
                  className="mt-4"
                  fullWidth
                  variant="primary"
                  loading={savingMailStorageQuota}
                  onClick={() => void saveMailStorageQuota()}
                >
                  Guardar cuota
                </SystemButton>
              </>
            ) : null}
          </aside>
        </div>
      </div>

      <UserPermissionsModal
        open={permissionsOpen}
        onClose={() => setPermissionsOpen(false)}
        selected={selected}
        allPermissions={allPermissions}
        effectivePermissions={effectivePermissions}
        permissionOverrides={permissionOverrides}
        savingOverride={savingOverride}
        savePermissionOverride={savePermissionOverride}
        deletePermissionOverride={deletePermissionOverride}
        canManageOverrides={canManageOverrides}
      />
    </section>
  );
}
