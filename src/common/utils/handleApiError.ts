import type { AxiosError } from "axios";

export type ApiErrorPayload = {
  message?: string;
};

export function parseApiError(
  error: unknown,
  fallbackMessage = "OcurriÃ³ un error inesperado."
) {
  if (typeof error === "object" && error !== null) {
    const axiosError = error as AxiosError<ApiErrorPayload>;

    return (
      axiosError?.response?.data?.message ||
      axiosError?.message ||
      fallbackMessage
    );
  }

  return fallbackMessage;
}
