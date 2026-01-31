import { Link } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { IconLogout, IconUser, IconMonitor, IconLock } from "./icons";
import { useSidebarContext } from "./SidebarContext";
import { RoutesPaths } from "@/router/config/routesPaths";
import type { User } from "./types";
import { cn } from "@/lib/utils";

interface UserMenuProps {
  user: User;
  onLogout: () => void;
}

const UserMenu = ({ user, onLogout }: UserMenuProps) => {
  const { isCollapsed } = useSidebarContext();

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "w-full flex items-center rounded-lg transition-all duration-200 hover:bg-sidebar-accent",
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
              "flex flex-col items-start overflow-hidden transition-all duration-200",
              isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
            )}
          >
            <span className="text-sm font-medium text-sidebar-foreground truncate max-w-[120px]">
              {user.name}
            </span>
            <span className="text-xs text-sidebar-muted truncate max-w-[120px]">
              {user.email}
            </span>
          </div>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align={isCollapsed ? "center" : "start"} side="top" className="w-56 mb-2">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium">{user.name}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to={RoutesPaths.profile} className="cursor-pointer">
            <IconUser className="mr-2" />
            <span>Perfil</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to={RoutesPaths.sessions} className="cursor-pointer">
            <IconMonitor className="mr-2" />
            <span>Sesiones activas</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to={RoutesPaths.changePassword} className="cursor-pointer">
            <IconLock className="mr-2" />
            <span>Cambiar contraseña</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onLogout} className="cursor-pointer text-destructive focus:text-destructive">
          <IconLogout className="mr-2" />
          <span>Cerrar sesión</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserMenu;
