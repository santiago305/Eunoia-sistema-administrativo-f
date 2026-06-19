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
  it("maps product catalog actions to product permissions with legacy fallback", () => {
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
    expect(legacyPermissions.update).toBe(true);
    expect(legacyPermissions.createSku).toBe(true);
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

  it("keeps pack manage legacy permissions during transition", () => {
    const permissions = getPackPermissions(checker(["packs.manage"]));
    expect(permissions.create).toBe(true);
    expect(permissions.update).toBe(true);
    expect(permissions.delete).toBe(true);
    expect(permissions.export).toBe(true);
    expect(permissions.viewDetail).toBe(false);
  });
});
