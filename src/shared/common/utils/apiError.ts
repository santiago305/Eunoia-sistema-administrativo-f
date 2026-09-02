import type { AxiosError } from "axios";

export type ApiErrorPayload = {
  message?: string;
  errors?: string[];
};

export const getApiErrorMessage = (error: unknown, fallback: string) => {
  const err = error as AxiosError<ApiErrorPayload>;
  if (err?.response?.status === 429) {
    const retryAfter = err.response.headers?.["retry-after"];
    return (
      err.response.data?.message ??
      (retryAfter
        ? `Se alcanzó el límite de solicitudes. Intenta nuevamente en ${retryAfter} segundos.`
        : "Se alcanzó el límite de solicitudes. Intenta nuevamente en un minuto.")
    );
  }
  if (err?.response?.status === 423) {
    return err?.response?.data?.message ?? "Cuenta bloqueada temporalmente.";
  }
  if (err?.response?.status === 403) {
    return err?.response?.data?.message ?? "Token CSRF invalido o expirado. Inicia sesion nuevamente.";
  }
  return err?.response?.data?.message ?? fallback;
};


