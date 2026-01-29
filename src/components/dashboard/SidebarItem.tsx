import { useState, cloneElement, isValidElement, ReactElement } from "react";
import { Link, useLocation } from "react-router-dom";
import { IconChevronDown, IconChevronRight } from "./icons";
import { useSidebarContext } from "./SidebarContext";
import type { SidebarItem as SidebarItemType } from "./types";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface SidebarItemProps {
  item: SidebarItemType;
}

const SidebarItemComponent = ({ item }: SidebarItemProps) => {
  const { isCollapsed } = useSidebarContext();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const hasChildren = item.children && item.children.length > 0;
  const isActive = item.href === location.pathname;
  const isChildActive = item.children?.some(
    (child) => child.href === location.pathname
  );

  const handleToggle = () => {
    if (hasChildren && !isCollapsed) {
      setIsOpen((prev) => !prev);
    }
  };

  const renderIcon = () => {
    if (item.icon && isValidElement(item.icon)) {
      return cloneElement(item.icon as ReactElement<{ className?: string }>, {
        className: cn(
          "transition-colors shrink-0",
          isActive || isChildActive
            ? "text-primary"
            : "text-sidebar-foreground"
        ),
      });
    }
    return null;
  };

  const itemContent = (
    <div
      className={cn(
        "flex items-center rounded-lg cursor-pointer transition-all duration-200",
        isCollapsed ? "justify-center p-2" : "gap-3 px-3 py-2.5",
        isActive || isChildActive
          ? "bg-primary/10 text-primary"
          : "hover:bg-sidebar-accent text-sidebar-foreground"
      )}
      onClick={handleToggle}
    >
      {renderIcon()}
      
      <span
        className={cn(
          "font-medium text-sm transition-all duration-200 overflow-hidden",
          isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
        )}
      >
        {item.label}
      </span>

      {hasChildren && !isCollapsed && (
        <span className="ml-auto">
          {isOpen || isChildActive ? (
            <IconChevronDown className="text-sidebar-muted" />
          ) : (
            <IconChevronRight className="text-sidebar-muted" />
          )}
        </span>
      )}
    </div>
  );

  // Collapsed mode with children - show popover
  if (isCollapsed && hasChildren) {
    return (
      <div className="mb-1">
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <div>{itemContent}</div>
          </PopoverTrigger>
          <PopoverContent 
            side="right" 
            align="start" 
            sideOffset={8}
            className="w-48 p-2 bg-popover border border-border shadow-lg"
          >
            {item.href && (
              <Link
                to={item.href}
                onClick={() => setPopoverOpen(false)}
                className={cn(
                  "block px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-1 border-b border-border pb-2",
                  item.href === location.pathname
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-accent"
                )}
              >
                {item.label}
              </Link>
            )}
            <div className="space-y-1">
              {item.children?.map((child, index) => (
                <Link
                  key={`${child.href ?? child.label}-${index}`}
                  to={child.href || "#"}
                  onClick={() => setPopoverOpen(false)}
                  className={cn(
                    "block px-3 py-2 rounded-lg text-sm transition-colors",
                    child.href === location.pathname
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  {child.label}
                </Link>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  // Collapsed mode without children - show tooltip
  if (isCollapsed && !hasChildren) {
    return (
      <div className="mb-1">
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            {item.href ? (
              <Link to={item.href}>{itemContent}</Link>
            ) : (
              itemContent
            )}
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.label}
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  // Expanded mode
  const wrappedItem = item.href && !hasChildren ? (
    <Link to={item.href}>{itemContent}</Link>
  ) : item.href && hasChildren ? (
    <div className="flex flex-col">
      <div className="flex items-center">
        <Link to={item.href} className="flex-1">
          <div
            className={cn(
              "flex items-center rounded-lg cursor-pointer transition-all duration-200 gap-3 px-3 py-2.5",
              isActive || isChildActive
                ? "bg-primary/10 text-primary"
                : "hover:bg-sidebar-accent text-sidebar-foreground"
            )}
          >
            {renderIcon()}
            <span className="font-medium text-sm">{item.label}</span>
          </div>
        </Link>
        <button
          onClick={handleToggle}
          className="p-2 hover:bg-sidebar-accent rounded-lg transition-colors"
        >
          {isOpen || isChildActive ? (
            <IconChevronDown className="text-sidebar-muted" />
          ) : (
            <IconChevronRight className="text-sidebar-muted" />
          )}
        </button>
      </div>
    </div>
  ) : (
    itemContent
  );

  return (
    <div className="mb-1">
      {wrappedItem}

      {hasChildren && (isOpen || isChildActive) && !isCollapsed && (
        <div className="ml-8 mt-1 space-y-1">
          {item.children?.map((child, index) => (
            <Link
              key={`${child.href ?? child.label}-${index}`}
              to={child.href || "#"}
              className={cn(
                "block px-3 py-2 rounded-lg text-sm transition-colors",
                child.href === location.pathname
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              {child.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default SidebarItemComponent;
