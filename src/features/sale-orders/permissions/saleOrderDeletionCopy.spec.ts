import { describe, expect, it } from "vitest";
import { buildSaleOrderDeletionCopy } from "./saleOrderDeletionCopy";

describe("sale order deletion copy", () => {
  it("promises viewing and restoring only when both permissions exist", () => {
    expect(buildSaleOrderDeletionCopy({ count: 1, canViewDeleted: true, canRestore: true })).toContain("verlo y restaurarlo");
    expect(buildSaleOrderDeletionCopy({ count: 2, canViewDeleted: true, canRestore: false })).toContain("verlos, pero no podrás restaurarlos");
    expect(buildSaleOrderDeletionCopy({ count: 1, canViewDeleted: false, canRestore: false })).toContain("No podrás recuperarlo");
    expect(buildSaleOrderDeletionCopy({ count: 2, canViewDeleted: false, canRestore: false })).not.toContain("Pedidos eliminados");
  });
});
