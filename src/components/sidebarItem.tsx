import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";

type ChildItem = { label: string; to: string };

type Props = {
    icon: React.ReactNode;
    label: string;
    to?: string;
    exact?: boolean; // para items sin children
    childrenItems?: ChildItem[];
};

export function SidebarItem({ icon, label, to, exact, childrenItems }: Props) {
    const location = useLocation();
    const navigate = useNavigate();

    const hasChildren = Boolean(childrenItems?.length);

    // Activo EXACTO para cada ruta
    const isRouteActive = (path?: string) => (path ? location.pathname === path : false);

    const anyChildActive = useMemo(() => {
        if (!hasChildren) return false;
        return childrenItems!.some((c) => isRouteActive(c.to));
    }, [hasChildren, childrenItems, location.pathname]);

    // Abierto por defecto si algún hijo está activo
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (anyChildActive) setOpen(true);
    }, [anyChildActive]);

    const parentActive = hasChildren ? anyChildActive : exact ? isRouteActive(to) : Boolean(to && location.pathname.startsWith(to));

    return (
        <li className={`dl__navItemWrap ${parentActive ? "dl__navItemWrap--active" : ""}`}>
            {/* Botón del item padre */}
            <button
                type="button"
                className="dl__navBtn"
                onClick={() => {
                    if (hasChildren) {
                        setOpen((v) => !v);
                        return;
                    }
                    if (to) navigate(to);
                }}
            >
                <span className="dl__navIcon">{icon}</span>
                <span className="dl__navText">{label}</span>

                {hasChildren && (
                    <span
                        className={`dl__chev ${open ? "dl__chev--open" : ""}`}
                        onClick={(e) => {
                            e.stopPropagation(); // evita que el click dispare el onClick del padre
                            setOpen((v) => !v);
                        }}
                        aria-hidden="true"
                    >
                        <ChevronDown size={16} />
                    </span>
                )}
            </button>

            {/* Submenú */}
            {hasChildren && (
                <div className={`dl__sub ${open ? "dl__sub--open" : ""}`}>
                    <div className="dl__subList">
                        {childrenItems!.map((child) => {
                            const active = isRouteActive(child.to);
                            return (
                                <NavLink key={child.to} to={child.to} className={() => `dl__subBtn ${active ? "dl__subBtn--active" : ""}`} onClick={(e) => e.stopPropagation()}>
                                    {child.label}
                                </NavLink>
                            );
                        })}
                    </div>
                </div>
            )}
        </li>
    );
}
