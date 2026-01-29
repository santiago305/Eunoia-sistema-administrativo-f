import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { FooterMenuItem } from "@/components/dashboard/FooterMenuItem"
import {
  IconChevron,
  IconLogout,
  IconSettings,
  IconUsers,
} from "@/components/dashboard/icons"
import { LogoLarge, LogoSmall } from "@/components/dashboard/logos"
import type { SidebarItem, SidebarUser } from "@/components/dashboard/types"
import { useAuth } from "@/hooks/useAuth";
import { errorResponse, successResponse } from "@/common/utils/response";
import { useLocationFlashMessage } from "@/hooks/useLocationFlashMessage";
import  { RoutesPaths }  from "@/router/config/routesPaths"
import { useNavigate } from "react-router-dom"

import { useFlashMessage } from "@/hooks/useFlashMessage";

export function Sidebar({
  items,
  user,
}: {
  items: SidebarItem[]
  user: SidebarUser
}) {
  useLocationFlashMessage();
  const { logout } = useAuth();
  const navegate  = useNavigate();
  const { showFlash, clearFlash } = useFlashMessage();
  const [collapsed, setCollapsed] = useState(false)
  const [openGroup, setOpenGroup] = useState<string | null>(null)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const initial = useMemo(() => {
    const n = (user.name || "U").trim()
    return (n[0] || "U").toUpperCase()
  }, [user.name])

  const sidebarW = collapsed ? "w-[60px]" : "w-[260px]"
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
    <aside
      className={cn(
        sidebarW,
        "h-full bg-white",
        "shadow-[0_10px_30px_rgba(2,6,23,0.08)]",
        "transition-[width] duration-200"
      )}
    >
      <div className="h-full flex flex-col">
        <div className="px-1.5 pt-1.5">
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

        <div
          className="flex-1 px-1.5 pt-1.5 pb-1.5 overflow-y-auto"
          onClick={() => setUserMenuOpen(false)}
        >
          <div className="space-y-2">
            {items.map((it) => {
              const hasChildren = Boolean(it.children?.length)
              const isOpen = openGroup === it.label

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
                )
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
              )
            })}
          </div>
        </div>

        <div className="px-1.5 pb-1.5">
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
              <div className="h-9 w-9 min-w-9 shrink-0 rounded-full overflow-hidden bg-[#21b8a6]/15 text-[#0f766e] grid place-items-center font-semibold">
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
                    onClick={ ()=> navegate(RoutesPaths.profile)}
                  />
                  <FooterMenuItem
                    icon={<IconUsers className="text-slate-600" />}
                    label="Sesiones"

                  />
                  <FooterMenuItem
                    icon={<IconLogout className="text-red-600" />}
                    label="Cerrar sesion"
                    danger
                    onClick={handleLogout} 
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  )
}
