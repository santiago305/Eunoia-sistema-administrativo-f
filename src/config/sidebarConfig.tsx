import { IconHome, IconUsers } from "@/components/dashboard/icons";
import type { SidebarItem } from "@/components/dashboard/types";
import { RoutesPaths } from "@/router/config/routesPaths";

export const getSidebarItems = (): SidebarItem[] => [
  {
    label: "Home",
    href: RoutesPaths.dashboard,
    icon: <IconHome className="text-sidebar-foreground" />,
  },
  {
    label: "Usuarios",
    href: RoutesPaths.users,
    icon: <IconUsers className="text-sidebar-foreground" />,
    children: [
      { label: "Listar", href: RoutesPaths.users },
    ],
  },
];
