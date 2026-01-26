import { createContext } from "react";
import { LoginCredentials } from "@/types/auth";
import { AuthResponse } from "@/types/AuthResponse";

/**
 * Tipo de contexto de autenticación.
 * 
 * Define la estructura de los valores que estarán disponibles 
 * a través del AuthContext.
 */
interface AuthContextType {
  isAuthenticated: boolean;
  userRole: string | null;
  login: (payload: LoginCredentials) => Promise<AuthResponse>;
  logout: () => void;
  checkAuth: () => Promise<AuthResponse>;
  loading: boolean;
}

/**
 * Contexto de autenticación de la aplicación.
 * 
 * Se utiliza para compartir el estado de autenticación, roles 
 * de usuario, y métodos de login, logout y verificación de sesión 
 * entre los componentes.
 */
export const AuthContext = createContext<AuthContextType | undefined>(undefined);
