import { useMemo } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { getSidebarItems } from "@/components/dashboard/sidebarItems";
import { useLocationFlashMessage } from "@/hooks/useLocationFlashMessage";
import { Outlet } from "react-router-dom";


export default function Home() {
  useLocationFlashMessage();

  const sidebarItems = useMemo(() => getSidebarItems(), []);

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
