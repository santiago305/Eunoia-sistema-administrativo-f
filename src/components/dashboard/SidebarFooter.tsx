import { cn } from "@/lib/utils"
import { FooterMenuItem } from "@/components/dashboard/FooterMenuItem"
import {
  IconChevron,
  IconLogout,
  IconSettings,
  IconUsers,
} from "@/components/dashboard/icons"
import type { SidebarUser } from "@/components/dashboard/types"
import { motion, AnimatePresence } from "framer-motion"

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
    <div className="p-1.5">
      <div className="relative">
        <motion.button
          type="button"
          onClick={onToggleUserMenu}
          title={collapsed ? user.name : undefined}
          className={cn(
            "w-full h-12 rounded-[4px] hover:bg-slate-100 transition",
            "flex items-center"
          )}
          initial={false}
          animate={{
            justifyContent: collapsed ? "center" : "flex-start",
            paddingLeft: collapsed ? 0 : 12,
            paddingRight: collapsed ? 0 : 12,
            gap: collapsed ? 0 : 12, // gap-3 = 12px
          }}
          transition={{ duration: 0.5, delay: 0.5, ease: "easeOut" }}
        >
          {/* Avatar */}
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

          {/* Nombre + subtítulo: NO se desmonta, se anima */}
          <motion.div
            className="min-w-0 text-left overflow-hidden"
            initial={false}
            animate={collapsed ? { maxWidth: 0, opacity: 0 } : { maxWidth: 220, opacity: 1 }}
            transition={{
              duration: 0.35,
              delay: collapsed ? 0 : 0.5,
              ease: "easeOut",
            }}
          >
            <motion.div
              className="text-[13px] font-semibold text-slate-900 truncate"
              initial={false}
              animate={collapsed ? { opacity: 0, x: -6 } : { opacity: 1, x: 0 }}
              transition={{
                duration: 0.18,
                delay: collapsed ? 0 : 0.58,
                ease: "easeOut",
              }}
            >
              {user.name}
            </motion.div>
            <motion.div
              className="text-[11px] text-slate-500 truncate"
              initial={false}
              animate={collapsed ? { opacity: 0, x: -6 } : { opacity: 1, x: 0 }}
              transition={{
                duration: 0.18,
                delay: collapsed ? 0 : 0.6,
                ease: "easeOut",
              }}
            >
              Mi cuenta
            </motion.div>
          </motion.div>

          {/* Chevron: desaparece cuando colapsa y rota si el menú está abierto */}
          <motion.span
            className="text-slate-500 overflow-hidden"
            initial={false}
            animate={
              collapsed
                ? { maxWidth: 0, opacity: 0 }
                : { maxWidth: 24, opacity: 1 }
            }
            transition={{
              duration: 0.25,
              delay: collapsed ? 0 : 0.5,
              ease: "easeOut",
            }}
          >
            <motion.span
              className="inline-block"
              initial={false}
              animate={{ rotate: userMenuOpen ? 90 : 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <IconChevron />
            </motion.span>
          </motion.span>
        </motion.button>

        {/* Menú flotante */}
        <AnimatePresence initial={false}>
          {userMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.98 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
