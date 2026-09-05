import { describe, expect, it } from "vitest";
import { canAccessRoute } from "./routeAccess";
import { routesConfig } from "./routesConfig";
import { RoutesPaths } from "./routesPaths";

describe("adviser route permissions", () => {
  it("requires both the page and base adviser permissions", () => {
    const route = routesConfig.find(
      (item) => item.path === RoutesPaths.advisers,
    );

    expect(route?.permissionsAllowed).toEqual([
      "page.advisers.view",
      "advisers.view",
    ]);
    expect(canAccessRoute(route, "admin", ["page.advisers.view"])).toBe(false);
    expect(
      canAccessRoute(route, "admin", ["page.advisers.view", "advisers.view"]),
    ).toBe(true);
  });
});
