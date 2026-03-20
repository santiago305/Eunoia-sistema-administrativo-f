import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { IconLogout, IconUser, IconMonitor, IconCompany } from "./icons";
import { useSidebarContext } from "./SidebarContext";
import { RoutesPaths } from "@/Router/config/routesPaths";
import type { User } from "./types";
import { cn } from "@/lib/utils";
import { getInitials } from "@/utils/getInitials";

interface UserMenuProps {
  user: User;
  onLogout: () => void;
}

const UserMenu = ({ user, onLogout }: UserMenuProps) => {
  const { isCollapsed, isMobile } = useSidebarContext();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!mobileMenuRef.current?.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (!isMobile) {
      setIsMobileMenuOpen(false);
    }
  }, [isMobile]);

  const triggerButton = (
    <button
      type="button"
      title={user.name}
      onClick={isMobile ? () => setIsMobileMenuOpen((prev) => !prev) : undefined}
      className={cn(
        "w-full flex items-center rounded-lg transition-all duration-200 hover:bg-sidebar-accent cursor-pointer select-none",
        isCollapsed ? "justify-center p-2" : "gap-3 px-3 py-2"
      )}
    >
      <Avatar className="h-9 w-9 shrink-0 border-2 border-primary/20">
        <AvatarImage src={user.avatar} alt={user.name} />
        <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
          {getInitials(user.name)}
        </AvatarFallback>
      </Avatar>

      <div
        className={cn(
          "min-w-0 flex flex-col items-start overflow-hidden transition-all duration-200 select-none",
          isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
        )}
      >
        <span className="text-sm font-medium text-sidebar-foreground truncate max-w-[120px]">
          {user.name}
        </span>
        <span className="text-[10px] text-sidebar-muted truncate w-full">
          {user.email}
        </span>
      </div>
    </button>
  );

  if (isMobile) {
    return (
      <div ref={mobileMenuRef} className="relative">
        {triggerButton}

        {isMobileMenuOpen ? (
          <div className="absolute bottom-full right-0 z-20 mb-2 w-56 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
            <div className="px-2 py-1.5 select-none">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            <DropdownMenuSeparator />
            <Link
              to={RoutesPaths.company}
              onClick={() => setIsMobileMenuOpen(false)}
              className="relative flex select-none items-center rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <IconCompany className="mr-2" />
              <span>Empresa</span>
            </Link>
            <Link
              to={RoutesPaths.profile}
              onClick={() => setIsMobileMenuOpen(false)}
              className="relative flex select-none items-center rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <IconUser className="mr-2" />
              <span>Perfil</span>
            </Link>
            <Link
              to={RoutesPaths.sessions}
              onClick={() => setIsMobileMenuOpen(false)}
              className="relative flex select-none items-center rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <IconMonitor className="mr-2" />
              <span>Sesiones activas</span>
            </Link>
            <DropdownMenuSeparator />
            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                onLogout();
              }}
              className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-left text-sm text-destructive transition-colors hover:bg-accent focus:text-destructive"
            >
              <IconLogout className="mr-2" />
              <span>Cerrar sesion</span>
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {triggerButton}
      </DropdownMenuTrigger>

      <DropdownMenuContent align={isCollapsed ? "center" : "start"} side="top" className="w-auto mb-2">
        <div className="px-2 py-1.5 select-none">
          <p className="text-sm font-medium">{user.name}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to={RoutesPaths.company} className="cursor-pointer select-none">
            <IconCompany className="mr-2" />
            <span>Empresa</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to={RoutesPaths.profile} className="cursor-pointer select-none">
            <IconUser className="mr-2" />
            <span>Perfil</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to={RoutesPaths.sessions} className="cursor-pointer select-none">
            <IconMonitor className="mr-2" />
            <span>Sesiones activas</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onLogout} className="cursor-pointer text-destructive focus:text-destructive select-none">
          <IconLogout className="mr-2" />
          <span>Cerrar sesión</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserMenu;


