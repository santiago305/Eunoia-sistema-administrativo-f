import { useCallback, useMemo } from "react";
import { Outlet } from "react-router-dom";
import { SidebarProvider } from "@/components/dashboard/SidebarProvider";
import Sidebar from "@/components/dashboard/Sidebar";
import MobileSidebar from "@/components/dashboard/MobileSidebar";
import { IconExpand } from "@/components/dashboard/icons";
import { useSidebarContext } from "@/components/dashboard/SidebarContext";
import { useToast } from "@/hooks/use-toast";
import { useLocationFlashMessage } from "@/hooks/useLocationFlashMessage";
import { useAuth } from "@/hooks/useAuth";
import { useUserDetails } from "@/hooks/useUserDetails";
import { resolveProfileAvatarUrl } from "@/pages/profile/components/profile.utils";

const DashboardContent = () => {
  const { isMobile, openMobileSidebar } = useSidebarContext();
  const { toast } = useToast();
  const { logout } = useAuth();
  const { userDetails } = useUserDetails();

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      toast({
        title: "Sesion cerrada",
        description: "Has cerrado sesion correctamente.",
      });
    } catch {
      toast({
        title: "No se pudo cerrar sesion",
        description: "No se ha cerrado sesion correctamente.",
      });
    }
  }, [logout, toast]);

  const sidebarUser = useMemo(
    () => ({
      id: userDetails?.data?.id ?? "unknown",
      name: userDetails?.data?.name ?? "Usuario",
      email: userDetails?.data?.email ?? "correo@ejemplo.com",
      avatar: resolveProfileAvatarUrl(userDetails?.data?.avatarUrl) || undefined,
    }),
    [
      userDetails?.data?.avatarUrl,
      userDetails?.data?.email,
      userDetails?.data?.id,
      userDetails?.data?.name,
    ],
  );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {isMobile ? null : (
        <Sidebar user={sidebarUser} onLogout={handleLogout} />
      )}

      {isMobile ? (
        <MobileSidebar user={sidebarUser} onLogout={handleLogout} />
      ) : null}

      <main className="scroll-area relative h-full flex-1 overflow-y-auto">
        {isMobile ? (
          <button
            type="button"
            title="Abrir menu"
            onClick={() => {
              openMobileSidebar();
            }}
            className="fixed right-3 top-3 z-30 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background/95 shadow-sm backdrop-blur sm:hidden"
          >
            <IconExpand />
          </button>
        ) : null}
        <Outlet />
      </main>
    </div>
  );
};

const DashboardLayout = () => {
  useLocationFlashMessage();

  return (
    <SidebarProvider>
      <DashboardContent />
    </SidebarProvider>
  );
};

export default DashboardLayout;
