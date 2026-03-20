import { useCallback, useEffect, useState, ReactNode } from "react";
import { SidebarContext } from "./SidebarContext";
import { useIsMobile } from "@/hooks/use-mobile";

export const SidebarProvider = ({ children }: { children: ReactNode }) => {
    const isMobile = useIsMobile();
    const [isTablet, setIsTablet] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

    useEffect(() => {
        const mediaQuery = window.matchMedia("(min-width: 768px) and (max-width: 1023px)");
        const updateTabletState = () => {
            setIsTablet(mediaQuery.matches);
        };

        updateTabletState();
        mediaQuery.addEventListener("change", updateTabletState);

        return () => mediaQuery.removeEventListener("change", updateTabletState);
    }, []);

    useEffect(() => {
        if (isMobile) {
            setIsMobileSidebarOpen(false);
            return;
        }

        setIsCollapsed(isTablet);
    }, [isMobile, isTablet]);

    useEffect(() => {
        console.log("[SidebarProvider] responsive state", {
            isMobile,
            isTablet,
            isCollapsed,
            isMobileSidebarOpen,
        });
    }, [isCollapsed, isMobile, isMobileSidebarOpen, isTablet]);

    const toggleSidebar = useCallback(() => {
        if (isMobile) {
            setIsMobileSidebarOpen((prev) => !prev);
            return;
        }

        setIsCollapsed((prev) => !prev);
    }, [isMobile]);

    const setCollapsed = useCallback((collapsed: boolean) => {
        setIsCollapsed(collapsed);
    }, []);

    const openMobileSidebar = useCallback(() => {
        console.log("[SidebarProvider] openMobileSidebar");
        setIsMobileSidebarOpen(true);
    }, []);

    const closeMobileSidebar = useCallback(() => {
        console.log("[SidebarProvider] closeMobileSidebar");
        setIsMobileSidebarOpen(false);
    }, []);

    return (
        <SidebarContext.Provider value={{
            isCollapsed,
            isMobile,
            isTablet,
            isMobileSidebarOpen,
            toggleSidebar,
            setCollapsed,
            openMobileSidebar,
            closeMobileSidebar,
        }}>
            {children}
        </SidebarContext.Provider>
    );
};


