import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useSidebarContext } from "./SidebarContext";
import SidebarHeader from "./SidebarHeader";
import SidebarBody from "./SidebarBody";
import SidebarFooter from "./SidebarFooter";
import type { User } from "./types";
import { cn } from "@/lib/utils";

interface MobileSidebarProps {
  user: User;
  onLogout: () => void;
}

const MobileSidebar = ({ user, onLogout }: MobileSidebarProps) => {
  const location = useLocation();
  const { isMobileSidebarOpen, closeMobileSidebar } = useSidebarContext();
  const previousPathnameRef = useRef(location.pathname);

  useEffect(() => {
    console.log("[MobileSidebar] render", {
      pathname: location.pathname,
      isMobileSidebarOpen,
    });
  }, [isMobileSidebarOpen, location.pathname]);

  useEffect(() => {
    if (previousPathnameRef.current !== location.pathname) {
      console.log("[MobileSidebar] route change close", {
        from: previousPathnameRef.current,
        to: location.pathname,
      });
      previousPathnameRef.current = location.pathname;
      closeMobileSidebar();
    }
  }, [closeMobileSidebar, location.pathname]);

  return (
    <>
      <div
        onClick={closeMobileSidebar}
        className={cn(
          "fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px] transition-opacity duration-300",
          isMobileSidebarOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
      />

      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex h-screen w-[220px] flex-col border-l border-sidebar-border bg-sidebar shadow-xl transition-transform duration-300 ease-in-out select-none",
          isMobileSidebarOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <SidebarHeader />
        <SidebarBody />
        <SidebarFooter user={user} onLogout={onLogout} />
      </aside>
    </>
  );
};

export default MobileSidebar;
