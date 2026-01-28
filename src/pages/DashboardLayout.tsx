import { useLocationFlashMessage } from "@/hooks/useLocationFlashMessage";
import { capitalizeLetterService } from "../services/capitalizeLetterService";
import { RoutesPaths } from "../router/config/routesPaths";
import { errorResponse, successResponse } from "@/common/utils/response";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { useUserDetails } from "@/hooks/useUserDetails";
import {  Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, LayoutDashboard, Users } from "lucide-react";
import { SidebarItem } from "../components/sidebarItem"; // ajusta ruta

import "./dashboardLayout.css";

export function DashboardLayout() {
    useLocationFlashMessage();

    const { showFlash, clearFlash } = useFlashMessage();
    const { logout } = useAuth();
    const { userDetails } = useUserDetails();

    const handleLogout = async () => {
        clearFlash();
        try {
            await logout();
            showFlash(successResponse("Session out"));
        } catch {
            showFlash(errorResponse("Session can not close"));
        }
    };

    const name = capitalizeLetterService(userDetails?.data?.name ?? "User");
    const role = capitalizeLetterService(userDetails?.data?.role?.description ?? "User");
    const initial = (userDetails?.data?.name?.trim()?.[0] ?? "U").toUpperCase();

    return (
        <div className="dl">
            <aside className="dl__sidebar">
                <div className="dl__brand">
                    <div className="dl__brandText">
                        <strong>{role} Panel</strong>
                        <span>Sistema Administrativo</span>
                    </div>
                </div>
                <hr />
                <ul className="dl__nav">
                    <SidebarItem icon={<LayoutDashboard size={16} />} label="Dashboard" to={RoutesPaths.dashboard} exact />

                    <SidebarItem
                        icon={<Users size={16} />}
                        label="Usuarios"
                        childrenItems={[
                            { label: "Lista de usuarios", to: RoutesPaths.users }, 
                            { label: "Crear usuario", to: RoutesPaths.createUser }, 
                        ]}
                    />
                    <SidebarItem icon={"⚙️"} label="Configuración" to={RoutesPaths.settings} />
                </ul>
                <div style={{ marginTop: "auto" }} />
            </aside>
            <div className="dl__main">
                <header className="dl__navbar">
                    <div className="dl__navbarTitle">
                        <h1 className="dl__title">Eunoia</h1>
                    </div>
                    <div className="dl__userPill" onClick={handleLogout} role="button" tabIndex={0}>
                        <div className="dl__userDot">{initial}</div>
                        <span className="dl__userText">{name}</span>
                        <div className="dl__logoutBtn" aria-hidden="true">
                            <LogOut size={16} />
                        </div>
                    </div>
                </header>
                <main className="dl__content">
                    <div className="dl__card">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}

export default DashboardLayout;
