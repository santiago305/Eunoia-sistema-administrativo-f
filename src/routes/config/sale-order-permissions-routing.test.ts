import { describe, expect, it } from "vitest";
import { routesConfig } from "./routesConfig";
import { RoutesPaths } from "./routesPaths";
import { canAccessRoute } from "./routeAccess";

describe("sale order route permissions", () => {
  it("requires both page and list permissions", () => {
    const route = routesConfig.find((item) => item.path === RoutesPaths.saleOrders);
    expect(route?.permissionsAllowed).toEqual(["page.sale-orders.view", "sale_orders.view"]);
    expect(canAccessRoute(route, "admin", ["page.sale-orders.view"])).toBe(false);
    expect(canAccessRoute(route, "admin", ["page.sale-orders.view", "sale_orders.view"])).toBe(true);
  });
});
