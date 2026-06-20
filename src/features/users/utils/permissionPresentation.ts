import type {
  AccessPermissionItem,
  UserPermissionOverride,
} from "@/shared/services/accessControlService";

export type PermissionState = "inherited" | "granted" | "denied" | "none";

export type PresentedPermission = AccessPermissionItem & {
  state: PermissionState;
  label: string;
  helper: string;
};

export type PermissionGroup = {
  module: string;
  label: string;
  selectedCount: number;
  totalCount: number;
  permissions: PresentedPermission[];
};

const MODULE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  users: "Usuarios",
  roles: "Permisos",
  permissions: "Catálogo de permisos",
  company: "Empresa",
  catalog: "Catálogo",
  raw_material: "Materia prima",
  warehouse: "Almacenes",
  warehouses: "Almacenes",
  clients: "Clientes",
  packs: "Packs",
  providers: "Proveedores",
  supplies: "Suministros",
  suppliers: "Proveedores",
  purchases: "Compras",
  payments: "Pagos",
  payment_methods: "Métodos de pago",
  production: "Producción",
  security: "Seguridad",
  notifications: "Correo y notificaciones",
  corporate: "Sistema",
  system: "Sistema",
  general: "General",
};

const ACTION_LABELS: Record<string, string> = {
  view: "Ver",
  read: "Consultar",
  create: "Crear",
  update: "Editar",
  edit: "Editar",
  manage: "Gestionar",
  delete: "Eliminar",
  restore: "Restaurar",
  cancel: "Cancelar",
  approve: "Aprobar",
  process: "Procesar",
  export: "Exportar",
};

const normalizeModuleKey = (module?: string | null) => module?.trim() || "general";

const prettifyCodePart = (value: string) =>
  value
    .replace(/^page\./, "")
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

export const getPermissionModuleLabel = (module?: string | null) => {
  const key = normalizeModuleKey(module);
  return MODULE_LABELS[key] ?? prettifyCodePart(key);
};

export const getPermissionLabel = (permission: AccessPermissionItem) => {
  const cleanName = String(permission.name ?? "").trim();
  if (cleanName && cleanName !== permission.code) return cleanName;

  const action = String(permission.action ?? "").trim();
  if (action && ACTION_LABELS[action]) {
    return `${ACTION_LABELS[action]} ${getPermissionModuleLabel(permission.module).toLowerCase()}`;
  }

  return prettifyCodePart(permission.code);
};

export const getPermissionState = (
  permissionCode: string,
  effectivePermissions: string[],
  overrides: UserPermissionOverride[],
): PermissionState => {
  const override = overrides.find((item) => item.permissionCode === permissionCode);
  if (override?.effect === "DENY") return "denied";
  if (override?.effect === "ALLOW") return "granted";
  if (effectivePermissions.includes(permissionCode)) return "inherited";
  return "none";
};

export const getNextPermissionOverrideEffect = (state: PermissionState) => {
  if (state === "denied") return "ALLOW" as const;
  if (state === "inherited" || state === "granted") return "DENY" as const;
  return "ALLOW" as const;
};

export const buildUserPermissionGroups = ({
  permissions,
  effectivePermissions,
  overrides,
}: {
  permissions: AccessPermissionItem[];
  effectivePermissions: string[];
  overrides: UserPermissionOverride[];
}): PermissionGroup[] => {
  const grouped = new Map<string, PresentedPermission[]>();

  permissions.forEach((permission) => {
    const module = normalizeModuleKey(permission.module);
    const current = grouped.get(module) ?? [];
    current.push({
      ...permission,
      state: getPermissionState(permission.code, effectivePermissions, overrides),
      label: getPermissionLabel(permission),
      helper: permission.description?.trim() || `Controla ${permission.code}`,
    });
    grouped.set(module, current);
  });

  return Array.from(grouped.entries())
    .map(([module, items]) => {
      const permissionsSorted = items.sort((a, b) => a.label.localeCompare(b.label));
      return {
        module,
        label: getPermissionModuleLabel(module),
        selectedCount: permissionsSorted.filter((item) => item.state !== "none").length,
        totalCount: permissionsSorted.length,
        permissions: permissionsSorted,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
};
