import { describe, expect, it } from "vitest";
import { canAccessRoute, getFirstAccessibleProtectedPath } from "@/routes/config/routeAccess";
import { getRouteMetaByPath, routesConfig } from "@/routes/config/routesConfig";
import { RoutesPaths } from "@/routes/config/routesPaths";
import { getSidebarTitleByPath } from "@/shared/config/sidebarConfig";

describe("permissions routing regression", () => {
  it("denies /pagos when page.payments.view is missing", () => {
    const meta = getRouteMetaByPath(RoutesPaths.payments);
    const canAccess = canAccessRoute(meta, "admin", []);
    expect(canAccess).toBe(false);
  });

  it("allows /pagos when page and read payment permissions are present", () => {
    const meta = getRouteMetaByPath(RoutesPaths.payments);
    const canAccess = canAccessRoute(meta, "adviser", ["page.payments.view", "payments.read"]);
    expect(canAccess).toBe(true);
  });

  it("allows /ingresos only with income page and read permissions", () => {
    const meta = getRouteMetaByPath(RoutesPaths.income);
    expect(meta?.permissionsAllowed).toEqual(["page.income.view", "income.read"]);
    expect(canAccessRoute(meta, null, ["page.income.view"])).toBe(false);
    expect(canAccessRoute(meta, null, ["page.income.view", "income.read"])).toBe(true);
  });

  it("allows /admin-finance only with admin finance page and read permissions", () => {
    const meta = getRouteMetaByPath(RoutesPaths.adminFinance);
    expect(meta?.permissionsAllowed).toEqual(["page.admin-finance.view", "admin_finance.read"]);
    expect(canAccessRoute(meta, null, ["page.admin-finance.view"])).toBe(false);
    expect(canAccessRoute(meta, null, ["admin_finance.read"])).toBe(false);
    expect(canAccessRoute(meta, null, ["page.admin-finance.view", "admin_finance.read"])).toBe(true);
  });

  it("exposes administrative money pages in navigation titles", () => {
    expect(getSidebarTitleByPath(RoutesPaths.income)).toBe("Ingresos");
    expect(getSidebarTitleByPath(RoutesPaths.adminFinance)).toBe("Dashboard administrativo");
    expect(getSidebarTitleByPath(RoutesPaths.accountsPayable)).toBe("Cuentas por pagar");
  });

  it("resolves first protected route for authenticated users without role", () => {
    const path = getFirstAccessibleProtectedPath(null, ["page.suppliers.view"]);
    expect(path).toBe(RoutesPaths.profile);
  });

  it("allows production page only with page.production.view", () => {
    const meta = getRouteMetaByPath(RoutesPaths.production);
    expect(canAccessRoute(meta, null, [])).toBe(false);
    expect(canAccessRoute(meta, null, ["page.production.view"])).toBe(true);
  });

  it("allows providers page only with page.suppliers.view", () => {
    const meta = getRouteMetaByPath(RoutesPaths.providers);
    expect(meta?.permissionsAllowed).toEqual(["page.suppliers.view"]);
    expect(canAccessRoute(meta, null, [])).toBe(false);
    expect(canAccessRoute(meta, null, ["page.suppliers.view"])).toBe(true);
  });

  it("allows profile and sessions with authentication only", () => {
    const profileMeta = getRouteMetaByPath(RoutesPaths.profile);
    const sessionsMeta = getRouteMetaByPath(RoutesPaths.sessions);

    expect(canAccessRoute(profileMeta, null, [])).toBe(true);
    expect(canAccessRoute(sessionsMeta, null, [])).toBe(true);
  });

  it("keeps all protected route metadata without rolesAllowed residual", () => {
    const protectedRoutesWithRoles = routesConfig.filter(
      (route) => route.isProtected && Array.isArray(route.rolesAllowed) && route.rolesAllowed.length > 0,
    );
    expect(protectedRoutesWithRoles).toHaveLength(0);
  });
});
