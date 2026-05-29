import axiosInstance from "@/shared/common/utils/axios";
import { API_ROLES_GROUP } from "./APIs";
import type { RoleItem, RoleListStatus } from "@/features/users/types/users.types";

export const findAllRoles = async (params?: { status?: RoleListStatus }) => {
    return await axiosInstance
      .get<RoleItem[]>(API_ROLES_GROUP.findAll, { params })
      .then((res) => res.data);
};

export const createRole = async (payload: { description: string }) => {
  return await axiosInstance
    .post<{ type: string; message: string; data?: { id?: string; description?: string } }>(
      API_ROLES_GROUP.create,
      payload,
    )
    .then((res) => res.data);
};

export const updateRole = async (id: string, payload: { description: string }) => {
  return await axiosInstance
    .patch<{ message?: string }>(API_ROLES_GROUP.update(id), payload)
    .then((res) => res.data);
};

export const deactivateRole = async (
  id: string,
  payload: { replacementRoleId: string; confirmationText: string },
) => {
  return await axiosInstance
    .post<{ message?: string }>(API_ROLES_GROUP.deactivate(id), payload)
    .then((res) => res.data);
};




