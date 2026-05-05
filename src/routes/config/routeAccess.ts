import { routesConfig } from "./routesConfig";
import { RoutesPaths } from "./routesPaths";
import type { RouteMetadata } from "../types/RouterTypes";

const normalizeRole = (role?: string | null) => String(role ?? "").trim().toLowerCase();

export const canAccessRoute = (
  routeMeta: RouteMetadata | undefined,
  role: string | null,
  permissions: string[],
) => {
  if (!routeMeta) return false;
  if (routeMeta.isAuthRoute || routeMeta.isPublic) return true;

  const hasRoleRestriction = Array.isArray(routeMeta.rolesAllowed) && routeMeta.rolesAllowed.length > 0;
  const hasPermissionRestriction =
    Array.isArray(routeMeta.permissionsAllowed) && routeMeta.permissionsAllowed.length > 0;

  if (hasRoleRestriction) {
    const currentRole = normalizeRole(role);
    const allowed = routeMeta.rolesAllowed!.map(normalizeRole);
    if (!allowed.includes(currentRole)) return false;
  }

  if (hasPermissionRestriction) {
    return routeMeta.permissionsAllowed!.every((permission) => permissions.includes(permission));
  }

  return Boolean(routeMeta.isProtected);
};

export const getFirstAccessibleProtectedPath = (
  role: string | null,
  permissions: string[],
  preferredPath?: string | null,
): string | null => {
  if (preferredPath) {
    const preferredRoute = routesConfig.find((route) => route.path === preferredPath);
    if (preferredRoute && canAccessRoute(preferredRoute, role, permissions)) {
      return preferredRoute.path;
    }
  }

  const candidates = routesConfig.filter((route) => {
    if (!route.isProtected) return false;
    if (!route.path || route.path === "*" || route.path.includes(":")) return false;
    return canAccessRoute(route, role, permissions);
  });

  if (!candidates.length) return null;

  const dashboard = candidates.find((route) => route.path === RoutesPaths.dashboard);
  if (dashboard) return dashboard.path;

  return candidates[0].path;
};
