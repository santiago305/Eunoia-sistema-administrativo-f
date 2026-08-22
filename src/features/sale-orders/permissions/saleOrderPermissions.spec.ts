import { describe, expect, it } from "vitest";
import { SALE_ORDER_PERMISSIONS, SALE_ORDER_PAGE_PERMISSION } from "./saleOrderPermissions";

describe("sale order permission catalog", () => {
  it("exposes the page gate and every permission used by order capabilities", () => {
    expect(SALE_ORDER_PAGE_PERMISSION).toBe("page.sale-orders.view");
    expect(SALE_ORDER_PERMISSIONS.view).toBe("sale_orders.view");
    expect(SALE_ORDER_PERMISSIONS.import).toBe("sale_orders.import");
    expect(SALE_ORDER_PERMISSIONS.export).toBe("sale_orders.export");
    expect(SALE_ORDER_PERMISSIONS.viewDeleted).toBe("sale_orders.view_deleted");
    expect(SALE_ORDER_PERMISSIONS.restore).toBe("sale_orders.restore");
    expect(SALE_ORDER_PERMISSIONS.advancedOrders).toBe(
      "sale_orders.advanced_orders",
    );
    expect(SALE_ORDER_PERMISSIONS).not.toHaveProperty("preguideUpdate");
    expect(SALE_ORDER_PERMISSIONS).not.toHaveProperty("preparedUpdate");
  });
});
