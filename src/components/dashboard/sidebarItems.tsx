import {
  IconHome,
  IconSettings,
  IconUsers,
} from "@/components/dashboard/icons"
import type { SidebarItem } from "@/components/dashboard/types"
import { RoutesPaths } from "@/router/config/routesPaths"

export const getSidebarItems = (): SidebarItem[] => [
  {
    label: "Home",
    href: RoutesPaths.dashboard,
    icon: <IconHome className="text-slate-700" />,
  },
  {
    label: "Usuarios",
    icon: <IconUsers className="text-slate-700" />,
    children: [
      { label: "Crear", href: RoutesPaths.createUser },
      { label: "Listar", href: RoutesPaths.users },
      { label: "Roles", href: "/roles" },
    ],
  },
  {
    label: "Configuracion",
    icon: <IconSettings className="text-slate-700" />,
    children: [
      { label: "General", href: "/settings" },
      { label: "Seguridad", href: "/settings/security" },
    ],
  },
]
