import { useMemo } from "react";
import { getSidebarItems } from "@/config/sidebarConfig";
import SidebarItemComponent from "./SidebarItem";
import { getRouteMetaByUrl } from "@/Router/config/routesConfig";
import { useAuth } from "@/hooks/useAuth";
import type { SidebarItem } from "./types";

const normalizeRole = (role?: string | null) =>
  String(role ?? "").trim().toLowerCase();

const canAccessHref = (href: string | undefined, role: string | null) => {
  if (!href) return true;

  const routeMeta = getRouteMetaByUrl(href);
  if (!routeMeta) return false;

  if (!routeMeta.rolesAllowed?.length) return true;

  const currentRole = normalizeRole(role);
  const allowed = routeMeta.rolesAllowed.map(normalizeRole);
  return allowed.includes(currentRole);
};

const SidebarBody = () => {
  const { userRole } = useAuth();

  const items = useMemo(() => {
    const initialItems = getSidebarItems();

    const filtered = initialItems
      .map((item): SidebarItem => {
        const children = item.children?.filter((child) =>
          canAccessHref(child.href, userRole)
        );

        return { ...item, children };
      })
      .filter((item) => {
        const hasVisibleChildren = Boolean(item.children?.length);
        const hasVisibleHref = canAccessHref(item.href, userRole);

        // Un item padre sin href se muestra solo si tiene hijos visibles.
        if (!item.href) return hasVisibleChildren;

        return hasVisibleHref || hasVisibleChildren;
      });

    return filtered;
  }, [userRole]);

  return (
    <div className="flex-1 overflow-y-auto px-3 py-4 select-none">
      <nav>
        {items.map((item, index) => (
          <SidebarItemComponent key={item.label + index} item={item} />
        ))}
      </nav>
    </div>
  );
};

export default SidebarBody;
