import axiosInstance from "@/shared/common/utils/axios";
import { getApiErrorMessage } from "@/shared/common/utils/apiError";
import { API_AUTH_GROUP } from "./APIs";
import { LoginCredentials } from "@/features/Auth/types/auth";
import type { AxiosRequestConfig } from "axios";

export interface LoginApiSuccessResponse {
  message: string;
}

export interface UserInfoAuthResponse {
  user_id: string;
  rol: string;
  roles?: string[];
  permissions?: string[];
}

type AuthRequestConfig = AxiosRequestConfig & {
  skipAuthRefresh?: boolean;
};

type UserInfoAuthOptions = {
  skipAuthRefresh?: boolean;
};

const getDeviceNameHeader = () => {
  if (typeof window === "undefined") return "Unknown device";

  const ua = window.navigator.userAgent || "";
  const platform = window.navigator.platform || "Unknown OS";

  if (/iPhone|iPad|iPod/i.test(ua)) return `Apple ${platform}`;
  if (/Android/i.test(ua)) return `Android ${platform}`;
  if (/Windows/i.test(ua)) return "Windows device";
  if (/Macintosh|Mac OS X/i.test(ua)) return "Mac device";
  if (/Linux/i.test(ua)) return "Linux device";

  return platform || "Unknown device";
};

export const loginUser = async (
  payload: LoginCredentials
): Promise<LoginApiSuccessResponse> => {
  const response = await axiosInstance.post(API_AUTH_GROUP.authentication, payload, {
    headers: {
      "x-device-name": getDeviceNameHeader(),
    },
  });
  return response.data;
};

export const userInfoAuth = async (
  options: UserInfoAuthOptions = {}
): Promise<UserInfoAuthResponse> => {
  const config = {
    skipAuthRefresh: options.skipAuthRefresh ?? false,
  } as AuthRequestConfig;

  const response = await axiosInstance.get(API_AUTH_GROUP.userAuth, config);
  return response.data;
};

export const refresh_token = async () => {
  const response = await axiosInstance.post(API_AUTH_GROUP.refreshToken);
  return response.data;
};

export const logoutUser = async () => {
  try {
    const response = await axiosInstance.post(API_AUTH_GROUP.logout);
    return response.data;
  } catch (error: unknown) {
    const message = getApiErrorMessage(error, "Error en logout");
    console.error(message);
    return false;
  }
};

