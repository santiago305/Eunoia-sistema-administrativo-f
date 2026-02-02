import { Outlet } from "react-router-dom";
import { SidebarProvider } from "@/components/dashboard/SidebarProvider";
import Sidebar from "@/components/dashboard/Sidebar";
// import type { User } from "@/components/dashboard/types";
import { useToast } from "@/hooks/use-toast";
import { useLocationFlashMessage } from "@/hooks/useLocationFlashMessage";
import { useAuth } from "@/hooks/useAuth";
import { useUserDetails } from "@/hooks/useUserDetails";

const DashboardLayout = () => {
  useLocationFlashMessage();
  const { toast } = useToast();
  const { logout } = useAuth();
  const { userDetails } = useUserDetails();
  
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
      <div className="flex h-screen w-full bg-background overflow-hidden">
        <Sidebar
          user={{
            id: userDetails?.data?.id ?? "unknown",
            name: userDetails?.data?.name ?? "Usuario",
            email: userDetails?.data?.email ?? "correo@ejemplo.com",
            avatar: userDetails?.data?.avatarUrl ?? undefined,
          }}
          onLogout={handleLogout}
        />
        <main className="flex-1 h-full overflow-hidden">
          <Outlet />
        </main>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
