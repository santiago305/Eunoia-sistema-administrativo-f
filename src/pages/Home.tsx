import { useMemo } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { getSidebarItems } from "@/components/dashboard/sidebarItems";
import { useLocationFlashMessage } from "@/hooks/useLocationFlashMessage";
import { Outlet } from "react-router-dom";
import { SidebarItem } from "@/components/dashboard/types";
import { IconHome, IconSettings, IconUsers } from "@tabler/icons-react";
import { RoutesPaths } from "@/router/config/routesPaths";


export default function Home() {
  useLocationFlashMessage();

  const sidebarItems: SidebarItem[] = useMemo(
    () => [
      { label: "Home", href: RoutesPaths.dashboard, icon: <IconHome className="text-slate-700" /> },
      {
        label: "Usuarios",
        icon: <IconUsers className="text-slate-700" />,
        children: [
          { label: "Crear", href: RoutesPaths.createUser },
          { label: "Listar", href: RoutesPaths.users },
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
    ],
    []
  );

  const user = { name: "Giancarlos", photoUrl: null as string | null };

  return (
      <div className="w-full h-screen bg-white">
          <div className="flex h-full overflow-hidden">
              <div id="sidebar" className="h-full">
                <Sidebar items={sidebarItems} user={user} />
              </div>

              <div className="flex-1 h-full bg-white">
                <Outlet />
              </div>
          </div>
      </div>
  );
}
