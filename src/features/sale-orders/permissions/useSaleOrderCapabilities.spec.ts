import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useSaleOrderCapabilities } from "./useSaleOrderCapabilities";

const permissions = vi.hoisted(() => ({ current: [] as string[] }));
vi.mock("@/shared/hooks/usePermissions", () => ({
  usePermissions: () => ({ permissions: permissions.current, can: (permission: string) => permissions.current.includes(permission) }),
}));

describe("useSaleOrderCapabilities", () => {
  it("derives page, list, edit and bulk capabilities", () => {
    permissions.current = [
      "page.sale-orders.view", "sale_orders.view", "sale_orders.view_detail", "sale_orders.update",
      "sale_orders.assign_adviser", "sale_orders.change_state", "sale_orders.delete",
    ];
    const { result } = renderHook(() => useSaleOrderCapabilities());
    expect(result.current.canEnter).toBe(true);
    expect(result.current.canList).toBe(true);
    expect(result.current.canEdit).toBe(true);
    expect(result.current.canSelect).toBe(true);
    expect(result.current.canBulkAssign).toBe(true);
    expect(result.current.canBulkChangeState).toBe(true);
    expect(result.current.canBulkDelete).toBe(true);
    expect(result.current.canRestore).toBe(false);
  });

  it("requires both deleted visibility and restore to restore", () => {
    permissions.current = ["sale_orders.view_deleted", "sale_orders.restore"];
    const { result } = renderHook(() => useSaleOrderCapabilities());
    expect(result.current.canViewDeleted).toBe(true);
    expect(result.current.canRestore).toBe(true);
    expect(result.current.canBulkRestore).toBe(true);
  });
});
