import { ChevronLeft, ChevronRight, Search, UserPlus } from "lucide-react";
import { cn } from "./usersPage.helpers";
import type { UserListStatus } from "../types/users.types";

type UsersPageHeaderProps = {
  totalUsers: number;
  query: string;
  onQueryChange: (value: string) => void;
  canCreate: boolean;
  onOpenCreateModal: () => void;
  status: UserListStatus;
  onStatusChange: (nextStatus: UserListStatus) => void;
  safePage: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
  onPrevPage: () => void;
  onNextPage: () => void;
};

export function UsersPageHeader({
  totalUsers,
  query,
  onQueryChange,
  canCreate,
  onOpenCreateModal,
  status,
  onStatusChange,
  safePage,
  totalPages,
  hasPrev,
  hasNext,
  onPrevPage,
  onNextPage,
}: UsersPageHeaderProps) {
  return (
    <div className="w-full border-b border-zinc-100 pb-3">
      <div className="flex w-full flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
            <span className="uppercase tracking-[0.16em]">Cuentas</span>
            <span className="text-zinc-300">/</span>
            <span>{totalUsers} usuarios</span>
          </div>
          <p className="mt-1 text-xl font-semibold tracking-tight text-zinc-950 sm:text-2xl">Usuarios</p>
        </div>

        <div className="grid w-full gap-2 sm:grid-cols-[minmax(0,1fr)_auto] xl:max-w-[720px]">
          <div className="relative min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              id="users-search"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Buscar usuario, correo o telefono..."
              className="h-10 w-full rounded-sm border-0 bg-zinc-50 pl-9 pr-3 text-sm text-zinc-800 outline-none ring-1 ring-zinc-100 transition focus:bg-white focus:ring-2 focus:ring-primary/25"
            />
          </div>

          {canCreate ? (
            <button
              type="button"
              onClick={onOpenCreateModal}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-sm bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:brightness-110 active:scale-[0.99]"
            >
              <UserPlus className="h-4 w-4" />
              Nuevo usuario
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex w-full flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid w-full grid-cols-2 gap-1 rounded-sm bg-zinc-50 p-1 sm:w-[260px]">
          {([
            { key: "active", label: "Activos" },
            { key: "inactive", label: "Eliminados" },
          ] as const).map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => onStatusChange(option.key)}
              className={cn(
                "h-8 rounded-sm px-2 text-xs font-medium transition",
                status === option.key ? "bg-white text-zinc-950 shadow-sm ring-1 ring-zinc-100" : "text-zinc-500 hover:text-zinc-800",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 text-xs text-zinc-500 sm:justify-end">
          <span>
            Pagina <span className="font-medium text-zinc-800">{safePage}</span> de{" "}
            <span className="font-medium text-zinc-800">{totalPages}</span>
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onPrevPage}
              disabled={!hasPrev}
              className="grid h-8 w-8 place-items-center rounded-sm text-zinc-600 ring-1 ring-zinc-100 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:text-zinc-300"
              aria-label="Pagina anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onNextPage}
              disabled={!hasNext}
              className="grid h-8 w-8 place-items-center rounded-sm text-zinc-600 ring-1 ring-zinc-100 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:text-zinc-300"
              aria-label="Pagina siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
