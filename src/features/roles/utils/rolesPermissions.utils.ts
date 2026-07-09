import { ROLE_LABELS, type Role } from "@/features/users/types/roles.types";
import { getPermissionLabel, getPermissionModuleLabel } from "@/features/users/utils/permissionPresentation";
import type { AccessPermissionItem } from "@/shared/services/accessControlService";
import type { PermissionModuleGroup, PermissionSubgroup } from "@/features/roles/types/rolesPermissions.types";

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

const CATALOG_MODULES = new Set(["catalog", "packs"]);
const RAW_MATERIAL_MODULES = new Set(["raw_material"]);
const PURCHASE_DASHBOARD_MODULES = new Set(["purchases_dashboard"]);

const CATALOG_SUBGROUPS: Array<Pick<PermissionSubgroup, "key" | "label">> = [
  { key: "products", label: "Productos" },
  { key: "packs", label: "Packs" },
  { key: "transfers", label: "Transferencias" },
  { key: "adjustments", label: "Ajustes" },
  { key: "inventory", label: "Inventario" },
  { key: "movements", label: "Movimientos" },
];

const RAW_MATERIAL_SUBGROUPS: Array<Pick<PermissionSubgroup, "key" | "label">> = [
  { key: "materials", label: "Materia prima" },
  { key: "transfers", label: "Transferencias" },
  { key: "adjustments", label: "Ajustes" },
  { key: "inventory", label: "Inventario" },
  { key: "movements", label: "Movimientos" },
];

const PURCHASE_DASHBOARD_SUBGROUPS: Array<Pick<PermissionSubgroup, "key" | "label">> = [
  { key: "costs", label: "Costos" },
  { key: "payments", label: "Pagos" },
  { key: "suppliers", label: "Proveedores" },
  { key: "items", label: "Items" },
  { key: "operations", label: "Operaciones" },
];

const getCatalogPermissionSubgroupKey = (permission: AccessPermissionItem) => {
  const code = permission.code;
  const resource = permission.resource ?? "";

  if (
    code.startsWith("page.products.") ||
    code.startsWith("products.") ||
    resource === "products" ||
    resource === "products_recipes" ||
    resource === "products_equivalences"
  ) {
    return "products";
  }

  if (code.startsWith("page.packs.") || code.startsWith("packs.") || resource === "packs") {
    return "packs";
  }

  if (
    code.startsWith("page.product-transfers.") ||
    code.startsWith("transfers.products.") ||
    resource === "product_transfers" ||
    resource === "transfers_products"
  ) {
    return "transfers";
  }

  if (
    code.startsWith("page.product-adjustments.") ||
    code.startsWith("adjustments.products.") ||
    resource === "product_adjustments" ||
    resource === "adjustments_products"
  ) {
    return "adjustments";
  }

  if (
    code.startsWith("page.product-inventory.") ||
    code.startsWith("inventory.products.") ||
    code.startsWith("inventory-alerts.") ||
    resource.includes("inventory_products") ||
    resource.includes("inventory_forecast") ||
    resource.includes("inventory_realtime") ||
    resource.includes("inventory_alerts")
  ) {
    return "inventory";
  }

  if (
    code.startsWith("page.product-movements.") ||
    code.startsWith("inventory-ledger.products.") ||
    resource.includes("inventory_ledger_products")
  ) {
    return "movements";
  }

  return null;
};

const getRawMaterialPermissionSubgroupKey = (permission: AccessPermissionItem) => {
  const code = permission.code;
  const resource = permission.resource ?? "";

  if (
    code.startsWith("page.materials.") ||
    code.startsWith("materials.") ||
    resource === "materials" ||
    resource === "materials_equivalences"
  ) {
    return "materials";
  }

  if (
    code.startsWith("page.material-transfers.") ||
    code.startsWith("transfers.materials.") ||
    resource === "material_transfers" ||
    resource === "transfers_materials"
  ) {
    return "transfers";
  }

  if (
    code.startsWith("page.material-adjustments.") ||
    code.startsWith("adjustments.materials.") ||
    resource === "material_adjustments" ||
    resource === "adjustments_materials"
  ) {
    return "adjustments";
  }

  if (
    code.startsWith("page.material-inventory.") ||
    code.startsWith("inventory.materials.") ||
    resource.includes("inventory_materials")
  ) {
    return "inventory";
  }

  if (
    code.startsWith("page.material-movements.") ||
    code.startsWith("inventory-ledger.materials.") ||
    resource.includes("inventory_ledger_materials")
  ) {
    return "movements";
  }

  return null;
};

const getPurchaseDashboardPermissionSubgroupKey = (permission: AccessPermissionItem) => {
  if (permission.code === "purchases_dashboard.view") return null;

  const purchaseDashboardSubgroups: Record<string, string> = {
    "purchases_dashboard.view_costs": "costs",
    "purchases_dashboard.view_payments": "payments",
    "purchases_dashboard.view_suppliers": "suppliers",
    "purchases_dashboard.view_items": "items",
    "purchases_dashboard.view_operations": "operations",
  };

  return purchaseDashboardSubgroups[permission.code] ?? null;
};

