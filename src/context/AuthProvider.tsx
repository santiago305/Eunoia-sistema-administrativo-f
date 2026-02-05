import { useCallback, useEffect, useState } from "react";
import {
  loginUser,
  logoutUser,
  userInfoAuth,
  type UserInfoAuthResponse,
} from "@/services/authService";
import { LoginCredentials } from "@/types/auth";
import { AuthContext } from "./AuthContext";
import { AuthResponse } from "@/types/AuthResponse";
import { PropsUrl } from "@/router/guards/typeGuards";
import { getApiErrorMessage } from "@/common/utils/apiError";
import type { AxiosError } from "axios";

export const AuthProvider = ({ children }: PropsUrl) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const extractRole = (data: UserInfoAuthResponse | null | undefined) =>
    data?.rol ?? null;

  const extractUserId = (data: UserInfoAuthResponse | null | undefined) =>
    data?.user_id ?? null;

  const resetAuthState = useCallback(() => {
    setIsAuthenticated(false);
    setUserRole(null);
    setUserId(null);
  }, []);

  const checkAuth = useCallback(async (): Promise<AuthResponse> => {
    setLoading(true);
    try {
      const response = await userInfoAuth();
      const role = extractRole(response);
      const id = extractUserId(response);

      if (!role || !id) {
        resetAuthState();
        return {
          success: false,
          message: "No se pudo obtener el usuario autenticado",
        };
      }

      setUserRole(role);
      setUserId(String(id));
      setIsAuthenticated(true);

      return { success: true, message: "Autenticacion validada" };
    } catch (error: unknown) {
      console.error("Error en checkAuth:", error);
      resetAuthState();
      const message = getApiErrorMessage(error, "Error inesperado en autenticacion");
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, [resetAuthState]);

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  const login = useCallback(async (payload: LoginCredentials): Promise<AuthResponse> => {
    try {
      await loginUser(payload);
      await checkAuth();
      return { success: true, message: "Inicio de sesion exitoso" };
    } catch (error: unknown) {
      const message = getApiErrorMessage(error, "Error en la autenticacion");
      const err = error as AxiosError<{
        message?: string;
        details?: { retryAfterSeconds?: number; lockedUntil?: string };
      }>;
      const status = err?.response?.status;
      const details = err?.response?.data?.details;
      return { success: false, message, data: { status, ...details } };
    }
  }, [checkAuth]);

  const logout = useCallback(async () => {
    try {
      await logoutUser();
    } finally {
      resetAuthState();
    }
  }, [resetAuthState]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        userRole,
        userId,
        login,
        logout,
        loading,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
