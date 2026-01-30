import { useSidebarContext } from "./SidebarContext";
import SidebarHeader from "./SidebarHeader";
import SidebarBody from "./SidebarBody";
import SidebarFooter from "./SidebarFooter";
import SidebarToggle from "./SidebarToggle";
import type { User } from "./types";
import { cn } from "@/lib/utils";

interface SidebarProps {
  user: User;
  onLogout: () => void;
}

const Sidebar = ({ user, onLogout }: SidebarProps) => {
  const { isCollapsed } = useSidebarContext();

  return (
    <aside
      className={cn(
        "h-screen bg-sidebar flex flex-col border-r border-sidebar-border transition-all duration-300 ease-in-out shrink-0",
        isCollapsed ? "w-[60px]" : "w-[200px]"
      )}
    >
      <SidebarHeader />
      <SidebarToggle />
      <SidebarBody />
      <SidebarFooter user={user} onLogout={onLogout} />
    </aside>
  );
};

export default Sidebar;