const sortPermissionsByLabel = (permissions: AccessPermissionItem[]) =>
  permissions.sort((a, b) => getPermissionLabel(a).localeCompare(getPermissionLabel(b)));

const buildSectionedGroup = ({
  module,
  permissions,
  subgroupDefs,
  resolveSubgroupKey,
}: {
  module: string;
  permissions: AccessPermissionItem[];
  subgroupDefs: Array<Pick<PermissionSubgroup, "key" | "label">>;
  resolveSubgroupKey: (permission: AccessPermissionItem) => string | null;
}): PermissionModuleGroup => {
  const bySubgroup = new Map<string, AccessPermissionItem[]>();
  const directPermissions: AccessPermissionItem[] = [];

  subgroupDefs.forEach((subgroup) => bySubgroup.set(subgroup.key, []));

  permissions.forEach((permission) => {
    const subgroupKey = resolveSubgroupKey(permission);
    if (!subgroupKey) {
      directPermissions.push(permission);
      return;
    }

    const current = bySubgroup.get(subgroupKey) ?? [];
    current.push(permission);
    bySubgroup.set(subgroupKey, current);
  });

  const subgroups = subgroupDefs.map((subgroup) => ({
    ...subgroup,
    permissions: bySubgroup.get(subgroup.key) ?? [],
  })).filter((subgroup) => subgroup.permissions.length > 0);

  return {
    module,
    label: getPermissionModuleLabel(module),
    permissions: [
      ...sortPermissionsByLabel(directPermissions),
      ...subgroups.flatMap((subgroup) => subgroup.permissions),
    ],
    directPermissions: sortPermissionsByLabel(directPermissions),
    subgroups,
  };
};

const buildCatalogGroup = (permissions: AccessPermissionItem[]): PermissionModuleGroup =>
  buildSectionedGroup({
    module: "catalog",
    permissions,
    subgroupDefs: CATALOG_SUBGROUPS,
    resolveSubgroupKey: getCatalogPermissionSubgroupKey,
  });

const buildRawMaterialGroup = (permissions: AccessPermissionItem[]): PermissionModuleGroup =>
  buildSectionedGroup({
    module: "raw_material",
    permissions,
    subgroupDefs: RAW_MATERIAL_SUBGROUPS,
    resolveSubgroupKey: getRawMaterialPermissionSubgroupKey,
  });

const buildPurchaseDashboardGroup = (permissions: AccessPermissionItem[]): PermissionModuleGroup =>
  buildSectionedGroup({
    module: "purchases_dashboard",
    permissions,
    subgroupDefs: PURCHASE_DASHBOARD_SUBGROUPS,
    resolveSubgroupKey: getPurchaseDashboardPermissionSubgroupKey,
  });

const insertGroupByLabel = (groups: PermissionModuleGroup[], group: PermissionModuleGroup) => {
  const groupIndex = groups.findIndex((item) => item.label.localeCompare(group.label) > 0);
  if (groupIndex === -1) return [...groups, group];

  return [
    ...groups.slice(0, groupIndex),
    group,
    ...groups.slice(groupIndex),
  ];
};

export const groupByModule = (permissions: AccessPermissionItem[]): PermissionModuleGroup[] => {
  const grouped = new Map<string, AccessPermissionItem[]>();
  const catalogPermissions: AccessPermissionItem[] = [];
  const rawMaterialPermissions: AccessPermissionItem[] = [];
  const purchaseDashboardPermissions: AccessPermissionItem[] = [];

  for (const permission of permissions) {
    const key = permission.module || "general";
    if (CATALOG_MODULES.has(key)) {
      catalogPermissions.push(permission);
      continue;
    }
    if (RAW_MATERIAL_MODULES.has(key)) {
      rawMaterialPermissions.push(permission);
      continue;
    }
    if (PURCHASE_DASHBOARD_MODULES.has(key)) {
      purchaseDashboardPermissions.push(permission);
      continue;
    }

    const current = grouped.get(key) ?? [];
    current.push(permission);
    grouped.set(key, current);
  }

  const groups = Array.from(grouped.entries())
    .map(([module, items]) => ({
      module,
      label: getPermissionModuleLabel(module),
      permissions: sortPermissionsByLabel(items),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const withCatalog = catalogPermissions.length ? insertGroupByLabel(groups, buildCatalogGroup(catalogPermissions)) : groups;
  const withRawMaterial = rawMaterialPermissions.length ? insertGroupByLabel(withCatalog, buildRawMaterialGroup(rawMaterialPermissions)) : withCatalog;
  return purchaseDashboardPermissions.length
    ? insertGroupByLabel(withRawMaterial, buildPurchaseDashboardGroup(purchaseDashboardPermissions))
    : withRawMaterial;
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
