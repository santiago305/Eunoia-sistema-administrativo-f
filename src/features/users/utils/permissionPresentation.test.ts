import { describe, expect, it } from "vitest";
import type { AccessPermissionItem, UserPermissionOverride } from "@/shared/services/accessControlService";
import {
  buildUserPermissionGroups,
  getPermissionGroupModule,
  getPermissionModuleLabel,
  getPermissionState,
} from "./permissionPresentation";

const permission = (
  code: string,
  module: string,
  name = code,
  description = `Permite ${name}`,
): AccessPermissionItem => ({
  id: code,
  code,
  name,
  description,
  module,
  resource: module,
  action: code.split(".").pop() ?? "view",
  type: "action",
  isSystem: false,
  isActive: true,
});

describe("permissionPresentation", () => {
  it("uses Spanish labels for known modules and readable fallback labels", () => {
    expect(getPermissionModuleLabel("advisers")).toBe("Asesores");
    expect(getPermissionModuleLabel("purchases")).toBe("Compras");
    expect(getPermissionModuleLabel("raw_material")).toBe("Materia prima");
    expect(getPermissionModuleLabel("payment_methods")).toBe("Métodos de pago");
    expect(getPermissionModuleLabel("sources")).toBe("Fuentes");
    expect(getPermissionModuleLabel("sale_orders")).toBe("Pedidos");
    expect(getPermissionModuleLabel("identity")).toBe("Identidad");
    expect(getPermissionModuleLabel("bank_accounts")).toBe("Cuentas bancarias");
    expect(getPermissionModuleLabel("accounts_payable")).toBe("Cuentas por pagar");
    expect(getPermissionModuleLabel("agencies")).toBe("Agencias");
    expect(getPermissionModuleLabel("payment_accounts")).toBe("Cuentas de pago");
    expect(getPermissionModuleLabel("income")).toBe("Ingresos");
  });

  it("groups the complete income permission set under the Spanish Ingresos module", () => {
    const codes = [
      "page.income.view",
      "income.read",
      "income.view_own",
      "income.view_all",
      "income.export",
      "sale_orders.payments.update_pending",
      "sale_orders.payments.post",
      "sale_orders.payments.post_bulk",
      "sale_orders.payments.post_own",
      "sale_orders.payments.post_high_value",
      "sale_orders.payments.cancel_pending",
      "sale_orders.payments.transfer_pending",
      "sale_orders.payments.reverse_posted",
      "sale_orders.payments.correct_posted",
      "sale_orders.payments.reenter_closed",
      "payments.view_evidence",
      "payments.attach_evidence",
      "income.reconciliation.view",
      "income.reconciliation.reconcile",
      "income.reconciliation.unreconcile",
      "income.audit.view",
      "income.scope.manage",
      "income.evidence.quarantine.manage",
      "income.outbox.manage",
    ];
    const permissions = codes.map((code) => permission(code, code.startsWith("income.") ? "income" : "payments"));
    const groups = buildUserPermissionGroups({ permissions, effectivePermissions: [], overrides: [] });

    expect(getPermissionGroupModule(permissions[5])).toBe("income");
    expect(getPermissionGroupModule(permissions[15])).toBe("income");
    expect(groups).toHaveLength(1);
    expect(groups[0].module).toBe("income");
    expect(groups[0].label).toBe("Ingresos");
    expect(groups[0].totalCount).toBe(24);
    expect(groups[0].permissions.find((item) => item.code === "payments.view_evidence")?.label)
      .toBe("Ver comprobantes de ingresos");
  });

  it("detects inherited, granted and denied user permission states", () => {
    const overrides: UserPermissionOverride[] = [
      {
        id: "allow-1",
        permissionCode: "payments.manage",
        effect: "ALLOW",
        reason: "apoyo temporal",
        createdBy: "admin",
        createdAt: "2026-05-25T00:00:00.000Z",
      },
      {
        id: "deny-1",
        permissionCode: "purchases.approve_payment",
        effect: "DENY",
        reason: "control interno",
        createdBy: "admin",
        createdAt: "2026-05-25T00:00:00.000Z",
      },
    ];

    expect(getPermissionState("purchases.approve_payment", ["purchases.read"], overrides)).toBe("denied");
    expect(getPermissionState("payments.manage", ["purchases.read"], overrides)).toBe("granted");
    expect(getPermissionState("purchases.read", ["purchases.read"], overrides)).toBe("inherited");
    expect(getPermissionState("roles.read", ["purchases.read"], overrides)).toBe("none");
  });

  it("groups permissions by module with selected counts", () => {
    const groups = buildUserPermissionGroups({
      permissions: [
        permission("purchases.read", "purchases", "Ver compras"),
        permission("payments.manage", "payments", "Gestionar pagos"),
        permission("purchases.approve_payment", "purchases", "Aprobar pagos"),
      ],
      effectivePermissions: ["purchases.read", "payments.manage"],
      overrides: [],
    });

    expect(groups.map((group) => group.label)).toEqual(["Compras", "Pagos"]);
    expect(groups.find((group) => group.module === "purchases")?.selectedCount).toBe(1);
    expect(groups.find((group) => group.module === "purchases")?.permissions).toHaveLength(2);
  });
});
