import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover } from "@/components/modales/Popover";
import { IconCompany, IconLogout, IconMonitor, IconUser } from "./icons";
import { useSidebarContext } from "./SidebarContext";
import { RoutesPaths } from "@/router/config/routesPaths";
import type { User } from "./types";
import { cn } from "@/lib/utils";
import { getInitials } from "@/utils/getInitials";

interface UserMenuProps {
  user: User;
  onLogout: () => void;
}

type UserMenuAction = {
  to: string;
  label: string;
  icon: typeof IconUser;
};

const USER_MENU_ACTIONS: UserMenuAction[] = [
  { to: RoutesPaths.company, label: "Empresa", icon: IconCompany },
  { to: RoutesPaths.profile, label: "Perfil", icon: IconUser },
  { to: RoutesPaths.sessions, label: "Sesiones activas", icon: IconMonitor },
];

const UserMenu = ({ user, onLogout }: UserMenuProps) => {
  const { isCollapsed, isMobile } = useSidebarContext();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const isSidebarCollapsed = isCollapsed && !isMobile;

  useEffect(() => {
    if (isMobile) {
      setIsMenuOpen(false);
    }
  }, [isMobile]);

  const handleToggleMenu = useCallback(() => {
    setIsMenuOpen((previous) => !previous);
  }, []);

  const handleCloseMenu = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  const handleLogout = useCallback(() => {
    handleCloseMenu();
    onLogout();
  }, [handleCloseMenu, onLogout]);

  const triggerButtonClassName = cn(
    "flex w-full items-center rounded-lg cursor-pointer select-none hover:bg-sidebar-accent",
    isSidebarCollapsed ? "justify-center p-2" : "gap-3 px-3 py-2",
  );

  const menuContent = useMemo(
    () => (
      <div className="flex min-w-[220px] flex-col">
        <div className="px-2 py-1.5 select-none">
          <p className="text-sm font-medium">{user.name}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </div>

        <div className="my-1 h-px bg-border" />

        {USER_MENU_ACTIONS.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            onClick={handleCloseMenu}
            className="relative flex select-none items-center rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <Icon className="mr-2" />
            <span>{label}</span>
          </Link>
        ))}

        <div className="my-1 h-px bg-border" />

        <button
          type="button"
          onClick={handleLogout}
          className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-left text-sm text-destructive transition-colors hover:bg-accent focus:text-destructive"
        >
          <IconLogout className="mr-2" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    ),
    [handleCloseMenu, handleLogout, user.email, user.name],
  );

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        title={user.name}
        onClick={handleToggleMenu}
        className={triggerButtonClassName}
        aria-expanded={isMenuOpen}
        aria-haspopup="menu"
      >
        <Avatar className="h-9 w-9 shrink-0 border-2 border-primary/20">
          <AvatarImage src={user.avatar} alt={user.name} />
          <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
            {getInitials(user.name)}
          </AvatarFallback>
        </Avatar>

        {!isSidebarCollapsed ? (
          <div className="min-w-0 flex flex-col items-start overflow-hidden select-none">
            <span className="max-w-[120px] truncate text-sm font-medium text-sidebar-foreground">
              {user.name}
            </span>
            <span className="w-full truncate text-[10px] text-sidebar-muted">
              {user.email}
            </span>
          </div>
        ) : null}
      </button>

      <Popover
        open={isMenuOpen}
        onClose={handleCloseMenu}
        anchorRef={triggerRef}
        placement={isSidebarCollapsed ? "top-end" : "top-start"}
        offset={10}
        hideHeader
        animation="slide"
        bodyClassName="p-1"
        className="w-56 rounded-md"
      >
        {menuContent}
      </Popover>
    </div>
  );
};

export default memo(UserMenu);
