import axiosInstance from "@/shared/common/utils/axios";
import { API_ACCESS_CONTROL_GROUP } from "./APIs";

export type PermissionEffect = "ALLOW" | "DENY";

export type AccessPermissionItem = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  module?: string | null;
  resource?: string | null;
  action?: string | null;
  type: "action" | "page";
  isSystem: boolean;
  isActive: boolean;
};

export type UserPermissionOverride = {
  id: string;
  permissionCode: string | null;
  effect: PermissionEffect;
  reason: string | null;
  createdBy: string | null;
  createdAt: string;
};

export type EffectivePermissionsDetailResponse = {
  userId: string;
  roles: string[];
  permissions: string[];
  overrides: UserPermissionOverride[];
  preferredHomePath?: string | null;
};

export const getEffectivePermissionsDetailByUser = async (id: string) => {
  const response = await axiosInstance.get<EffectivePermissionsDetailResponse>(
    API_ACCESS_CONTROL_GROUP.effectivePermissionsByUser(id)
  );
  return response.data;
};

export const listAccessPermissions = async () => {
  const response = await axiosInstance.get<AccessPermissionItem[]>(
    API_ACCESS_CONTROL_GROUP.listPermissions
  );
  return response.data;
};

export const listRolePermissions = async (roleId: string) => {
  const response = await axiosInstance.get<{
    roleId: string;
    roleDescription: string;
    permissions: string[];
  }>(API_ACCESS_CONTROL_GROUP.rolePermissionsByRole(roleId));
  return response.data;
};

export const assignPermissionsToRole = async (roleId: string, permissionCodes: string[]) => {
  const response = await axiosInstance.patch(
    API_ACCESS_CONTROL_GROUP.rolePermissionsByRole(roleId),
    { permissionCodes }
  );
  return response.data;
};

export const setUserPermissionOverride = async (params: {
  userId: string;
  permissionCode: string;
  effect: PermissionEffect;
  reason?: string;
}) => {
  const response = await axiosInstance.post(
    API_ACCESS_CONTROL_GROUP.setUserPermissionOverride(params.userId),
    {
      permissionCode: params.permissionCode,
      effect: params.effect,
      reason: params.reason,
    }
  );
  return response.data;
};

export const setUserPreferredHomePath = async (params: {
  userId: string;
  preferredHomePath: string | null;
}) => {
  const response = await axiosInstance.patch(
    API_ACCESS_CONTROL_GROUP.setUserPreferredHomePath(params.userId),
    {
      preferredHomePath: params.preferredHomePath,
    }
  );
  return response.data;
};

export const removeUserPermissionOverride = async (userId: string, permissionCode: string) => {
  const response = await axiosInstance.delete(
    API_ACCESS_CONTROL_GROUP.removeUserPermissionOverride(userId, permissionCode)
  );
  return response.data;
};
