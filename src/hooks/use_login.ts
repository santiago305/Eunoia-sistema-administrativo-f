import { useState } from "react";
import { loginUser } from "@/services/authService";
import { parseApiError } from "@/common/utils/handleApiError";
import { flashMessage } from "@/common/utils/flashEvent";

export const useLogin = () => {
  const [loading, setLoading] = useState(false);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const data = await loginUser({ email, password });
      flashMessage("success", "Inicio de sesión exitoso");
      return data;
    } catch (error) {
      const msg = parseApiError(error, "Error al iniciar sesión.");
      flashMessage("error", msg);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { login, loading };
};


