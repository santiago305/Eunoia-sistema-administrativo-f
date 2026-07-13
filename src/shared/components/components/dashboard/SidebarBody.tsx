import { memo, useEffect, useMemo, useState } from "react";
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
import { updateMyMailStorageQuota } from "@/features/mail/services/messages.service";
import { useSidebarContext } from "./SidebarContext";
import { Database } from "lucide-react";

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
  const { isCollapsed, isMobile } = useSidebarContext();
  const location = useLocation();
  const isNotifications = location.pathname.startsWith(RoutesPaths.notifications);
  const { counts: notificationCounts, labels: mailLabels, storage, reloadStorage } = useMailDashboardContext();
  const { can } = usePermissions();
  const canCreateLabel = can("notifications.labels.create");
  const [quotaDraft, setQuotaDraft] = useState<number>(1);
  const [savingQuota, setSavingQuota] = useState(false);
  const isSidebarCollapsed = isCollapsed && !isMobile;
  const usedPercent = Math.max(0, Math.min(100, storage.usedPercent || 0));
  const usedMb = (storage.usedBytes / (1024 * 1024)).toFixed(1);
  const quotaMb = (storage.quotaBytes / (1024 * 1024)).toFixed(1);

  useEffect(() => {
    setQuotaDraft(Math.max(1, Math.min(5, Math.trunc(Number(storage.quotaGb || 1)))));
  }, [storage.quotaGb]);

  const items = useMemo(() => {
    const sourceItems = isNotifications
      ? getMailSidebarItems(notificationCounts, mailLabels, canCreateLabel)
      : getSidebarItems();

    const filtered = sourceItems
      .map((item): SidebarItem => {
        const children = item.children?.filter((child) =>
          canAccessHref(child.href, userRole, permissions, isSuperAdmin)
        );
        const hasVisibleHref = canAccessHref(item.href, userRole, permissions, isSuperAdmin);

        return { ...item, href: hasVisibleHref ? item.href : undefined, children };
      })
      .filter((item) => {
        const hasVisibleChildren = Boolean(item.children?.length);
        const hasVisibleHref = Boolean(item.href);

        // Un item sin href se muestra si es accion local (ej: Redactar) o tiene hijos visibles.
        if (!item.href) return Boolean(item.isComposeAction) || hasVisibleChildren;

        return hasVisibleHref || hasVisibleChildren;
      });

    return filtered;
  }, [canCreateLabel, isSuperAdmin, isNotifications, mailLabels, notificationCounts, permissions, userRole]);

  const handleSaveOwnQuota = async () => {
    const safeValue = Math.max(1, Math.min(5, Math.trunc(Number(quotaDraft || 1))));
    setSavingQuota(true);
    try {
      await updateMyMailStorageQuota(safeValue);
      await reloadStorage();
    } finally {
      setSavingQuota(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col select-none">
      <div className="scroll-area min-h-0 flex-1 overflow-y-auto px-2 py-4 lg:pr-1">
        <nav>
          {items.map((item) => (
            <SidebarItemComponent key={item.href ?? item.label} item={item} />
          ))}
        </nav>
      </div>
      {isNotifications ? (
        <div className="border-t border-sidebar-border/70 px-2 pb-3 pt-2 lg:pr-1">
          {isSidebarCollapsed ? (
            <div
              className="rounded-lg border border-sidebar-border/70 bg-sidebar-accent/40 px-1.5 py-2"
              title={`Almacenamiento: ${usedMb} MB / ${quotaMb} MB (${Math.round(usedPercent)}%)`}
            >
              <div className="mx-auto grid h-6 w-6 place-items-center rounded-md bg-sidebar-accent text-sidebar-foreground">
                <Database className="h-3.5 w-3.5" />
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-sidebar-border/70">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${usedPercent}%` }}
                />
              </div>
              <p className="mt-1 text-center text-[9px] font-semibold text-sidebar-muted">
                {Math.round(usedPercent)}%
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-sidebar-border/70 bg-sidebar-accent/40 p-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-sidebar-muted">Almacenamiento</p>
              <p className="mt-1 text-[11px] text-sidebar-foreground">
                {usedMb} MB / {quotaMb} MB
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sidebar-border/70">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${usedPercent}%` }}
                />
              </div>
              {isSuperAdmin ? (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={5}
                    step={1}
                    value={quotaDraft}
                    onChange={(event) => setQuotaDraft(Number(event.target.value || 1))}
                    className="h-7 w-14 rounded border border-sidebar-border bg-background px-2 text-[11px] outline-none"
                  />
                  <span className="text-[11px] text-sidebar-muted">GB</span>
                  <button
                    type="button"
                    onClick={() => void handleSaveOwnQuota()}
                    disabled={savingQuota}
                    className="ml-auto rounded border border-sidebar-border bg-background px-2 py-1 text-[10px] font-medium hover:bg-sidebar-accent disabled:opacity-60"
                  >
                    {savingQuota ? "..." : "Guardar"}
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default memo(SidebarBody);





