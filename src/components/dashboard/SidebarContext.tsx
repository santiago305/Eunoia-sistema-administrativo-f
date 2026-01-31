import { createContext, useContext } from "react";

export interface SidebarContextType {
  isCollapsed: boolean;
  toggleSidebar: () => void;
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
