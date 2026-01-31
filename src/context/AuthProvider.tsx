import { useEffect, useState } from "react";
import { loginUser, logoutUser, userInfoAuth, type UserInfoAuthResponse } from "@/services/authService";
import { LoginCredentials } from "@/types/auth";
import { AuthContext } from "./AuthContext";
import { AuthResponse } from "@/types/AuthResponse";
import { PropsUrl } from "@/router/guards/typeGuards";
import { getApiErrorMessage } from "@/common/utils/apiError";

export const AuthProvider = ({ children }: PropsUrl) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const extractRole = (data: UserInfoAuthResponse | null | undefined) =>
    data?.rol ?? null;
  const extractUserId = (data: UserInfoAuthResponse | null | undefined) =>
    data?.user_id ?? null;

  const checkAuth = async (): Promise<AuthResponse> => {
    try {
      setLoading(true);
      const response = await userInfoAuth();
      const role = extractRole(response);
      const id = extractUserId(response);
      if (!role || !id) {
        setIsAuthenticated(false);
        setUserRole(null);
        setUserId(null);
        setLoading(false);
        return { success: false, message: "No se pudo obtener el usuario autenticado" };
      }

      setUserRole(role);
      setUserId(String(id));
      setIsAuthenticated(true);
      setLoading(false);
      return { success: true, message: "Autenticacion validada" };
    } catch (error: unknown) {
      console.error("Error en checkAuth:", error);
      setIsAuthenticated(false);
      setUserRole(null);
      setUserId(null);
      setLoading(false);
      const message = getApiErrorMessage(error, "Error inesperado en autenticacion");
      return { success: false, message };
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (payload: LoginCredentials): Promise<AuthResponse> => {
    try {
      const data = await loginUser(payload);
      await checkAuth();
      return { success: true, message: "Inicio de sesion exitoso" };
    } catch (error: unknown) {
      const message = getApiErrorMessage(error, "Error en la autenticacion");
      return { success: false, message };
    }
  };

  const logout = () => {
    logoutUser();
    setIsAuthenticated(false);
    setUserRole(null);
    setUserId(null);
  };

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
