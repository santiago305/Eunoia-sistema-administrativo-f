import { useEffect, useState } from "react";
import { loginUser, logoutUser } from "@/services/authService";
import { LoginCredentials } from "@/types/auth";
import { AuthContext } from "./AuthContext";
import { findById } from "@/services/userService";
import { AuthResponse } from "@/types/AuthResponse";
import { PropsUrl } from "@/Router/guards/typeGuards";

export const AuthProvider = ({ children }: PropsUrl) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const USER_ID_STORAGE_KEY = "auth.userId";

  const extractUserId = (data: any) =>
    data?.id || data?.userId || data?.user?.id || data?.user?.userId || data?.data?.id || null;

  const extractRole = (data: any) =>
    data?.rol || data?.role || data?.data?.rol || data?.data?.role || null;

  const checkAuth = async (): Promise<AuthResponse> => {
    try {
      setLoading(true);
      console.log("[AuthProvider.checkAuth] start");
      const storedUserId = localStorage.getItem(USER_ID_STORAGE_KEY);
      console.log("[AuthProvider.checkAuth] storedUserId:", storedUserId);

      if (!storedUserId) {
        setIsAuthenticated(false);
        setUserRole(null);
        setLoading(false);
        return { success: false, message: "No hay usuario en sesion" };
      }

      const response = await findById(storedUserId);
      const role = extractRole(response);
      console.log("[AuthProvider.checkAuth] role:", role);

      if (!role) {
        setIsAuthenticated(false);
        setUserRole(null);
        setLoading(false);
        return { success: false, message: "No se pudo obtener el rol del usuario" };
      }

      setUserRole(role);
      setIsAuthenticated(true);
      setLoading(false);
      return { success: true, message: "Autenticacion validada" };
    } catch (error: any) {
      console.error("Error en checkAuth:", error);
      setIsAuthenticated(false);
      setUserRole(null);
      setLoading(false);
      const message = error.response?.data?.message || "Error inesperado en autenticacion";
      return { success: false, message };
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (payload: LoginCredentials): Promise<AuthResponse> => {
    try {
      console.log("[AuthProvider.login] start", { email: payload.email });
      const data = await loginUser(payload);
      console.log("[AuthProvider.login] login response has token:", Boolean(data?.access_token));

      const userId = extractUserId(data);
      console.log("[AuthProvider.login] userId:", userId);

      if (data?.access_token && userId) {
        localStorage.setItem(USER_ID_STORAGE_KEY, String(userId));
        await checkAuth();
        return { success: true, message: "Inicio de sesion exitoso" };
      }

      return { success: false, message: "No se pudo iniciar sesion" };
    } catch (error: any) {
      const message = error.response?.data?.message || "Error en la autenticacion";
      return { success: false, message };
    }
  };

  const logout = () => {
    logoutUser();
    localStorage.removeItem(USER_ID_STORAGE_KEY);
    setIsAuthenticated(false);
    setUserRole(null);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        userRole,
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
