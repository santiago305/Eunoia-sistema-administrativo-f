import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/shared/components/ui/tooltip";
import type { AccessPermissionItem } from "@/shared/services/accessControlService";
import type { PermissionModuleGroup } from "@/features/roles/types/rolesPermissions.types";
import { RolePermissionsMatrix } from "./RolePermissionsMatrix";

const permission = (code: string, name: string): AccessPermissionItem => ({
  id: code,
  code,
  name,
  description: `Permite ${name}`,
  module: "catalog",
  resource: "products",
  action: code.split(".").pop() ?? "view",
  type: "action",
  isSystem: false,
  isActive: true,
});

describe("RolePermissionsMatrix", () => {
  it("collapses and expands catalog page subgroups independently", () => {
    const productPermission = permission("products.create", "Crear productos");
    const transferPermission = permission("transfers.products.create", "Crear transferencias");
    const groupedPermissions: PermissionModuleGroup[] = [
      {
        module: "catalog",
        label: "Catálogo",
        permissions: [productPermission, transferPermission],
        subgroups: [
          { key: "products", label: "Productos", permissions: [productPermission] },
          { key: "transfers", label: "Transferencias", permissions: [transferPermission] },
        ],
      },
    ];

    render(
      <TooltipProvider>
        <RolePermissionsMatrix
          groupedPermissions={groupedPermissions}
          openModules={new Set(["catalog"])}
          selectedCodes={new Set()}
          canAssignRolePermissions
          onToggleModule={vi.fn()}
          onTogglePermission={vi.fn()}
          onToggleEveryPermissionInModule={vi.fn()}
        />
      </TooltipProvider>,
    );

    expect(screen.queryByText("Crear productos")).not.toBeInTheDocument();
    expect(screen.queryByText("Crear transferencias")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /productos/i }));

    expect(screen.getByText("Crear productos")).toBeInTheDocument();
    expect(screen.queryByText("Crear transferencias")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /productos/i }));

    expect(screen.queryByText("Crear productos")).not.toBeInTheDocument();
  });
});
