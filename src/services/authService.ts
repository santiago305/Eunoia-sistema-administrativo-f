import axiosInstance from "@/common/utils/axios";
import { getApiErrorMessage } from "@/common/utils/apiError";
import { API_AUTH_GROUP } from "./APIs";
import { LoginCredentials } from "@/types/auth";

interface AuthService {
  access_token: string;
  refresh_token?: string;
  role: string;
  [key: string]: unknown;
}

export interface UserInfoAuthResponse {
  user_id: string;
  rol: string;
}

export const loginUser = async (payload: LoginCredentials): Promise<AuthService> => {
  try {
    const response = await axiosInstance.post(API_AUTH_GROUP.authentication, payload);
    return response.data;
  } catch (error: unknown) {
    const message = getApiErrorMessage(error, "Error en loginUser");
    console.error("error en loginUser", message);
    throw new Error(message);
  }
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
    const response = await axiosInstance.get(API_AUTH_GROUP.refreshToken);
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
