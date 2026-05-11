import { memo, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { getSidebarItems } from "@/shared/config/sidebarConfig";
import SidebarItemComponent from "./SidebarItem";
import { getRouteMetaByUrl } from "@/routes/config/routesConfig";
import { useAuth } from "@/shared/hooks/useAuth";
import type { SidebarItem } from "./types";

const normalizeRole = (role?: string | null) =>
  String(role ?? "").trim().toLowerCase();

const canAccessHref = (
  href: string | undefined,
  role: string | null,
  permissions: string[],
  isSuperAdmin: boolean,
) => {
  if (!href) return true;

  const hrefPath = href.split("?")[0];
  const routeMeta = getRouteMetaByUrl(hrefPath);
  if (!routeMeta) return false;

  const hasRoleRestriction = Array.isArray(routeMeta.rolesAllowed) && routeMeta.rolesAllowed.length > 0;
  const hasPermissionRestriction =
    Array.isArray(routeMeta.permissionsAllowed) && routeMeta.permissionsAllowed.length > 0;
  if (routeMeta.superAdminOnly && !isSuperAdmin) return false;

  if (hasRoleRestriction) {
    const currentRole = normalizeRole(role);
    const allowed = routeMeta.rolesAllowed!.map(normalizeRole);
    if (!allowed.includes(currentRole)) return false;
  }

  if (hasPermissionRestriction) {
    return routeMeta.permissionsAllowed!.every((permission) =>
      permissions.includes(permission)
    );
  }

  return true;
};

const SidebarBody = () => {
  const { userRole, permissions, isSuperAdmin } = useAuth();
  const location = useLocation();

  const items = useMemo(() => {
    const filtered = getSidebarItems(location.pathname)
      .map((item): SidebarItem => {
        const children = item.children?.filter((child) =>
          canAccessHref(child.href, userRole, permissions, isSuperAdmin)
        );

        return { ...item, children };
      })
      .filter((item) => {
        const hasVisibleChildren = Boolean(item.children?.length);
        const hasVisibleHref = canAccessHref(item.href, userRole, permissions, isSuperAdmin);

        // Un item padre sin href se muestra solo si tiene hijos visibles.
        if (!item.href) return hasVisibleChildren;

        return hasVisibleHref || hasVisibleChildren;
      });

    return filtered;
  }, [isSuperAdmin, location.pathname, permissions, userRole]);

  return (
    <div className="scroll-area flex-1 overflow-y-auto px-2 py-4 select-none">
      <nav>
        {items.map((item) => (
          <SidebarItemComponent key={item.href ?? item.label} item={item} />
        ))}
      </nav>
    </div>
  );
};

export default memo(SidebarBody);


