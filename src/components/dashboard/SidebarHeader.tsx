import { useSidebarContext } from "./SidebarContext";

const SidebarHeader = () => {
  const { isCollapsed } = useSidebarContext();

  return (
    <div className="h-[60px] flex items-center justify-center px-3 select-none">
      {isCollapsed ? (
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-sm">E</span>
        </div>
      ) : (
        <div className="flex items-center">
          <div className="text-3xl font-semibold tracking-tight text-[#21b8a6] sm:text-4xl">
            EUNOIA
          </div>
        </div>
      )}
    </div>
  );
};

export default SidebarHeader;
