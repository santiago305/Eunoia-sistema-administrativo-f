import { useLocationFlashMessage } from "@/hooks/useLocationFlashMessage";
import { Outlet } from "react-router-dom";
import { SidebarProvider } from "@/components/dashboard/SidebarProvider";
import Sidebar from "@/components/dashboard/Sidebar";
import type { User } from "@/components/dashboard/types";

export default function Home() {
    useLocationFlashMessage();

    const user: User = {
        id: "1",
        name: "Giancarlos",
        email: "giancarlos@example.com",
        avatar: undefined,
    };

    return (
        <SidebarProvider>
            <div className="w-full h-screen bg-white">
                <div className="flex h-full overflow-hidden">
                    <div id="sidebar" className="h-full">
                        <Sidebar user={user} onLogout={() => undefined} />
                    </div>

                    <div className="flex-1 h-full bg-white">
                        <Outlet />
                    </div>
                </div>
            </div>
        </SidebarProvider>
    );
}
