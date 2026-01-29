import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { SidebarBody } from "@/components/dashboard/SidebarBody";
import { SidebarFooter } from "@/components/dashboard/SidebarFooter";
import { SidebarHeader } from "@/components/dashboard/SidebarHeader";
import type { SidebarItem, SidebarUser } from "@/components/dashboard/types";
import { useAuth } from "@/hooks/useAuth";
import { errorResponse, successResponse } from "@/common/utils/response";
import { useLocationFlashMessage } from "@/hooks/useLocationFlashMessage";
import { RoutesPaths } from "@/router/config/routesPaths";
import { useNavigate } from "react-router-dom";

import { useFlashMessage } from "@/hooks/useFlashMessage";

export function Sidebar({ items, user }: { items: SidebarItem[]; user: SidebarUser }) {
    useLocationFlashMessage();
    const { logout } = useAuth();
    const navegate = useNavigate();
    const { showFlash, clearFlash } = useFlashMessage();
    const [collapsed, setCollapsed] = useState(false);
    const [openGroup, setOpenGroup] = useState<string | null>(null);
    const [userMenuOpen, setUserMenuOpen] = useState(false);

    const initial = useMemo(() => {
        const n = (user.name || "U").trim();
        return (n[0] || "U").toUpperCase();
    }, [user.name]);

    const sidebarW = collapsed ? "w-[60px]" : "w-[200px]";
    const handleLogout = async () => {
        clearFlash();
        try {
            await logout();
            showFlash(successResponse("Session out"));
        } catch {
            showFlash(errorResponse("Session can not close"));
        }
    };
    return (
        <aside className={cn(sidebarW, "h-full bg-white", "shadow-[0_10px_30px_rgba(2,6,23,0.08)]", "transition-[width] duration-200 overflow-hidden")}>
            <div className="h-full flex flex-col">
                <SidebarHeader collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />

                <SidebarBody
                    items={items}
                    collapsed={collapsed}
                    openGroup={openGroup}
                    onToggleGroup={(label) => setOpenGroup((prev) => (prev === label ? null : label))}
                    onCloseUserMenu={() => setUserMenuOpen(false)}
                />

                <SidebarFooter
                    user={user}
                    collapsed={collapsed}
                    userMenuOpen={userMenuOpen}
                    initial={initial}
                    onToggleUserMenu={() => setUserMenuOpen((v) => !v)}
                    onProfile={() => navegate(RoutesPaths.profile)}
                    onChangePassword={() => navegate(RoutesPaths.changePassword)}
                    onLogout={handleLogout}
                />
            </div>
        </aside>
    );
}
