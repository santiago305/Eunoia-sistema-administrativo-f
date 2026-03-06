// src/hooks/useUsers.ts
import { useCallback, useEffect, useState } from "react";
import {
  findAll,
  findActives,
  findDesactive,
  deleteUser,
  restoreUser,
  type UserApiListItem,
} from "@/services/userService";
import { errorResponse, successResponse } from "@/common/utils/response";
import { useFlashMessage } from "@/hooks/useFlashMessage";

export type UserRow = {
  user_id: string;
  user_name: string;
  user_email: string;
  user_deleted: boolean;
  user_created_at: string;
  rol: string;
  roleId: string;
  avatarUrl?:string;
};

type ApiListResponse<T> = T[] | { data?: T[] } | undefined | null;

function normalizeList<T>(res: ApiListResponse<T>): T[] {
  if (Array.isArray(res)) return res;
  if (res && typeof res === "object" && "data" in res && Array.isArray(res.data)) return res.data;
  return [];
}

function toLegacyUserRow(user: UserApiListItem): UserRow {
  return {
    user_id: user.id,
    user_name: user.name,
    user_email: user.email,
    user_deleted: Boolean(user.deleted),
    user_created_at: user.createdAt,
    rol: user.rol,
    roleId: user.roleId ?? "",
  };
}

export function useUsers() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUsersActive, setShowUsersActive] = useState(true);
  const [totals, setTotals] = useState({ active: 0, inactive: 0, total: 0 });

  const { showFlash, clearFlash } = useFlashMessage();

  const fetchUsers = useCallback(async (active: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const res = active ? await findActives({}) : await findDesactive({});
      setUsers(normalizeList<UserApiListItem>(res).map(toLegacyUserRow));
    } catch {
      setError("Error al cargar usuarios.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshTotals = useCallback(async () => {
    try {
      const [actRes, desRes] = await Promise.all([findActives({}), findDesactive({})]);
      const active = normalizeList<UserApiListItem>(actRes).length;
      const inactive = normalizeList<UserApiListItem>(desRes).length;
      setTotals({ active, inactive, total: active + inactive });
    } catch {
      setTotals({ active: 0, inactive: 0, total: 0 });
    }
  }, []);

  // si también quieres cargar "all" al inicio, puedes cambiar esto.
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await findAll({});
      setUsers(normalizeList<UserApiListItem>(res).map(toLegacyUserRow));
    } catch {
      setError("Error al cargar usuarios.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Carga inicial (elige UNO):
  useEffect(() => {
    // Opción A: cargar activos por defecto
    void fetchUsers(true);  void refreshTotals();
  }, [fetchUsers, refreshTotals]);

  const toggleActive = useCallback(
    async (checked: boolean) => {
      setShowUsersActive(checked);
      await fetchUsers(checked);
    },
    [fetchUsers]
  );

  const removeUser = useCallback(
    async (userId: string) => {
      clearFlash();
      setLoading(true);
      try {
        const res = await deleteUser(userId);
        const ok = res?.success ?? true;

        if (ok) {
          showFlash(successResponse(res?.message ?? "Usuario eliminado"));
          await fetchUsers(showUsersActive);
        } else {
          showFlash(errorResponse(res?.message ?? "No se pudo eliminar el usuario"));
        }
      } catch {
        showFlash(errorResponse("Error de red o servidor"));
      } finally {
        setLoading(false);
      }
    },
    [clearFlash, showFlash, fetchUsers, showUsersActive]
  );

  const restore = useCallback(
    async (userId: string) => {
      clearFlash();
      setLoading(true);
      try {
        const res = await restoreUser(userId);
        const ok = res?.success ?? true;

        if (ok) {
          showFlash(successResponse(res?.message ?? "Usuario restaurado"));
          await fetchUsers(showUsersActive);
        } else {
          showFlash(errorResponse(res?.message ?? "No se pudo restaurar el usuario"));
        }
      } catch {
        showFlash(errorResponse("Error al restaurar usuario"));
      } finally {
        setLoading(false);
      }
    },
    [clearFlash, showFlash, fetchUsers, showUsersActive]
  );

  return {
    users,
    setUsers, 
    loading,
    error,
    showUsersActive,
    fetchAll,
    fetchUsers,
    toggleActive,
    removeUser,
    restore,
    totals
  };
}


