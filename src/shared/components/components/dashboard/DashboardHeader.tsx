import { memo } from "react";
import { Link } from "react-router-dom";
import { RoutesPaths } from "@/routes/config/routesPaths";
import { useUnreadNotificationsCount } from "@/features/notifications/hooks/useUnreadNotificationsCount";
import { cn } from "@/shared/lib/utils";
import { useSidebarContext } from "./SidebarContext";
import { IconBell, IconMenu } from "./icons";
import type { User } from "./types";
import UserMenu from "./UserMenu";

interface DashboardHeaderProps {
  user: User;
  onLogout: () => void;
}

const DashboardHeader = ({ user, onLogout }: DashboardHeaderProps) => {
  const { isCollapsed, isMobile, toggleSidebar } = useSidebarContext();
  const { count } = useUnreadNotificationsCount();
  const unreadCount = count.unread ?? 0;

  return (
    <header className="flex py-1">
      <div className="flex w-[200px] shrink-0 items-center gap-2 px-1">
        <button
          type="button"
          title={isMobile ? "Abrir menu" : isCollapsed ? "Expandir menu" : "Colapsar menu"}
          onClick={toggleSidebar}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <IconMenu />
        </button>

        <div className="min-w-0">
          <span className={cn("text-2xl font-semibold tracking-tight text-primary", isCollapsed && !isMobile ? "opacity-70" : "opacity-100")}>
            EUNOIA
          </span>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-end gap-2 px-3">
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
    </header>
  );
};

export default memo(DashboardHeader);
