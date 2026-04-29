import { useSidebarContext } from "./SidebarContext";
import { IconCollapse, IconExpand } from "./icons";
import { cn } from "@/shared/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";

const SidebarToggle = () => {
  const { isCollapsed, isMobile, toggleSidebar } = useSidebarContext();

  return (
    <div className={cn(isMobile ? "px-3 py-2" : isCollapsed ? "px-2 py-2" : "px-3 py-2")}>
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <button
            type="button"
            title={isMobile ? "Cerrar menu" : isCollapsed ? "Expandir menu" : "Colapsar menu"}
            onClick={toggleSidebar}
            className={cn(
              "flex items-center rounded-lg transition-all duration-200",
              "bg-sidebar-accent/50 text-sidebar-muted hover:bg-primary/10 hover:text-primary",
              isMobile
                ? "w-full justify-between p-2"
                : isCollapsed
                  ? "w-full justify-center p-2"
                  : "w-full justify-between p-2"
            )}
          >
            {(!isCollapsed || isMobile) && (
              <span className="ml-1 text-xs font-medium text-sidebar-muted">
                {isMobile ? "Cerrar" : "Menu"}
              </span>
            )}
            {isCollapsed ? <IconExpand /> : <IconCollapse />}
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">
          {isMobile ? "Cerrar menu" : isCollapsed ? "Expandir menu" : "Colapsar menu"}
        </TooltipContent>
      </Tooltip>
    </div>
  );
};

export default SidebarToggle;
