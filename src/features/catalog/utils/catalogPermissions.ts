import { ProductTypes } from "@/features/catalog/types/ProductTypes";
import type { ProductCatalogProductType } from "@/features/catalog/types/product";
import { InventoryDocumentProductType } from "@/features/catalog/types/documentInventory";

type PermissionChecker = (permission: string) => boolean;

export type ProductCatalogPermissions = {
  viewDetail: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
  restore: boolean;
  export: boolean;
  createSku: boolean;
  updateSku: boolean;
  manageRecipes: boolean;
  manageEquivalences: boolean;
};

export type InventoryPermissions = {
  export: boolean;
  forecast: boolean;
  realtime: boolean;
  viewMovements: boolean;
  createTransfer: boolean;
  createAdjustment: boolean;
  alertSettings: boolean;
};

export type InventoryDocumentPermissions = {
  create: boolean;
  process: boolean;
  export: boolean;
};

const isMaterialType = (productType: ProductCatalogProductType | InventoryDocumentProductType | string) =>
  productType === ProductTypes.MATERIAL || productType === InventoryDocumentProductType.MATERIAL;

const permissionType = (productType: ProductCatalogProductType | InventoryDocumentProductType | string) => {
  if (isMaterialType(productType)) return "materials";
  if (productType === ProductTypes.SUPPLY || productType === InventoryDocumentProductType.SUPPLY) return "supplies";
  return "products";
};

const canWithLegacy = (can: PermissionChecker, permission: string, legacyPermission: string) =>
  can(permission) || can(legacyPermission);

export const getProductCatalogPermissions = (
  productType: ProductCatalogProductType,
  can: PermissionChecker,
): ProductCatalogPermissions => {
  const prefix = permissionType(productType);

  return {
    viewDetail: canWithLegacy(can, `${prefix}.view_detail`, "catalog.read"),
    create: can(`${prefix}.create`),
    update: can(`${prefix}.update`),
    delete: can(`${prefix}.delete`),
    restore: can(`${prefix}.restore`),
    export: can(`${prefix}.export`),
    createSku: can(`${prefix}.create`),
    updateSku: can(`${prefix}.update`),
    manageRecipes: prefix === "products" && can("products.recipes.manage"),
    manageEquivalences: can(`${prefix}.equivalences.manage`),
  };
};

export const getInventoryPermissions = (
  productType: ProductCatalogProductType,
  can: PermissionChecker,
): InventoryPermissions => {
  const type = permissionType(productType);

  return {
    export: can(`inventory.${type}.export`),
    forecast: canWithLegacy(can, "inventory.forecast.view", "catalog.read"),
    realtime: canWithLegacy(can, "inventory.realtime.view", "catalog.read"),
    viewMovements: canWithLegacy(
      can,
      `inventory-ledger.${type}.view`,
      "catalog.read",
    ),
    createTransfer: can(`transfers.${type}.create`),
    createAdjustment: can(`adjustments.${type}.create`),
    alertSettings: can("inventory-alerts.configure"),
  };
};

export const getInventoryMovementPermissions = (
  productType: ProductCatalogProductType,
  can: PermissionChecker,
) => ({
  export: can(`inventory-ledger.${permissionType(productType)}.export`),
});

export const getTransferPermissions = (
  productType: InventoryDocumentProductType,
  can: PermissionChecker,
): InventoryDocumentPermissions => {
  const prefix = `transfers.${permissionType(productType)}`;

  return {
    create: can(`${prefix}.create`),
    process: can(`${prefix}.process`),
    export: can(`${prefix}.export`),
  };
};

export const getAdjustmentPermissions = (
  productType: InventoryDocumentProductType,
  can: PermissionChecker,
): InventoryDocumentPermissions => {
  const prefix = `adjustments.${permissionType(productType)}`;

  return {
    create: can(`${prefix}.create`),
    process: can(`${prefix}.process`),
    export: can(`${prefix}.export`),
  };
};

export const getPackPermissions = (can: PermissionChecker) => ({
  viewDetail: canWithLegacy(can, "packs.view_detail", "packs.read"),
  create: can("packs.create"),
  update: can("packs.update"),
  delete: can("packs.delete"),
  restore: can("packs.restore"),
  export: can("packs.export"),
});
