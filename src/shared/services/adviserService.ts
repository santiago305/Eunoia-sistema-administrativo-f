import axiosInstance from "@/shared/common/utils/axios";
import { API_ADVISERS_GROUP } from "./APIs";

export type AdviserOption = {
  id: string;
  name: string;
  email: string;
};

export const listAdvisers = async (): Promise<AdviserOption[]> => {
  const response = await axiosInstance.get<AdviserOption[]>(
    API_ADVISERS_GROUP.list,
  );
  return response.data;
};

export const createAdviser = async (
  userId: string,
): Promise<AdviserOption> => {
  const response = await axiosInstance.post<AdviserOption>(
    API_ADVISERS_GROUP.create,
    { userId },
  );
  return response.data;
};
