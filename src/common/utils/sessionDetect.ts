import type { SessionApiDto } from "@/types/session";

export type SessionDto = {
  id: string;
  userId: string;
  deviceName?: string | null;
  userAgent?: string | null;
  ipAddress?: string | null;
  createdAt: string;
  lastSeenAt: string;
  revokedAt?: string | null;
  expiresAt: string;
  isCurrent: boolean | null;
};

export const mapSessionApiToSessionDto = (session: SessionApiDto): SessionDto => {
  return {
    id: session.id,
    userId: session.userId,
    deviceName: session.deviceName,
    userAgent: session.userAgent,
    ipAddress: session.ip,
    createdAt: session.createdAt,
    lastSeenAt: session.lastUsedAt,
    revokedAt: session.revokedAt,
    expiresAt: session.expiresAt,
    isCurrent: session.isCurrent,
  };
};

export type SessionMeta = {
  browser: "Chrome" | "Edge" | "Brave" | "Explorer" | "Thunder" | "Unknown";
  deviceType: "Mobile" | "Laptop" | "Unknown";
  label: string; // texto para mostrar
};
export type BrowserName =
  | "Chrome"
  | "Edge"
  | "Brave"
  | "Firefox"
  | "Safari"
  | "Thunder Client"
  | "Unknown";

export type DeviceType = "Desktop" | "Mobile" | "Bot" | "Unknown";

function detectBrowser(userAgent: string): BrowserName {
  const ua = userAgent ?? "";

  // Tools / API clients
  if (/Thunder Client/i.test(ua)) return "Thunder Client";

  // Edge (Chromium)
  if (/Edg\//i.test(ua)) return "Edge";

  // Brave suele verse como Chrome; a veces viene con "Brave" o "brave"
  if (/Brave/i.test(ua)) return "Brave";

  if (/Firefox\//i.test(ua)) return "Firefox";

  // Safari (evita confundir con Chrome)
  const isSafari = /Safari\//i.test(ua) && !/Chrome\//i.test(ua) && !/Chromium\//i.test(ua);
  if (isSafari) return "Safari";

  if (/Chrome\//i.test(ua)) return "Chrome";

  return "Unknown";
}

function detectDeviceType(userAgent: string): DeviceType {
  const ua = userAgent ?? "";

  if (/Thunder Client/i.test(ua)) return "Bot";

  if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) return "Mobile";
  if (/Windows|Macintosh|Linux/i.test(ua)) return "Desktop";

  return "Unknown";
}

export function detectSessionMeta(session: SessionDto) {
  const browser = detectBrowser(session.userAgent || "");
  const deviceType = detectDeviceType(session.userAgent || "");

  // label: lo que se ve “bonito” en el item
  const label =
    browser === "Thunder Client"
      ? "API Client"
      : deviceType === "Mobile"
        ? "Teléfono"
        : "Laptop / PC";

  return { browser, deviceType, label };
}

