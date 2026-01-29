import { cn } from "@/lib/utils"
import { FooterMenuItem } from "@/components/dashboard/FooterMenuItem"
import {
  IconChevron,
  IconLogout,
  IconSettings,
  IconUsers,
} from "@/components/dashboard/icons"
import type { SidebarUser } from "@/components/dashboard/types"

export function SidebarFooter({
  user,
  collapsed,
  userMenuOpen,
  initial,
  onToggleUserMenu,
  onProfile,
  onLogout,
}: {
  user: SidebarUser
  collapsed: boolean
  userMenuOpen: boolean
  initial: string
  onToggleUserMenu: () => void
  onProfile: () => void
  onLogout: () => void
}) {
  return (
    <div className="px-1.5 pb-1.5">
      <div className="relative">
        <button
          type="button"
          onClick={onToggleUserMenu}
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
                onClick={onProfile}
              />
              <FooterMenuItem
                icon={<IconUsers className="text-slate-600" />}
                label="Sesiones"
              />
              <FooterMenuItem
                icon={<IconLogout className="text-red-600" />}
                label="Cerrar sesion"
                danger
                onClick={onLogout}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
