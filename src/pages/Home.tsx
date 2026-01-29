import { useMemo } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import {
  IconHome,
  IconSettings,
  IconUsers,
} from "@/components/dashboard/icons";
import type { SidebarItem } from "@/components/dashboard/types";
import { useLocationFlashMessage } from "@/hooks/useLocationFlashMessage";

export default function Home() {
  useLocationFlashMessage();

  const sidebarItems: SidebarItem[] = useMemo(
    () => [
      { label: "Home", href: "/", icon: <IconHome className="text-slate-700" /> },
      {
        label: "Usuarios",
        icon: <IconUsers className="text-slate-700" />,
        children: [
          { label: "Crear", href: "/users/create" },
          { label: "Listar", href: "/users" },
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
          <div className="p-6">
            <div className="text-slate-500 text-sm">
              Sidebar listo. El resto lo moldeas luego.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
