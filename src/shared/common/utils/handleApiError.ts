import type { AxiosError } from "axios";

export type ApiErrorPayload = {
  message?: string | string[];
};

const formatApiMessage = (message: ApiErrorPayload["message"]) => {
  if (Array.isArray(message)) return message.filter(Boolean).join(". ");
  return message;
};

export function parseApiError(
  error: unknown,
  fallbackMessage = "Ocurrio un error inesperado."
) {
  if (typeof error === "object" && error !== null) {
    const axiosError = error as AxiosError<ApiErrorPayload>;

    if (axiosError?.response?.status === 429) {
      return "Demasiados intentos. Intenta de nuevo en 1 minuto.";
    }
    if (axiosError?.response?.status === 423) {
      return formatApiMessage(axiosError?.response?.data?.message) || "Cuenta bloqueada temporalmente.";
    }

    if (axiosError?.response?.status === 403) {
      return (
        formatApiMessage(axiosError?.response?.data?.message) ||
        "Token CSRF invalido o expirado. Inicia sesion nuevamente."
      );
    }

    return (
      formatApiMessage(axiosError?.response?.data?.message) ||
      axiosError?.message ||
      fallbackMessage
    );
  }

  return fallbackMessage;
}


