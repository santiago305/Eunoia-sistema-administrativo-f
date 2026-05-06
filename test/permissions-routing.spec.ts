import { describe, expect, it } from "vitest";
import { canAccessRoute, getFirstAccessibleProtectedPath } from "@/routes/config/routeAccess";
import { getRouteMetaByPath, routesConfig } from "@/routes/config/routesConfig";
import { RoutesPaths } from "@/routes/config/routesPaths";

describe("permissions routing regression", () => {
  it("denies /pagos when page.payments.view is missing", () => {
    const meta = getRouteMetaByPath(RoutesPaths.payments);
    const canAccess = canAccessRoute(meta, "admin", []);
    expect(canAccess).toBe(false);
  });

  it("allows /pagos when page.payments.view is present", () => {
    const meta = getRouteMetaByPath(RoutesPaths.payments);
    const canAccess = canAccessRoute(meta, "adviser", ["page.payments.view"]);
    expect(canAccess).toBe(true);
  });

  it("resolves first protected route from permissions only", () => {
    const path = getFirstAccessibleProtectedPath(null, ["page.providers.view"]);
    expect(path).toBe(RoutesPaths.providers);
  });

  it("allows production page only with page.production.view", () => {
    const meta = getRouteMetaByPath(RoutesPaths.production);
    expect(canAccessRoute(meta, null, [])).toBe(false);
    expect(canAccessRoute(meta, null, ["page.production.view"])).toBe(true);
  });

  it("allows providers page only with page.providers.view", () => {
    const meta = getRouteMetaByPath(RoutesPaths.providers);
    expect(canAccessRoute(meta, null, [])).toBe(false);
    expect(canAccessRoute(meta, null, ["page.providers.view"])).toBe(true);
  });

  it("keeps all protected route metadata without rolesAllowed residual", () => {
    const protectedRoutesWithRoles = routesConfig.filter(
      (route) => route.isProtected && Array.isArray(route.rolesAllowed) && route.rolesAllowed.length > 0,
    );
    expect(protectedRoutesWithRoles).toHaveLength(0);
  });
});
