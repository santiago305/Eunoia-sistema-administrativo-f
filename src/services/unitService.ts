import axiosInstance from "@/common/utils/axios";
import { API_UNITS_GROUP } from "@/services/APIs";
import type { ListUnitResponse } from "@/types/unit";

export const listUnits = async ():Promise<ListUnitResponse> => {
    const response = await axiosInstance.get(API_UNITS_GROUP.list);
    return response.data;
};