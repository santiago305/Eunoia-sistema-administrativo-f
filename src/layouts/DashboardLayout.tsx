import { Outlet } from "react-router-dom";
import { SidebarProvider } from "@/components/dashboard/SidebarContext";
import Sidebar from "@/components/dashboard/Sidebar";
import type { User } from "@/components/dashboard/types";
import { useToast } from "@/hooks/use-toast";
import { useLocationFlashMessage } from "@/hooks/useLocationFlashMessage";
import { useAuth } from "@/hooks/useAuth";

const mockUser: User = {
  id: "1",
  name: "Juan Pérez",
  email: "juan.perez@example.com",
  avatar: undefined,
};

const DashboardLayout = () => {
  useLocationFlashMessage();
  const { toast } = useToast();
  const { logout } = useAuth();
  
  const handleLogout = async () => {
      try {
          await logout();
          toast({
              title: "Sesión cerrada",
              description: "Has cerrado sesión correctamente.",
          });
      } catch {
          toast({
              title: "No se pudo cerrar sesión",
              description: "No se ha cerrado sesión correctamente.",
          });
      }
  };
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar user={mockUser} onLogout={handleLogout} />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
