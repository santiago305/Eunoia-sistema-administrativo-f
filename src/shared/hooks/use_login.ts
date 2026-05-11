import { useState } from "react";
import { sileo } from "sileo";
import { loginUser } from "@/shared/services/authService";
import { parseApiError } from "@/shared/common/utils/handleApiError";

export const useLogin = () => {
  const [loading, setLoading] = useState(false);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const data = await loginUser({ email, password });
      sileo.success({ title: "Exito", description: "Inicio de sesion exitoso" });
      return data;
    } catch (error) {
      const msg = parseApiError(error, "Error al iniciar sesion.");
      sileo.error({ title: "Error", description: msg });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { login, loading };
};
