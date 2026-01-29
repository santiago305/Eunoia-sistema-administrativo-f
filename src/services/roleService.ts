import axiosInstance from "@/common/utils/axios";
import { API_ROLES_GROUP } from "./APIs";



export const findAllRoles = async () => {
    return await axiosInstance.get(API_ROLES_GROUP.findAll).then( res => res.data );
};


