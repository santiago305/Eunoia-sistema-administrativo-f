import { useMemo } from "react";
import { getSidebarItems } from "@/config/sidebarConfig";
import SidebarItemComponent from "./SidebarItem";

const SidebarBody = () => {
  const items = useMemo(() => getSidebarItems(), []);

  return (
    <div className="flex-1 overflow-y-auto px-3 py-4 select-none">
      <nav>
        {items.map((item, index) => (
          <SidebarItemComponent key={item.label + index} item={item} />
        ))}
      </nav>
    </div>
  );
};

export default SidebarBody;
