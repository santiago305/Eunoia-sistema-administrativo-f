import { useSidebarContext } from "./SidebarContext";

const SidebarHeader = () => {
  const { isCollapsed } = useSidebarContext();

  return (
    <div className="h-[60px] flex items-center justify-center border-b border-sidebar-border px-3">
      {isCollapsed ? (
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-sm">L</span>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">L</span>
          </div>
          <span className="font-semibold text-sidebar-foreground text-lg tracking-tight">
            Lovable
          </span>
        </div>
      )}
    </div>
  );
};

export default SidebarHeader;
