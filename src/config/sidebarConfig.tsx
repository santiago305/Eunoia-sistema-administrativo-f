import {
  IconHome,
  IconSettings,
  IconUsers,
} from "@/components/dashboard/icons";
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
    href: RoutesPaths.usuarios,
    icon: <IconUsers className="text-sidebar-foreground" />,
    children: [
      { label: "Crear", href: RoutesPaths.createUser },
      { label: "Listar", href: RoutesPaths.users },
      { label: "Roles", href: RoutesPaths.roles },
    ],
  },
  {
    label: "Configuración",
    icon: <IconSettings className="text-sidebar-foreground" />,
    children: [
      { label: "General", href: RoutesPaths.settings },
      { label: "Seguridad", href: RoutesPaths.settingsSecurity },
    ],
  },
];
