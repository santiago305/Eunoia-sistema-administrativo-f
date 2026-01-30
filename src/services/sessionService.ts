import axiosInstance from "@/common/utils/axios";
import { API_SESSIONS_GROUP } from "./APIs";


export const findSessionsMe = async () => {
    return await axiosInstance.get(API_SESSIONS_GROUP.findMe).then( res => res.data );
};