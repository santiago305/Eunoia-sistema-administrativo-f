import { createContext, useContext } from "react";

export interface SidebarContextType {
  isCollapsed: boolean;
  isMobile: boolean;
  isTablet: boolean;
  isMobileSidebarOpen: boolean;
  toggleSidebar: () => void;
  setCollapsed: (collapsed: boolean) => void;
  openMobileSidebar: () => void;
  closeMobileSidebar: () => void;
}

export const SidebarContext =
  createContext<SidebarContextType | undefined>(undefined);

export const useSidebarContext = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebarContext must be used within SidebarProvider");
  }
  return context;
};


