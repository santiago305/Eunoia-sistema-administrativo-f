import React, { useMemo, useState } from "react";
import { useLocationFlashMessage } from "@/hooks/useLocationFlashMessage";

export type SidebarChild = {
  label: string;
  href: string;
};

export type SidebarItem = {
  label: string;
  href?: string;
  icon: React.ReactNode;
  children?: SidebarChild[];
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/** Iconos base */
function IconHome({ className }: { className?: string }) {
  return (
    <svg className={cn("h-5 w-5", className)} viewBox="0 0 24 24" fill="none">
      <path
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconUsers({ className }: { className?: string }) {
  return (
    <svg className={cn("h-5 w-5", className)} viewBox="0 0 24 24" fill="none">
      <path
        d="M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M4.5 20c1.7-3.2 4.4-5 7.5-5s5.8 1.8 7.5 5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
function IconSettings({ className }: { className?: string }) {
  return (
    <svg className={cn("h-5 w-5", className)} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M19.4 13.5v-3l-2.1-.8c-.2-.6-.6-1.1-1-1.6l.9-2L14.6 4l-1.6 1.6c-.7-.1-1.3-.1-2 0L9.4 4 6.8 6.1l.9 2c-.4.5-.7-1-1 1.6l-2.1.8v3l2.1.8c.2.6.6 1.1 1 1.6l-.9 2L9.4 20l1.6-1.6c.7.1 1.3.1 2 0l1.6 1.6 2.6-2.1-.9-2c.4-.5.7-1 1-1.6l2.1-.8Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
        opacity="0.9"
      />
    </svg>
  );
}
function IconChevron({ className }: { className?: string }) {
  return (
    <svg className={cn("h-4 w-4", className)} viewBox="0 0 24 24" fill="none">
      <path
        d="m9 6 6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconLogout({ className }: { className?: string }) {
  return (
    <svg className={cn("h-5 w-5", className)} viewBox="0 0 24 24" fill="none">
      <path
        d="M10 7V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-1"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M3 12h11"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="m7 8-4 4 4 4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Logos: grande y pequeño (cámbialos por tus SVG reales cuando quieras) */
function LogoLarge() {
  return (
    <div className="flex items-center gap-2">
      <div className="h-10 w-10 rounded-[4px] bg-[#21b8a6]/10 grid place-items-center text-[#21b8a6]">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
          <path
            d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M12 7v10"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div className="leading-tight">
        <div className="text-[13px] font-semibold text-slate-900">Panel</div>
        <div className="text-[11px] text-slate-500">Admin Dashboard</div>
      </div>
    </div>
  );
}

function LogoSmall() {
  return (
    <div className="h-10 w-10 rounded-[4px] bg-[#21b8a6]/10 grid place-items-center text-[#21b8a6]">
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
        <path
          d="M12 4l7 4v8l-7 4-7-4V8l7-4Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

/** Sidebar */
function Sidebar({
  items,
  user,
}: {
  items: SidebarItem[];
  user: { name: string; photoUrl?: string | null };
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const initial = useMemo(() => {
    const n = (user.name || "U").trim();
    return (n[0] || "U").toUpperCase();
  }, [user.name]);

  const sidebarW = collapsed ? "w-[76px]" : "w-[260px]";

  return (
    <aside
      className={cn(
        sidebarW,
        "h-full bg-white",
        "shadow-[0_10px_30px_rgba(2,6,23,0.08)]",
        "transition-[width] duration-200"
      )}
    >
      <div className="h-full flex flex-col">
        {/* HEADER: SOLO LOGO (click = toggle) */}
        <div className="px-3 pt-3">
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className={cn(
              "w-full h-12 rounded-[4px]",
              "flex items-center",
              "hover:bg-slate-100 transition"
            )}
            title={collapsed ? "Expandir" : "Colapsar"}
          >
            {collapsed ? <LogoSmall /> : <LogoLarge />}
          </button>
        </div>

        {/* BODY con overflow-y */}
        <div
          className="flex-1 px-3 pt-3 pb-3 overflow-y-auto"
          onClick={() => setUserMenuOpen(false)}
        >
          <div className="space-y-2">
            {items.map((it) => {
              const hasChildren = Boolean(it.children?.length);
              const isOpen = openGroup === it.label;

              if (hasChildren) {
                return (
                  <div key={it.label}>
                    <button
                      type="button"
                      onClick={() =>
                        setOpenGroup((prev) =>
                          prev === it.label ? null : it.label
                        )
                      }
                      className={cn(
                        "group w-full flex items-center gap-3",
                        "h-11 px-3 rounded-[4px]",
                        "text-slate-700 hover:bg-slate-100 transition"
                      )}
                      title={collapsed ? it.label : undefined}
                    >
                      <span className="text-slate-700 group-hover:text-slate-900">
                        {it.icon}
                      </span>

                      {!collapsed && (
                        <>
                          <span className="text-[13px] font-medium flex-1 text-left">
                            {it.label}
                          </span>
                          <span
                            className={cn(
                              "text-slate-500 transition-transform",
                              isOpen ? "rotate-90" : "rotate-0"
                            )}
                          >
                            <IconChevron />
                          </span>
                        </>
                      )}
                    </button>

                    {!collapsed && isOpen && (
                      <div className="mt-2 space-y-1 pl-2">
                        {it.children!.map((ch) => (
                          <a
                            key={ch.label}
                            href={ch.href}
                            className={cn(
                              "block h-10 px-3 rounded-[4px]",
                              "flex items-center",
                              "text-[12.5px] text-slate-600 hover:text-slate-900",
                              "hover:bg-slate-100 transition"
                            )}
                          >
                            <span className="mr-2 h-2 w-2 rounded-[4px] bg-[#21b8a6]/70" />
                            {ch.label}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <a
                  key={it.label}
                  href={it.href ?? "#"}
                  className={cn(
                    "group flex items-center gap-3",
                    "h-11 px-3 rounded-[4px]",
                    "text-slate-700 hover:bg-slate-100 transition"
                  )}
                  title={collapsed ? it.label : undefined}
                >
                  <span className="text-slate-700 group-hover:text-slate-900">
                    {it.icon}
                  </span>
                  {!collapsed && (
                    <span className="text-[13px] font-medium">{it.label}</span>
                  )}
                </a>
              );
            })}
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-3 pb-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => setUserMenuOpen((v) => !v)}
              className={cn(
                "w-full flex items-center gap-3",
                "h-12 px-3 rounded-[4px]",
                "hover:bg-slate-100 transition"
              )}
              title={collapsed ? user.name : undefined}
            >
              <div className="h-9 w-9 rounded-full overflow-hidden bg-[#21b8a6]/15 text-[#0f766e] grid place-items-center font-semibold">
                {user.photoUrl ? (
                  <img
                    src={user.photoUrl}
                    alt={user.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-sm">{initial}</span>
                )}
              </div>

              {!collapsed && (
                <div className="flex-1 min-w-0 text-left">
                  <div className="text-[13px] font-semibold text-slate-900 truncate">
                    {user.name}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    Mi cuenta
                  </div>
                </div>
              )}

              {!collapsed && (
                <span
                  className={cn(
                    "text-slate-500 transition-transform",
                    userMenuOpen ? "rotate-90" : "rotate-0"
                  )}
                >
                  <IconChevron />
                </span>
              )}
            </button>

            {userMenuOpen && (
              <div
                className={cn(
                  "absolute left-0 bottom-[56px]",
                  collapsed ? "w-[220px]" : "w-full"
                )}
              >
                <div className="rounded-[4px] bg-white shadow-[0_12px_28px_rgba(2,6,23,0.14)] p-2">
                  <FooterMenuItem
                    icon={<IconSettings className="text-slate-600" />}
                    label="Perfil"
                  />
                  <FooterMenuItem
                    icon={<IconUsers className="text-slate-600" />}
                    label="Sesiones"
                  />
                  <FooterMenuItem
                    icon={<IconLogout className="text-red-600" />}
                    label="Cerrar sesión"
                    danger
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}

function FooterMenuItem({
  icon,
  label,
  danger,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full h-10 px-2 rounded-[4px]",
        "flex items-center gap-3 text-left",
        danger
          ? "text-red-600 hover:bg-red-50"
          : "text-slate-700 hover:bg-slate-100",
        "transition"
      )}
    >
      <span>{icon}</span>
      <span className="text-[13px] font-medium">{label}</span>
    </button>
  );
}

/** Home */
export default function Home() {
  useLocationFlashMessage();

  const sidebarItems: SidebarItem[] = useMemo(
    () => [
      { label: "Home", href: "/", icon: <IconHome className="text-slate-700" /> },
      {
        label: "Usuarios",
        icon: <IconUsers className="text-slate-700" />,
        children: [
          { label: "Crear", href: "/users/create" },
          { label: "Listar", href: "/users" },
          { label: "Roles", href: "/roles" },
        ],
      },
      {
        label: "Configuración",
        icon: <IconSettings className="text-slate-700" />,
        children: [
          { label: "General", href: "/settings" },
          { label: "Seguridad", href: "/settings/security" },
        ],
      },
    ],
    []
  );

  const user = { name: "Giancarlos", photoUrl: null as string | null };

  return (
    <div className="w-full h-screen bg-white">
      {/* sin p-4, sin gap, pegado */}
      <div className="flex h-full overflow-hidden">
        <div id="sidebar" className="h-full">
          <Sidebar items={sidebarItems} user={user} />
        </div>

        {/* Main (lo dejas como sea, blanco predominante) */}
        <div className="flex-1 h-full bg-white">
          <div className="p-6">
            <div className="text-slate-900 font-semibold">Contenido</div>
            <div className="text-slate-500 text-sm">
              Sidebar listo. El resto lo moldeas luego.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
