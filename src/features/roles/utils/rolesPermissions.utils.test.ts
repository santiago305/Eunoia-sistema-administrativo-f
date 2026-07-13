import { describe, expect, it } from "vitest";
import type { AccessPermissionItem } from "@/shared/services/accessControlService";
import { groupByModule } from "./rolesPermissions.utils";

const permission = (
  code: string,
  module: string,
  resource: string,
  name = code,
): AccessPermissionItem => ({
  id: code,
  code,
  name,
  description: `Permite ${name}`,
  module,
  resource,
  action: code.split(".").pop() ?? "view",
  type: code.startsWith("page.") ? "page" : "action",
  isSystem: false,
  isActive: true,
});

describe("rolesPermissions.utils", () => {
  it("keeps catalog and raw material separated while grouping each module by page sections", () => {
    const groups = groupByModule([
      permission("page.products.view", "catalog", "products", "Ver productos"),
      permission("products.create", "catalog", "products", "Crear productos"),
      permission("page.materials.view", "raw_material", "materials", "Ver materia prima"),
      permission("materials.create", "raw_material", "materials", "Crear materia prima"),
      permission("packs.create", "packs", "packs", "Crear packs"),
      permission("transfers.products.create", "catalog", "transfers_products", "Crear transferencias de productos"),
      permission("transfers.materials.process", "raw_material", "transfers_materials", "Procesar transferencias de materia prima"),
      permission("adjustments.products.export", "catalog", "adjustments_products", "Exportar ajustes de productos"),
      permission("inventory.products.export", "catalog", "inventory_products", "Exportar inventario de productos"),
      permission("inventory.materials.export", "raw_material", "inventory_materials", "Exportar inventario de materia prima"),
      permission("inventory-ledger.products.view", "catalog", "inventory_ledger_products", "Ver movimientos de productos"),
      permission("purchases.read", "purchases", "purchases", "Consultar compras"),
    ]);

    const catalog = groups.find((group) => group.module === "catalog");
    expect(catalog?.label).toBe("Catálogo");
    expect(catalog?.permissions.map((item) => item.code)).toEqual([
      "page.products.view",
      "products.create",
      "packs.create",
      "transfers.products.create",
      "adjustments.products.export",
      "inventory.products.export",
      "inventory-ledger.products.view",
    ]);
    expect(catalog?.subgroups?.map((subgroup) => subgroup.key)).toEqual([
      "products",
      "packs",
      "transfers",
      "adjustments",
      "inventory",
      "movements",
    ]);
    expect(catalog?.subgroups?.find((subgroup) => subgroup.key === "products")?.permissions.map((item) => item.code)).toEqual([
      "page.products.view",
      "products.create",
    ]);
    expect(catalog?.subgroups?.find((subgroup) => subgroup.key === "transfers")?.permissions.map((item) => item.code)).toEqual([
      "transfers.products.create",
    ]);

    const rawMaterial = groups.find((group) => group.module === "raw_material");
    expect(rawMaterial?.label).toBe("Materia prima");
    expect(rawMaterial?.permissions.map((item) => item.code)).toEqual([
      "page.materials.view",
      "materials.create",
      "transfers.materials.process",
      "inventory.materials.export",
    ]);
    expect(rawMaterial?.subgroups?.map((subgroup) => subgroup.key)).toEqual([
      "materials",
      "transfers",
      "inventory",
    ]);
    expect(rawMaterial?.subgroups?.find((subgroup) => subgroup.key === "materials")?.permissions.map((item) => item.code)).toEqual([
      "page.materials.view",
      "materials.create",
    ]);
    expect(groups.find((group) => group.module === "packs")).toBeUndefined();
    expect(groups.find((group) => group.module === "purchases")?.permissions.map((item) => item.code)).toEqual([
      "purchases.read",
    ]);
  });

  it("groups purchase dashboard permissions by dashboard data area", () => {
    const groups = groupByModule([
      permission("purchases_dashboard.view", "purchases_dashboard", "purchases_dashboard", "Ver dashboard de compras"),
      permission("purchases_dashboard.view_costs", "purchases_dashboard", "purchases_dashboard", "Ver costos"),
      permission("purchases_dashboard.view_payments", "purchases_dashboard", "purchases_dashboard", "Ver pagos"),
      permission("purchases_dashboard.view_suppliers", "purchases_dashboard", "purchases_dashboard", "Ver proveedores"),
      permission("purchases_dashboard.view_items", "purchases_dashboard", "purchases_dashboard", "Ver items"),
      permission("purchases_dashboard.view_operations", "purchases_dashboard", "purchases_dashboard", "Ver operaciones"),
    ]);

    const dashboard = groups.find((group) => group.module === "purchases_dashboard");

    expect(dashboard?.label).toBe("Dashboard de compras");
    expect(dashboard?.directPermissions?.map((item) => item.code)).toEqual(["purchases_dashboard.view"]);
    expect(dashboard?.subgroups?.map((subgroup) => [subgroup.key, subgroup.label])).toEqual([
      ["costs", "Costos"],
      ["payments", "Pagos"],
      ["suppliers", "Proveedores"],
      ["items", "Items"],
      ["operations", "Operaciones"],
    ]);
    expect(dashboard?.subgroups?.find((subgroup) => subgroup.key === "costs")?.permissions.map((item) => item.code)).toEqual([
      "purchases_dashboard.view_costs",
    ]);
    expect(dashboard?.subgroups?.find((subgroup) => subgroup.key === "payments")?.permissions.map((item) => item.code)).toEqual([
      "purchases_dashboard.view_payments",
    ]);
    expect(dashboard?.subgroups?.find((subgroup) => subgroup.key === "suppliers")?.permissions.map((item) => item.code)).toEqual([
      "purchases_dashboard.view_suppliers",
    ]);
    expect(dashboard?.subgroups?.find((subgroup) => subgroup.key === "items")?.permissions.map((item) => item.code)).toEqual([
      "purchases_dashboard.view_items",
    ]);
    expect(dashboard?.subgroups?.find((subgroup) => subgroup.key === "operations")?.permissions.map((item) => item.code)).toEqual([
      "purchases_dashboard.view_operations",
    ]);
  });

  it("keeps dashboard, purchases, and recurring purchases as consecutive permission groups", () => {
    const groups = groupByModule([
      permission("payments.read", "payments", "payments", "Consultar pagos"),
      permission("purchases.view", "purchases", "purchases", "Consultar compras"),
      permission("recurring_purchases.view", "recurring_purchases", "recurring_purchases", "Consultar recurrentes"),
      permission("purchases_dashboard.view", "purchases_dashboard", "purchases_dashboard", "Ver dashboard de compras"),
    ]);

    expect(groups.map((group) => group.module)).toEqual([
      "purchases_dashboard",
      "purchases",
      "recurring_purchases",
      "payments",
    ]);
    expect(groups.find((group) => group.module === "recurring_purchases")?.label).toBe("Compras recurrentes");
  });
});
