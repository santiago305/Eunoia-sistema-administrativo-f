import { memo } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { RoutesPaths } from "@/routes/config/routesPaths";
import { useUnreadNotificationsCount } from "@/features/notifications/hooks/useUnreadNotificationsCount";
import { cn } from "@/shared/lib/utils";
import { useSidebarContext } from "./SidebarContext";
import { IconBell, IconMenu } from "./icons";
import type { User } from "./types";
import UserMenu from "./UserMenu";
import { useCompany } from "@/shared/hooks/useCompany";
import { resolveCompanyAssetUrl } from "@/features/company/utils/companyAssets";
import { getSidebarTitleByPath } from "@/shared/config/sidebarConfig";

interface DashboardHeaderProps {
  user: User;
  onLogout: () => void;
}

const DashboardHeader = ({ user, onLogout }: DashboardHeaderProps) => {
  const { isCollapsed, isMobile, toggleSidebar } = useSidebarContext();
  const { count } = useUnreadNotificationsCount();
  const { company } = useCompany();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const unreadCount = count.unread ?? 0;
  const logoUrl = resolveCompanyAssetUrl(company?.logoPath);
  const isEmailPage = location.pathname.startsWith(RoutesPaths.notifications);
  const emailSearch = searchParams.get("q") ?? "";
  const routeTitle =
    getSidebarTitleByPath(location.pathname) ??
    ({
      [RoutesPaths.profile]: "Perfil",
      [RoutesPaths.sessions]: "Sesiones de usuario",
      [RoutesPaths.notifications]: "Email",
    }[location.pathname] ?? "");

  return (
    <header className="flex py-1">
      <div className="flex w-[180px] shrink-0 items-center gap-2 pl-1 pr-2">
        <button
          type="button"
          title={isMobile ? "Abrir menu" : isCollapsed ? "Expandir menu" : "Colapsar menu"}
          onClick={toggleSidebar}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <IconMenu />
        </button>

        <Link to={RoutesPaths.dashboard} className="min-w-0">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Logo de empresa"
              className={cn("h-9 w-auto max-w-[140px] object-contain", isCollapsed && !isMobile ? "opacity-70" : "opacity-100")}
            />
          ) : null}
        </Link>
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-between gap-2 pr-3">
        <div className="min-w-0">
          {isEmailPage ? (
            <input
              value={emailSearch}
              onChange={(event) => {
                const next = new URLSearchParams(searchParams);
                const value = event.target.value.trim();
                if (value) next.set("q", value);
                else next.delete("q");
                setSearchParams(next, { replace: true });
              }}
              placeholder="Buscar correo"
              className="h-9 w-[320px] max-w-full rounded-md border px-3 text-sm"
            />
          ) : routeTitle ? (
            <h1 className="truncate text-lg font-semibold">{routeTitle}</h1>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <Link
            to={RoutesPaths.notifications}
            className="relative inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="Ir a mensajeria"
          >
            <IconBell />
            {unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            ) : null}
          </Link>

          <div className="w-auto">
            <UserMenu user={user} onLogout={onLogout} compact placement="bottom-end" />
          </div>
        </div>
      </div>
    </header>
  );
};

export default memo(DashboardHeader);
