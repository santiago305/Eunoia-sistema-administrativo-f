import { memo } from "react";
import { useSidebarContext } from "./SidebarContext";
import SidebarBody from "./SidebarBody";
import { cn } from "@/shared/lib/utils";

const Sidebar = () => {
  const { isCollapsed } = useSidebarContext();

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col transition-all duration-300 ease-in-out select-none",
        isCollapsed ? "w-[50px]" : "w-[180px]"
      )}
    >
      <SidebarBody />
    </aside>
  );
};

export default memo(Sidebar);
