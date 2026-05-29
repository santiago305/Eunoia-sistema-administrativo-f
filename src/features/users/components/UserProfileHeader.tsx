import { KeyRound, Power, RotateCcw, ShieldCheck } from "lucide-react";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { cn, getInitials, getRoleLabel, roleTone } from "./usersPage.helpers";
import type { User } from "../types/users.types";

type UserProfileHeaderProps = {
  selected: User;
  selectedIsDeleted: boolean;
  canDeleteUsers: boolean;
  canRestoreUsers: boolean;
  togglingStatus: boolean;
  selectedCanManageGrantablePermissions: boolean;
  actorCanManageGrantablePermissions: boolean;
  onOpenPermissions: () => void;
  onOpenGrantablePermissions: () => void;
  onDeactivate: () => void;
  onRestore: () => void;
};

export function UserProfileHeader({
  selected,
  selectedIsDeleted,
  canDeleteUsers,
  canRestoreUsers,
  togglingStatus,
  selectedCanManageGrantablePermissions,
  actorCanManageGrantablePermissions,
  onOpenPermissions,
  onOpenGrantablePermissions,
  onDeactivate,
  onRestore,
}: UserProfileHeaderProps) {
  return (
    <div className="flex w-full flex-col gap-4 border-b border-zinc-100 py-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-sm bg-gradient-to-br from-primary/15 via-primary/5 to-transparent text-base font-semibold text-primary ring-1 ring-primary/15">
          {getInitials(selected.name)}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-sm px-2 py-0.5 text-[11px] font-medium ring-1",
                selectedIsDeleted ? "bg-red-50 text-red-700 ring-red-100" : "bg-emerald-50 text-emerald-700 ring-emerald-100",
              )}
            >
              {selectedIsDeleted ? "Desactivado" : "Activo"}
            </span>
            <span className={cn("rounded-sm px-2 py-0.5 text-[11px] font-medium ring-1", roleTone(selected.role))}>
              {getRoleLabel(selected.role)}
            </span>
          </div>
          <h2 className="mt-2 truncate text-xl font-semibold tracking-tight text-zinc-950 sm:text-2xl">{selected.name}</h2>
          <p className="mt-1 truncate text-sm text-zinc-500">{selected.email}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 lg:justify-end">
        <SystemButton variant="secondary" leftIcon={<KeyRound className="h-4 w-4" />} onClick={onOpenPermissions}>
          Permisos
        </SystemButton>

        {selectedCanManageGrantablePermissions ? (
          <SystemButton
            variant="outline"
            disabled={!actorCanManageGrantablePermissions}
            leftIcon={<ShieldCheck className="h-4 w-4" />}
            onClick={onOpenGrantablePermissions}
          >
            Permisos que puede dar
          </SystemButton>
        ) : null}

        {!selectedIsDeleted && canDeleteUsers ? (
          <SystemButton
            variant="danger"
            loading={togglingStatus}
            leftIcon={<Power className="h-4 w-4" />}
            onClick={onDeactivate}
          >
            Desactivar
          </SystemButton>
        ) : null}

        {selectedIsDeleted && canRestoreUsers ? (
          <SystemButton
            variant="success"
            loading={togglingStatus}
            leftIcon={<RotateCcw className="h-4 w-4" />}
            onClick={onRestore}
          >
            Activar
          </SystemButton>
        ) : null}
      </div>
    </div>
  );
}
