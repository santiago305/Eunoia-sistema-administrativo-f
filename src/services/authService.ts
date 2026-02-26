import axiosInstance from "@/common/utils/axios";
import { getApiErrorMessage } from "@/common/utils/apiError";
import { API_AUTH_GROUP } from "./APIs";
import { LoginCredentials } from "@/types/auth";

export interface LoginApiSuccessResponse {
  message: string;
}

export interface UserInfoAuthResponse {
  user_id: string;
  rol: string;
}

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

export const userInfoAuth = async (): Promise<UserInfoAuthResponse> => {
  try {
    const response = await axiosInstance.get(API_AUTH_GROUP.userAuth);
    return response.data;
  } catch (error: unknown) {
    const message = getApiErrorMessage(error, "Error en userInfoAuth");
    console.error("error en userInfoAuth", message);
    throw new Error(message);
  }
};

export const checkTokenValidity = async () => {
  try {
    const response = await axiosInstance.get(API_AUTH_GROUP.validateToken);
    const message = String(response.data?.message ?? "").toLowerCase();
    return message.includes("valido") || message.includes("válido");
  } catch (error: unknown) {
    const message = getApiErrorMessage(error, "Token no valido o expirado");
    console.error(message);
    return false;
  }
};

export const refresh_token = async () => {
  try {
    const response = await axiosInstance.post(API_AUTH_GROUP.refreshToken);
    return response.data;
  } catch (error: unknown) {
    const message = getApiErrorMessage(error, "Error al refrescar token");
    console.error(message);
    return false;
  }
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
