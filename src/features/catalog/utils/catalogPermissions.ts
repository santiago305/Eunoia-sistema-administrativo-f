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

const canWithLegacy = (can: PermissionChecker, permission: string, legacyPermission: string) =>
  can(permission) || can(legacyPermission);

export const getProductCatalogPermissions = (
  productType: ProductCatalogProductType,
  can: PermissionChecker,
): ProductCatalogPermissions => {
  const prefix = isMaterialType(productType) ? "materials" : "products";

  return {
    viewDetail: canWithLegacy(can, `${prefix}.view_detail`, "catalog.read"),
    create: canWithLegacy(can, `${prefix}.create`, "catalog.manage"),
    update: canWithLegacy(can, `${prefix}.update`, "catalog.manage"),
    delete: canWithLegacy(can, `${prefix}.delete`, "catalog.manage"),
    restore: canWithLegacy(can, `${prefix}.restore`, "catalog.manage"),
    export: canWithLegacy(can, `${prefix}.export`, "catalog.export"),
    createSku: canWithLegacy(can, `${prefix}.skus.create`, "catalog.manage"),
    updateSku: canWithLegacy(can, `${prefix}.skus.update`, "catalog.manage"),
    manageRecipes: prefix === "products" && canWithLegacy(can, "products.recipes.manage", "catalog.manage"),
    manageEquivalences: canWithLegacy(can, `${prefix}.equivalences.manage`, "catalog.manage"),
  };
};

export const getInventoryPermissions = (
  productType: ProductCatalogProductType,
  can: PermissionChecker,
): InventoryPermissions => {
  const isMaterial = isMaterialType(productType);

  return {
    export: canWithLegacy(
      can,
      isMaterial ? "inventory.materials.export" : "inventory.products.export",
      "catalog.export",
    ),
    forecast: canWithLegacy(can, "inventory.forecast.view", "catalog.read"),
    realtime: canWithLegacy(can, "inventory.realtime.view", "catalog.read"),
    viewMovements: canWithLegacy(
      can,
      isMaterial ? "inventory-ledger.materials.view" : "inventory-ledger.products.view",
      "catalog.read",
    ),
    createTransfer: canWithLegacy(
      can,
      isMaterial ? "transfers.materials.create" : "transfers.products.create",
      "catalog.manage",
    ),
    createAdjustment: canWithLegacy(
      can,
      isMaterial ? "adjustments.materials.create" : "adjustments.products.create",
      "catalog.manage",
    ),
    alertSettings: canWithLegacy(can, "inventory-alerts.configure", "catalog.manage"),
  };
};

export const getInventoryMovementPermissions = (
  productType: ProductCatalogProductType,
  can: PermissionChecker,
) => ({
  export: canWithLegacy(
    can,
    isMaterialType(productType) ? "inventory-ledger.materials.export" : "inventory-ledger.products.export",
    "catalog.export",
  ),
});

export const getTransferPermissions = (
  productType: InventoryDocumentProductType,
  can: PermissionChecker,
): InventoryDocumentPermissions => {
  const prefix = isMaterialType(productType) ? "transfers.materials" : "transfers.products";

  return {
    create: canWithLegacy(can, `${prefix}.create`, "catalog.manage"),
    process: canWithLegacy(can, `${prefix}.process`, "catalog.manage"),
    export: canWithLegacy(can, `${prefix}.export`, "catalog.export"),
  };
};

export const getAdjustmentPermissions = (
  productType: InventoryDocumentProductType,
  can: PermissionChecker,
): InventoryDocumentPermissions => {
  const prefix = isMaterialType(productType) ? "adjustments.materials" : "adjustments.products";

  return {
    create: canWithLegacy(can, `${prefix}.create`, "catalog.manage"),
    process: canWithLegacy(can, `${prefix}.process`, "catalog.manage"),
    export: canWithLegacy(can, `${prefix}.export`, "catalog.export"),
  };
};

export const getPackPermissions = (can: PermissionChecker) => ({
  viewDetail: canWithLegacy(can, "packs.view_detail", "packs.read"),
  create: canWithLegacy(can, "packs.create", "packs.manage"),
  update: canWithLegacy(can, "packs.update", "packs.manage"),
  delete: canWithLegacy(can, "packs.delete", "packs.manage"),
  restore: canWithLegacy(can, "packs.restore", "packs.manage"),
  export: canWithLegacy(can, "packs.export", "packs.manage"),
});
