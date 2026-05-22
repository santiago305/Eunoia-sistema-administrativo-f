import { memo, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { getSidebarItems } from "@/shared/config/sidebarConfig";
import { getMailSidebarItems } from "@/shared/config/mailSidebarConfig";
import SidebarItemComponent from "./SidebarItem";
import { getRouteMetaByUrl } from "@/routes/config/routesConfig";
import { useAuth } from "@/shared/hooks/useAuth";
import type { SidebarItem } from "./types";
import { RoutesPaths } from "@/routes/config/routesPaths";
import { useMailDashboardContext } from "@/features/mail/context/MailDashboardProvider";
import { usePermissions } from "@/shared/hooks/usePermissions";

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
  const routeMeta =
    getRouteMetaByUrl(hrefPath) ??
    (hrefPath.startsWith(`${RoutesPaths.notifications}/`)
      ? getRouteMetaByUrl(RoutesPaths.notifications)
      : undefined);
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
  const isNotifications = location.pathname.startsWith(RoutesPaths.notifications);
  const { counts: notificationCounts, labels: mailLabels, storage } = useMailDashboardContext();
  const { can } = usePermissions();
  const canCreateLabel = can("notifications.labels.create");

  const items = useMemo(() => {
    const sourceItems = isNotifications
      ? getMailSidebarItems(notificationCounts, mailLabels, canCreateLabel)
      : getSidebarItems();

    const filtered = sourceItems
      .map((item): SidebarItem => {
        const children = item.children?.filter((child) =>
          canAccessHref(child.href, userRole, permissions, isSuperAdmin)
        );

        return { ...item, children };
      })
      .filter((item) => {
        const hasVisibleChildren = Boolean(item.children?.length);
        const hasVisibleHref = canAccessHref(item.href, userRole, permissions, isSuperAdmin);

        // Un item sin href se muestra si es accion local (ej: Redactar) o tiene hijos visibles.
        if (!item.href) return Boolean(item.isComposeAction) || hasVisibleChildren;

        return hasVisibleHref || hasVisibleChildren;
      });

    return filtered;
  }, [canCreateLabel, isSuperAdmin, isNotifications, mailLabels, notificationCounts, permissions, userRole]);

  return (
    <div className="scroll-area flex-1 overflow-y-auto px-2 lg:pr-1 py-4 select-none">
      <nav>
        {items.map((item) => (
          <SidebarItemComponent key={item.href ?? item.label} item={item} />
        ))}
      </nav>
      {isNotifications ? (
        <div className="mt-4 rounded-lg border border-sidebar-border/70 bg-sidebar-accent/40 p-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-sidebar-muted">Almacenamiento</p>
          <p className="mt-1 text-[11px] text-sidebar-foreground">
            {(storage.usedBytes / (1024 * 1024)).toFixed(1)} MB / {(storage.quotaBytes / (1024 * 1024)).toFixed(1)} MB
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sidebar-border/70">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.max(0, Math.min(100, storage.usedPercent || 0))}%` }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default memo(SidebarBody);





