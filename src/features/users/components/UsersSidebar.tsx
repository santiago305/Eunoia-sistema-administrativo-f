import { UserListItem } from "./UserListItem";
import { UsersEmptyState } from "./UsersEmptyState";
import type { User } from "../types/users.types";

type UsersSidebarProps = {
  loading: boolean;
  total: number;
  users: User[];
  selectedId: string | null;
  usersError: string;
  onSelectUser: (id: string) => void;
};

export function UsersSidebar({
  loading,
  total,
  users,
  selectedId,
  usersError,
  onSelectUser,
}: UsersSidebarProps) {
  return (
    <aside className="min-h-[320px] w-full border-b border-zinc-100 lg:min-h-0 lg:border-b-0 lg:border-r">
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-zinc-100 py-3 pr-0 lg:pr-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-zinc-950">Lista de usuarios</p>
            <p className="mt-0.5 text-xs text-zinc-500">
              {loading ? "Cargando..." : `${total} resultados`}
            </p>
          </div>
          <span className="text-xs text-zinc-400">/ para buscar</span>
        </div>

        <div className="min-h-0 flex-1 overflow-auto pr-0 lg:pr-4">
          {users.length ? (
            <div className="divide-y divide-zinc-100">
              {users.map((user) => (
                <UserListItem
                  key={user.id}
                  user={user}
                  isActive={user.id === selectedId}
                  onSelect={onSelectUser}
                />
              ))}
            </div>
          ) : (
            <UsersEmptyState
              className="h-full min-h-[360px]"
              title="No hay usuarios para mostrar"
              description={usersError || "Cambia el filtro, limpia la busqueda o crea un nuevo usuario."}
            />
          )}
        </div>
      </div>
    </aside>
  );
}
