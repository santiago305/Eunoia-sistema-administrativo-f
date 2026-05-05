import { useCallback, useState } from "react";
import {
  loginUser,
  logoutUser,
  refresh_token,
  userInfoAuth,
  type UserInfoAuthResponse,
} from "@/shared/services/authService";
import { LoginCredentials } from "@/features/Auth/types/auth";
import { AuthContext } from "./AuthContext";
import { AuthResponse } from "@/features/Auth/types/AuthResponse";
import { PropsUrl } from "@/routes/guards/typeGuards";
import { getApiErrorMessage } from "@/shared/common/utils/apiError";
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
  const [authChecked, setAuthChecked] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [preferredHomePath, setPreferredHomePath] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const extractRole = (data: UserInfoAuthResponse | null | undefined) =>
    data?.rol ?? null;

  const extractUserId = (data: UserInfoAuthResponse | null | undefined) =>
    data?.user_id ?? null;

  const resetAuthState = useCallback((checked = true) => {
    setIsAuthenticated(false);
    setUserRole(null);
    setUserRoles([]);
    setPermissions([]);
    setPreferredHomePath(null);
    setUserId(null);
    setAuthChecked(checked);
  }, []);

  const applyAuthState = useCallback(
    (response: UserInfoAuthResponse): AuthResponse => {
      const role = extractRole(response);
      const id = extractUserId(response);

      if (!role || !id) {
        resetAuthState(true);
        return {
          success: false,
          message: "No se pudo obtener el usuario autenticado",
        };
      }

      setUserRole(role);
      setUserRoles(Array.isArray(response.roles) ? response.roles : [role]);
      setPermissions(Array.isArray(response.permissions) ? response.permissions : []);
      setPreferredHomePath(
        typeof response.preferredHomePath === "string" && response.preferredHomePath.trim().length > 0
          ? response.preferredHomePath.trim()
          : null
      );
      setUserId(String(id));
      setIsAuthenticated(true);
      setAuthChecked(true);

      return { success: true, message: "Autenticacion validada" };
    },
    [resetAuthState]
  );

  const fetchAuthenticatedUser = useCallback(async (): Promise<AuthResponse> => {
    const response = await userInfoAuth({ skipAuthRefresh: true });
    return applyAuthState(response);
  }, [applyAuthState]);

  const resolveUnauthorizedAuth = useCallback(async (): Promise<AuthResponse> => {
    try {
      await refresh_token();
      return await fetchAuthenticatedUser();
    } catch (refreshError: unknown) {
      resetAuthState(true);
      return {
        success: false,
        message: "No hay una sesion activa.",
      };
    }
  }, [fetchAuthenticatedUser, resetAuthState]);

  const checkAuth = useCallback(async (): Promise<AuthResponse> => {
    setLoading(true);
    try {
      return await fetchAuthenticatedUser();
    } catch (error: unknown) {
      const err = error as AxiosError;

      if (err?.response?.status === 401) {
        return await resolveUnauthorizedAuth();
      }

      resetAuthState(true);
      const message = getApiErrorMessage(error, "Error inesperado en autenticacion");
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, [fetchAuthenticatedUser, resetAuthState, resolveUnauthorizedAuth]);

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
      const err = error as AxiosError<LoginErrorPayload>;
      const status = err?.response?.status;
      const details = err?.response?.data?.details;
      const backendType = err?.response?.data?.type;
      const message =
        status === 401
          ? "Correo o contrasena incorrectos."
          : getApiErrorMessage(error, "Error en la autenticacion");
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
      resetAuthState(true);
    }
  }, [resetAuthState]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        authChecked,
        userRole,
        userRoles,
        permissions,
        preferredHomePath,
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


