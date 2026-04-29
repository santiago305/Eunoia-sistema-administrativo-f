import axiosInstance from "@/shared/common/utils/axios";
import { API_ROLES_GROUP } from "./APIs";
import type { RoleItem, RoleListStatus } from "@/features/users/types/users.types";

export const findAllRoles = async (params?: { status?: RoleListStatus }) => {
    return await axiosInstance
      .get<RoleItem[]>(API_ROLES_GROUP.findAll, { params })
      .then((res) => res.data);
};




