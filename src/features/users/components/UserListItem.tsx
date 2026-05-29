import { cn, getInitials, getRoleLabel, roleTone } from "./usersPage.helpers";
import type { User } from "../types/users.types";

type UserListItemProps = {
  user: User;
  isActive: boolean;
  onSelect: (id: string) => void;
};

export function UserListItem({ user, isActive, onSelect }: UserListItemProps) {
  const isDeleted = Boolean(user.deleted || user.deletedAt);

  return (
    <button
      type="button"
      onClick={() => onSelect(user.id)}
      className={cn(
        "group relative flex w-full min-w-0 items-start gap-3 px-3 py-3 text-left transition-colors duration-150 focus:outline-none focus-visible:bg-zinc-50",
        isActive ? "bg-primary/[0.04]" : "bg-white hover:bg-zinc-50",
      )}
    >
      {isActive ? <span className="absolute left-0 top-3 h-[calc(100%-1.5rem)] w-1 rounded-sm bg-primary" /> : null}

      <span
        className={cn(
          "grid h-9 w-9 shrink-0 place-items-center rounded-sm text-xs font-semibold ring-1 transition-colors duration-150",
          isActive ? "bg-primary/10 text-primary ring-primary/20" : "bg-white text-zinc-500 ring-zinc-100 group-hover:ring-zinc-200",
        )}
      >
        {getInitials(user.name)}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-start justify-between gap-2">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-zinc-900">{user.name}</span>
            <span className="mt-0.5 block truncate text-xs text-zinc-500">{user.email}</span>
          </span>
          <span className={cn("max-w-[118px] shrink-0 truncate rounded-sm px-2 py-0.5 text-[11px] font-medium ring-1", roleTone(user.role))}>
            {getRoleLabel(user.role)}
          </span>
        </span>

        <span className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-zinc-400">
          <span className="truncate">{user.phone || "Sin telefono"}</span>
          {isDeleted ? <span className="text-red-500">Desactivado</span> : <span className="text-emerald-600">Activo</span>}
        </span>
      </span>
    </button>
  );
}
