import { useSidebarContext } from "./SidebarContext";
import { IconCollapse, IconExpand } from "./icons";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const SidebarToggle = () => {
  const { isCollapsed, toggleSidebar } = useSidebarContext();

  return (
    <div className={cn(
      "border-b border-sidebar-border",
      isCollapsed ? "px-2 py-2" : "px-3 py-2"
    )}>
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <button
            onClick={toggleSidebar}
            className={cn(
              "flex items-center rounded-lg transition-all duration-200",
              "bg-sidebar-accent/50 hover:bg-primary/10 text-sidebar-muted hover:text-primary",
              isCollapsed ? "justify-center p-2 w-full" : "p-2 w-full justify-between"
            )}
          >
            {!isCollapsed && (
              <span className="text-xs font-medium text-sidebar-muted ml-1">Menú</span>
            )}
            {isCollapsed ? <IconExpand /> : <IconCollapse />}
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">
          {isCollapsed ? "Expandir menú" : "Colapsar menú"}
        </TooltipContent>
      </Tooltip>
    </div>
  );
};

export default SidebarToggle;
