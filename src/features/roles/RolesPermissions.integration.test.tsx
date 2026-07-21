import { act, render, screen } from "@testing-library/react";
import { AxiosError } from "axios";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RolesPermissions from "./RolesPermissions";
import { errorResponse } from "@/shared/common/utils/response";
import { createRole, findAllRoles } from "@/shared/services/roleService";
import { assignPermissionsToRole, listAccessPermissions, listRolePermissions } from "@/shared/services/accessControlService";

const showFeedback = vi.fn();
const can = vi.fn((permission: string) => ["roles.assign_permissions", "roles.create"].includes(permission));

vi.mock("@/shared/hooks/useFeedbackToast", () => ({
  useFeedbackToast: () => ({ showFeedback, clearFeedback: vi.fn() }),
}));
vi.mock("@/shared/hooks/usePermissions", () => ({ usePermissions: () => ({ can }) }));
vi.mock("@/shared/services/roleService", () => ({
  createRole: vi.fn(),
  deactivateRole: vi.fn(),
  findAllRoles: vi.fn(),
  updateRole: vi.fn(),
}));
vi.mock("@/shared/services/accessControlService", () => ({
  assignPermissionsToRole: vi.fn(),
  listAccessPermissions: vi.fn(),
  listRolePermissions: vi.fn(),
}));
vi.mock("@/features/mail/services/messages.service", () => ({
  listMailLabels: vi.fn(),
  listModuleLabelConfigs: vi.fn(),
  upsertModuleLabelConfig: vi.fn(),
}));
vi.mock("@/shared/layouts/PageShell", () => ({ PageShell: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock("@/shared/components/ui/tooltip", () => ({ TooltipProvider: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock("@/features/roles/components/RolesPermissionsHeader", () => ({
  RolesPermissionsHeader: ({ onCreateRole, onSave, canCreateRoles, canAssignRolePermissions }: { onCreateRole: () => void; onSave: () => void; canCreateRoles: boolean; canAssignRolePermissions: boolean }) => (
    <><button onClick={onCreateRole} disabled={!canCreateRoles}>Nuevo rol</button><button onClick={onSave} disabled={!canAssignRolePermissions}>Guardar cambios</button></>
  ),
}));
vi.mock("@/features/roles/components/CreateRoleModal", () => ({
  CreateRoleModal: ({ open, onCreate }: { open: boolean; onCreate: (description: string) => Promise<void> }) => open ? <button onClick={() => void onCreate("Operaciones")}>Confirmar nuevo rol</button> : null,
}));
vi.mock("@/features/roles/components/RoleModuleConfigPanel", () => ({ RoleModuleConfigPanel: () => null }));
vi.mock("@/features/roles/components/RolesManagementPanel", () => ({ RolesManagementPanel: () => null }));
vi.mock("@/features/roles/components/RolePermissionsMatrix", () => ({ RolePermissionsMatrix: () => null }));
vi.mock("@/features/roles/components/RolesPermissionsSkeleton", () => ({ RolesPermissionsSkeleton: () => <div>Cargando</div> }));

describe("RolesPermissions integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    can.mockImplementation((permission: string) => ["roles.assign_permissions", "roles.create"].includes(permission));
    vi.mocked(findAllRoles).mockResolvedValue([{ id: "role-1", description: "operaciones", deleted: false }] as never);
    vi.mocked(listAccessPermissions).mockResolvedValue([]);
    vi.mocked(listRolePermissions).mockResolvedValue({ roleId: "role-1", roleDescription: "operaciones", permissions: [] });
    vi.mocked(assignPermissionsToRole).mockResolvedValue({});
  });

  it("shows the backend safe message when creating a role fails", async () => {
    vi.mocked(createRole).mockRejectedValue(new AxiosError("conflict", "ERR_BAD_REQUEST", undefined, undefined, {
      data: { message: "El rol operaciones ya existe" }, status: 409, statusText: "Conflict", headers: {}, config: {} as never,
    }));
    render(<RolesPermissions />);
    await screen.findByRole("button", { name: "Nuevo rol" });
    await act(async () => { screen.getByRole("button", { name: "Nuevo rol" }).click(); });
    await act(async () => { screen.getByRole("button", { name: "Confirmar nuevo rol" }).click(); });

    expect(showFeedback).toHaveBeenCalledWith(errorResponse("El rol operaciones ya existe"));
  });

  it("hides blocked actions and saves the matrix once when authorized", async () => {
    const authorizedRender = render(<RolesPermissions />);
    await screen.findByRole("button", { name: "Guardar cambios" });
    await act(async () => { screen.getByRole("button", { name: "Guardar cambios" }).click(); });
    expect(assignPermissionsToRole).toHaveBeenCalledTimes(1);

    authorizedRender.unmount();
    can.mockReturnValue(false);
    render(<RolesPermissions />);
    expect(await screen.findByRole("button", { name: "Nuevo rol" })).toBeDisabled();
    expect(await screen.findByRole("button", { name: "Guardar cambios" })).toBeDisabled();
  });
});
