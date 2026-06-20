import { describe, expect, it } from "vitest";
import { ProductTypes } from "@/features/catalog/types/ProductTypes";
import { InventoryDocumentProductType } from "@/features/catalog/types/documentInventory";
import {
  getAdjustmentPermissions,
  getInventoryMovementPermissions,
  getInventoryPermissions,
  getPackPermissions,
  getProductCatalogPermissions,
  getTransferPermissions,
} from "./catalogPermissions";

const checker = (permissions: string[]) => (permission: string) => permissions.includes(permission);

describe("catalog permission matrix", () => {
  it("maps product catalog actions to product permissions without legacy action fallback", () => {
    const productPermissions = getProductCatalogPermissions(
      ProductTypes.PRODUCT,
      checker(["products.create", "products.restore", "products.recipes.manage"]),
    );

    expect(productPermissions).toMatchObject({
      create: true,
      restore: true,
      manageRecipes: true,
      update: false,
      manageEquivalences: false,
    });

    const legacyPermissions = getProductCatalogPermissions(ProductTypes.PRODUCT, checker(["catalog.manage"]));
    expect(legacyPermissions.create).toBe(false);
    expect(legacyPermissions.update).toBe(false);
    expect(legacyPermissions.createSku).toBe(false);
  });

  it("uses product and material create/update permissions for SKU create/update", () => {
    expect(
      getProductCatalogPermissions(ProductTypes.PRODUCT, checker(["products.create", "products.update"])),
    ).toMatchObject({
      create: true,
      update: true,
      createSku: true,
      updateSku: true,
    });

    expect(
      getProductCatalogPermissions(ProductTypes.MATERIAL, checker(["materials.create", "materials.update"])),
    ).toMatchObject({
      create: true,
      update: true,
      createSku: true,
      updateSku: true,
    });
  });

  it("keeps denied product and material actions disabled even when broad catalog permissions exist", () => {
    const broadPermissions = checker(["catalog.manage", "catalog.export", "products.recipes.manage"]);

    expect(getProductCatalogPermissions(ProductTypes.PRODUCT, broadPermissions)).toMatchObject({
      create: false,
      update: false,
      delete: false,
      restore: false,
      export: false,
      createSku: false,
      updateSku: false,
      manageRecipes: true,
      manageEquivalences: false,
    });

    expect(getProductCatalogPermissions(ProductTypes.MATERIAL, broadPermissions)).toMatchObject({
      create: false,
      update: false,
      delete: false,
      restore: false,
      export: false,
      createSku: false,
      updateSku: false,
      manageRecipes: false,
      manageEquivalences: false,
    });
  });

  it("maps material catalog actions to material permissions and never enables recipes", () => {
    const permissions = getProductCatalogPermissions(
      ProductTypes.MATERIAL,
      checker(["materials.create", "materials.equivalences.manage", "products.recipes.manage"]),
    );

    expect(permissions.create).toBe(true);
    expect(permissions.manageEquivalences).toBe(true);
    expect(permissions.manageRecipes).toBe(false);
  });

  it("maps inventory and movement exports by product type", () => {
    const productInventory = getInventoryPermissions(
      ProductTypes.PRODUCT,
      checker([
        "inventory.products.export",
        "inventory.forecast.view",
        "transfers.products.create",
        "inventory-alerts.configure",
      ]),
    );
    expect(productInventory.export).toBe(true);
    expect(productInventory.forecast).toBe(true);
    expect(productInventory.createTransfer).toBe(true);
    expect(productInventory.createAdjustment).toBe(false);
    expect(productInventory.alertSettings).toBe(true);

    const materialMovements = getInventoryMovementPermissions(
      ProductTypes.MATERIAL,
      checker(["inventory-ledger.materials.export"]),
    );
    expect(materialMovements.export).toBe(true);
  });

  it("keeps denied inventory actions disabled when only legacy catalog permissions exist", () => {
    const permissions = getInventoryPermissions(ProductTypes.PRODUCT, checker(["catalog.manage", "catalog.export"]));
    expect(permissions).toMatchObject({
      export: false,
      createTransfer: false,
      createAdjustment: false,
      alertSettings: false,
    });

    const movementPermissions = getInventoryMovementPermissions(ProductTypes.MATERIAL, checker(["catalog.export"]));
    expect(movementPermissions.export).toBe(false);
  });

  it("maps transfer and adjustment document permissions by document product type", () => {
    const transferPermissions = getTransferPermissions(
      InventoryDocumentProductType.MATERIAL,
      checker(["transfers.materials.create", "transfers.materials.process"]),
    );
    expect(transferPermissions).toMatchObject({ create: true, process: true, export: false });

    const adjustmentPermissions = getAdjustmentPermissions(
      InventoryDocumentProductType.PRODUCT,
      checker(["adjustments.products.export"]),
    );
    expect(adjustmentPermissions).toMatchObject({ create: false, process: false, export: true });
  });

  it("keeps denied transfer and adjustment actions disabled when only legacy catalog permissions exist", () => {
    const can = checker(["catalog.manage", "catalog.export"]);
    expect(getTransferPermissions(InventoryDocumentProductType.PRODUCT, can)).toMatchObject({
      create: false,
      process: false,
      export: false,
    });
    expect(getAdjustmentPermissions(InventoryDocumentProductType.MATERIAL, can)).toMatchObject({
      create: false,
      process: false,
      export: false,
    });
  });

  it("does not allow pack actions through legacy manage permissions", () => {
    const permissions = getPackPermissions(checker(["packs.manage"]));
    expect(permissions.create).toBe(false);
    expect(permissions.update).toBe(false);
    expect(permissions.delete).toBe(false);
    expect(permissions.export).toBe(false);
    expect(permissions.viewDetail).toBe(false);
  });
});
