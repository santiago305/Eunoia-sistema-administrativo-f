import axiosInstance from "@/shared/common/utils/axios"
import { API_ACCESS_CONTROL_GROUP, API_PROFILE_GROUP, API_USERS_GROUP } from "./APIs"
import type {
  CountUsersByRoleData,
  CreateUserRequest,
  CreateUserResponse,
  RoleType,
  UserListStatus,
} from "@/features/users/types/users.types";
import type { CurrentUserResponse } from "@/features/profile/types/userProfile"

export type UserRoleCount = RoleType;
export type UserStatusFilter = UserListStatus;
export type UserSortBy = "name" | "email" | "createdAt" | "role" | "deleted";
export type UserOrder = "ASC" | "DESC";

export type UserApiListItem = {
  id: string;
  name: string;
  email: string;
  telefono?: string | null;
  rol: UserRoleCount;
  roleId?: string;
  deleted: boolean;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;
};

export type ListUsersParams = {
  status?: UserStatusFilter;
  page?: number;
  role?: string;
  q?: string;
  sortBy?: UserSortBy;
  order?: UserOrder;
};
export type CreateUserPayload = CreateUserRequest;
export type ListUsersResponse = {
  items: UserApiListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
};

export type CountUsersByRoleParams = {
  role?: UserRoleCount;
  q?: string;
  status?: UserStatusFilter;
};

export type CountUsersByRoleResponse = {
  total: CountUsersByRoleData["total"];
  byRole: CountUsersByRoleData["byRole"];
};

export type EffectivePermissionsResponse = {
  userId: string;
  roles: string[];
  permissions: string[];
};

// ----------------------------------------
// USUARIOS (ADMIN)
// ----------------------------------------

/**
 * Crea un nuevo usuario.
 * @param {CreateUserPayload} payload - Datos del usuario.
 * @returns {Promise<any>} Respuesta del servidor.
 */
export const createUser = async (payload: CreateUserPayload) => {
  const response = await axiosInstance.post<CreateUserResponse>(API_USERS_GROUP.createUser, payload)
  return response.data
}

export const listUsers = async (params?: ListUsersParams) => {
  const response = await axiosInstance.get<ListUsersResponse>(API_USERS_GROUP.list, {
    params: { status: "all", ...params },
  });
  return response.data;
};

/**
 * Obtiene conteo de usuarios agrupado por rol.
 * @param {CountUsersByRoleParams} params - Filtros opcionales.
 * @returns {Promise<CountUsersByRoleResponse>} Total y agrupacion por rol.
 */
export const countUsersByRole = async (params?: CountUsersByRoleParams) => {
  const response = await axiosInstance.get<CountUsersByRoleResponse>(API_USERS_GROUP.countByRole, { params });
  return response.data;
};

export const updateMyAvatar = async (file: File) => {
  const formData = new FormData();
  formData.append("avatar", file);

  const response = await axiosInstance.post(
    API_PROFILE_GROUP.avatarMe,
    formData,
  );

  return response.data;
};

export const removeMyAvatar = async () => {
  const response = await axiosInstance.delete(API_PROFILE_GROUP.avatarMe);
  return response.data;
};

// ----------------------------------------
// PERFIL (ME)
// ----------------------------------------

export const changeMyPassword = async (
  payload: ChangeMyPasswordPayload
) => {
  const response = await axiosInstance.patch<ProfileMutationResponse>(
    API_PROFILE_GROUP.changePasswordMe,
    payload
  );
  return response.data;
};

/**
 * Obtiene la información del usuario autenticado.
 * @returns {Promise<any>} Datos del usuario autenticado.
 */
export const findOwnUser = async () => {
  const response = await axiosInstance.get<CurrentUserResponse>(API_PROFILE_GROUP.me)
  return response.data
}

export type UpdateOwnProfilePayload = {
  name?: string;
  telefono?: string | null;
};

export type ChangeMyPasswordPayload = {
  currentPassword: string;
  newPassword: string;
};

export type ProfileMutationResponse = {
  type: "success" | "error" | string;
  message: string;
};

export type UpdateUserRolePayload = {
  roleId: string;
};

export const updateOwnUser = async (payload: UpdateOwnProfilePayload) => {
  const response = await axiosInstance.patch<ProfileMutationResponse>(API_PROFILE_GROUP.updateMe, payload)
  return response.data
}

export const updateUserRole = async (id: string, payload: UpdateUserRolePayload) => {
  const response = await axiosInstance.patch(API_USERS_GROUP.updateUserRole(id), payload);
  return response.data;
};

/**
 * Elimina un usuario.
 * @param {string} id - ID del usuario.
 * @returns {Promise<any>} Respuesta del servidor.
 */
export const deleteUser = async (id: string) => {
  const response = await axiosInstance.patch(API_USERS_GROUP.deleteUser(id))
  return response.data
}

/**
 * Restaura un usuario eliminado.
 * @param {string} id - ID del usuario.
 * @returns {Promise<any>} Respuesta del servidor.
 */
export const restoreUser = async (id: string) => {
  const response = await axiosInstance.patch(API_USERS_GROUP.restoreUser(id))
  return response.data
}

export const getEffectivePermissionsByUser = async (id: string) => {
  const response = await axiosInstance.get<EffectivePermissionsResponse>(
    API_ACCESS_CONTROL_GROUP.effectivePermissionsByUser(id)
  );
  return response.data;
};
