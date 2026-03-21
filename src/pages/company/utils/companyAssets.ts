import { env } from "@/env";

/**
 * Resuelve la URL absoluta de un recurso de la empresa a partir de una ruta
 * relativa o una URL completa devuelta por la API.
 */
export function resolveCompanyAssetUrl(rawAssetUrl?: string | null) {
  const raw = rawAssetUrl?.trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;

  try {
    return new URL(raw, env.apiBaseUrl).toString();
  } catch {
    return raw;
  }
}

/**
 * Obtiene una etiqueta legible para un archivo almacenado por la empresa,
 * usando el nombre del archivo cuando está disponible.
 */
export function getCompanyAssetLabel(rawAssetUrl?: string | null) {
  const raw = rawAssetUrl?.trim();
  if (!raw) return "";

  const withoutQuery = raw.split("?")[0] ?? raw;
  const fileName = withoutQuery.split("/").pop() ?? "";

  return fileName || raw;
}
