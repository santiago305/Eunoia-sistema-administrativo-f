import { ROLE_LABELS, type Role } from "@/features/users/types/roles.types";
import { getPermissionLabel, getPermissionModuleLabel } from "@/features/users/utils/permissionPresentation";
import type { AccessPermissionItem } from "@/shared/services/accessControlService";
import type { PermissionModuleGroup } from "@/features/roles/types/rolesPermissions.types";

export const MODULE_LABEL_KEYS = [
  "purchases",
  "production",
  "warehouse",
  "catalog",
  "supplies",
  "security",
  "roles",
  "providers",
  "corporate",
  "system",
] as const;

export const EMPTY_LABEL_OPTION_VALUE = "__none__";

export const cn = (...s: Array<string | false | null | undefined>) => s.filter(Boolean).join(" ");

export const groupByModule = (permissions: AccessPermissionItem[]): PermissionModuleGroup[] => {
  const grouped = new Map<string, AccessPermissionItem[]>();

  for (const permission of permissions) {
    const key = permission.module || "general";
    const current = grouped.get(key) ?? [];
    current.push(permission);
    grouped.set(key, current);
  }

  return Array.from(grouped.entries())
    .map(([module, items]) => ({
      module,
      label: getPermissionModuleLabel(module),
      permissions: items.sort((a, b) => getPermissionLabel(a).localeCompare(getPermissionLabel(b))),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
};

export const getRoleLabel = (role: string) =>
  ROLE_LABELS[role as Role] ??
  role
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export const getPercent = (current: number, total: number) => {
  if (!total) return 0;
  return Math.round((current / total) * 100);
};
