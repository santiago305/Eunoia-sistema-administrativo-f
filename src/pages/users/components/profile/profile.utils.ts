import type { AxiosError } from "axios";
import { env } from "@/env";
import type { CurrentUser, CurrentUserResponse } from "@/types/userProfile";

export const PROFILE_PRIMARY = "#21b8a6";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function getInitial(name?: string) {
  const safe = (name ?? "").trim();
  return safe ? safe[0]!.toUpperCase() : "?";
}

export function normalizeUser(res: CurrentUserResponse | CurrentUser): CurrentUser {
  return "data" in res ? res.data : res;
}

export function resolveProfileAvatarUrl(rawAvatarUrl?: string | null) {
  const raw = rawAvatarUrl?.trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;

  try {
    return new URL(raw, env.apiBaseUrl).toString();
  } catch {
    return raw;
  }
}

type BackendErrorPayload = {
  message?: string;
  errors?: string[];
};

export function parseChangePasswordError(error: unknown) {
  const err = error as AxiosError<BackendErrorPayload>;
  const status = err?.response?.status;
  const message = err?.response?.data?.message ?? "";
  const errors = err?.response?.data?.errors ?? [];
  const combined = [message, ...errors].filter(Boolean).join(" | ");
  const normalized = combined
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const fieldErrors: { currentPassword?: string; newPassword?: string } = {};

  if (normalized.includes("contrasena actual incorrecta")) {
    fieldErrors.currentPassword = "Contrasena actual incorrecta.";
  }
  if (normalized.includes("nueva contrasena es obligatoria")) {
    fieldErrors.newPassword = "La nueva contrasena es obligatoria.";
  }
  if (normalized.includes("debe tener al menos 8 caracteres")) {
    fieldErrors.newPassword = "La nueva contrasena debe tener al menos 8 caracteres.";
  }

  return {
    message:
      message ||
      (errors.length ? errors.join(" | ") : "") ||
      (status === 401
        ? "No autorizado para cambiar la contrasena."
        : status === 400
          ? "Datos invalidos para cambio de contrasena."
          : "No se pudo cambiar la contrasena"),
    fieldErrors,
  };
}
