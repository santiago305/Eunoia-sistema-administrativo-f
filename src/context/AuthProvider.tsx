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

type LoginErrorPayload = {
  type?: string;
  message?: string;
  details?: { retryAfterSeconds?: number; lockedUntil?: string };
};

const parseLoginFieldErrors = (message?: string) => {
  const raw = String(message ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const fieldErrors: { email?: string; password?: string } = {};

  const emailPatterns = [
    "el email debe tener un formato valido",
    "el email debe ser una cadena de texto",
  ];

  const passwordPatterns = [
    "la contrasena debe ser una cadena de texto",
    "la contrasena no puede estar vacia",
    "la contrasena debe tener al menos 8 caracteres",
  ];

  const hasEmailError = emailPatterns.some((pattern) => raw.includes(pattern));
  const hasPasswordError = passwordPatterns.some((pattern) => raw.includes(pattern));

  if (hasEmailError) {
    fieldErrors.email = "El correo es obligatorio y debe ser valido.";
  }
  if (hasPasswordError) {
    fieldErrors.password = "La contrasena es obligatoria y debe tener al menos 8 caracteres.";
  }

  return Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined;
};

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
      const loginResponse = await loginUser(payload);
      const authResult = await checkAuth();

      if (!authResult.success) return authResult;

      return {
        success: true,
        message: loginResponse.message || "Inicio de sesion exitoso",
      };
    } catch (error: unknown) {
      const message = getApiErrorMessage(error, "Error en la autenticacion");
      const err = error as AxiosError<LoginErrorPayload>;
      const status = err?.response?.status;
      const details = err?.response?.data?.details;
      const backendType = err?.response?.data?.type;
      const fieldErrors = parseLoginFieldErrors(err?.response?.data?.message ?? message);

      return {
        success: false,
        message,
        data: { status, backendType, fieldErrors, ...details },
      };
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
