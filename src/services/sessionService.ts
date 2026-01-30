import axiosInstance from "@/common/utils/axios";
import { API_SESSIONS_GROUP } from "./APIs";


export const findSessionsMe = async () => {
    return await axiosInstance.get(API_SESSIONS_GROUP.findMe).then( res => res.data );
};
export const revokeAllSessionsLessMe = async () => {
    return await axiosInstance.patch(API_SESSIONS_GROUP.revokeAllSessionsLessMe).then( res => res.data );
};
export const revokeSession = async (id: string) => {
    return await axiosInstance.patch(API_SESSIONS_GROUP.revokeSession(id)).then( res => res.data );
};

