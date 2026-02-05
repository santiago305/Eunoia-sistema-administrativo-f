import type { AxiosError } from "axios";

export type ApiErrorPayload = {
  message?: string;
  errors?: string[];
};

export const getApiErrorMessage = (error: unknown, fallback: string) => {
  const err = error as AxiosError<ApiErrorPayload>;
  if (err?.response?.status === 429) {
    return "Demasiados intentos. Intenta de nuevo en 1 minuto.";
  }
  if (err?.response?.status === 423) {
    return err?.response?.data?.message ?? "Cuenta bloqueada temporalmente.";
  }
  if (err?.response?.status === 403) {
    return err?.response?.data?.message ?? "Token CSRF invalido o expirado. Inicia sesion nuevamente.";
  }
  return err?.response?.data?.message ?? fallback;
};
