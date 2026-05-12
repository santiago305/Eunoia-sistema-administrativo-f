import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Outlet } from "react-router-dom";
import { useToast } from "@/shared/hooks/use-toast";
import { useLocationFeedback } from "@/shared/hooks/useLocationFeedback";
import { useAuth } from "@/shared/hooks/useAuth";
import { useUserDetails } from "@/shared/hooks/useUserDetails";
import { resolveProfileAvatarUrl } from "@/features/profile/components/profile.utils";
import MobileSidebar from "../components/components/dashboard/MobileSidebar";
import Sidebar from "../components/components/dashboard/Sidebar";
import DashboardHeader from "../components/components/dashboard/DashboardHeader";
import { useSidebarContext } from "../components/components/dashboard/SidebarContext";
import { SidebarProvider } from "../components/components/dashboard/SidebarProvider";

const DashboardContent = () => {
  const { isMobile } = useSidebarContext();
  const { toast } = useToast();
  const { logout } = useAuth();
  const { userDetails } = useUserDetails();
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

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

  useEffect(() => {
    const node = headerRef.current;
    if (!node) return;

    const update = () => setHeaderHeight(Math.ceil(node.getBoundingClientRect().height));
    update();

    const observer = new ResizeObserver(update);
    observer.observe(node);
    window.addEventListener("resize", update);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div
      className="flex h-screen w-full flex-col overflow-hidden bg-background"
      style={{ "--dashTop": `${headerHeight}px` } as CSSProperties}
    >
      <div ref={headerRef}>
        <DashboardHeader user={sidebarUser} onLogout={handleLogout} />
      </div>

      <div className="flex min-h-0 flex-1">
        {isMobile ? null : <Sidebar />}
        {isMobile ? <MobileSidebar /> : null}

        <main className="relative min-h-0 h-full flex-1 border border-gray-200 rounded-t-2xl md:rounded-tr-none overflow-hidden flex flex-col">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

const DashboardLayout = () => {
  useLocationFeedback();

  return (
    <SidebarProvider>
      <DashboardContent />
    </SidebarProvider>
  );
};

export default DashboardLayout;
