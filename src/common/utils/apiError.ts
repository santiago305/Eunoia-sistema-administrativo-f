import type { AxiosError } from "axios";

export type ApiErrorPayload = {
  message?: string;
  errors?: string[];
};

export const getApiErrorMessage = (error: unknown, fallback: string) => {
  const err = error as AxiosError<ApiErrorPayload>;
  return err?.response?.data?.message ?? fallback;
};
