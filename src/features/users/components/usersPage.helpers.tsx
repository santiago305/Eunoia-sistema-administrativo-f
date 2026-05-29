import { ROLE_LABELS } from "../types/roles.types";
import type { UserApiListItem } from "@/shared/services/userService";
import type { Role, User } from "../types/users.types";

export const MASTER_ROLE_DESCRIPTION = "super_administrator";

export const cn = (...s: Array<string | false | null | undefined>) => s.filter(Boolean).join(" ");

export const normalizeUser = (u: UserApiListItem): User => {
  const raw = u as UserApiListItem & {
    created_at?: string | null;
    updated_at?: string | null;
    updateAt?: string | null;
  };

  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: String(u.telefono ?? ""),
    role: u.rol ?? "sin_rol",
    deleted: Boolean(u.deleted),
    deletedAt: u.deletedAt ?? null,
    createdAt: raw.createdAt ?? raw.created_at ?? "",
    updatedAt: raw.updatedAt ?? raw.updated_at ?? raw.updateAt ?? null,
    createdByUserId: (u as UserApiListItem & { createdByUserId?: string | null }).createdByUserId ?? null,
    createdByUserName: (u as UserApiListItem & { createdByUserName?: string | null }).createdByUserName ?? null,
    manageableRoleDescriptions:
      (u as UserApiListItem & { manageableRoleDescriptions?: string[] | null }).manageableRoleDescriptions ?? null,
    manageableUserIds: (u as UserApiListItem & { manageableUserIds?: string[] | null }).manageableUserIds ?? null,
  };
};

export const readError = (error: unknown) => {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { status?: number; data?: { message?: string | string[] } } }).response;
    const message = response?.data?.message;
    const normalizedMessage = Array.isArray(message) ? message.join(" | ") : String(message ?? "");
    return { status: response?.status ?? 0, message: normalizedMessage };
  }

  return { status: 0, message: "" };
};

export function getRoleLabel(role: string | null | undefined) {
  const normalized = String(role ?? "").trim().toLowerCase();
  if (!normalized || normalized === "sin_rol") return "Sin rol";

  return (
    ROLE_LABELS[normalized as Role] ??
    normalized
      .replace(/[._-]+/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase())
  );
}

export function getInitials(name?: string | null) {
  const parts = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  return parts.map((part) => part[0]?.toUpperCase()).join("") || "US";
}

export function roleTone(role: User["role"]) {
  const map: Record<User["role"], string> = {
    super_administrator: "bg-rose-50 text-rose-700 ring-rose-100",
    admin: "bg-primary/10 text-primary ring-primary/20",
    moderator: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    adviser: "bg-indigo-50 text-indigo-700 ring-indigo-100",
    purchasing_manager: "bg-amber-50 text-amber-700 ring-amber-100",
    sin_rol: "bg-zinc-100 text-zinc-700 ring-zinc-200",
  };

  return map[role] ?? "bg-zinc-50 text-zinc-700 ring-zinc-100";
}
