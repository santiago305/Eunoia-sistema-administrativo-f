import { cn } from "@/lib/utils"
import { IconChevron } from "@/components/dashboard/icons"
import type { SidebarItem } from "@/components/dashboard/types"
import { motion, AnimatePresence } from "framer-motion"
import { SidebarLabel } from "@/components/dashboard/sidebar-body/SidebarLabel"
import { SidebarLabelWrap } from "@/components/dashboard/sidebar-body/SidebarLabelWrap"
import { SidebarRow } from "@/components/dashboard/sidebar-body/SidebarRow"
import { Link } from "react-router-dom"

const MotionLink = motion(Link)

export function SidebarGroup({
  item,
  collapsed,
  isOpen,
  onToggle,
}: {
  item: SidebarItem
  collapsed: boolean
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <div>
      <SidebarRow as="button" collapsed={collapsed} onClick={onToggle} title={collapsed ? item.label : undefined}>
        <motion.div
          className="flex"
          initial={false}
          animate={{ gap: collapsed ? 0 : 12 }}
          transition={{ duration: 0.5, delay: 0.5, ease: "easeOut" }}
        >
          <span className="text-slate-700 group-hover:text-slate-900 shrink-0">
            {item.icon}
          </span>

          <SidebarLabelWrap collapsed={collapsed}>
            <SidebarLabel collapsed={collapsed}>{item.label}</SidebarLabel>
          </SidebarLabelWrap>
        </motion.div>

        <motion.span
          className="text-slate-500 overflow-hidden flex justify-center items-center"
          initial={false}
          animate={collapsed ? { maxWidth: 0, opacity: 0 } : { maxWidth: 24, opacity: 1 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          <motion.span
            className="inline-block"
            initial={false}
            animate={{ rotate: isOpen ? 90 : 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <IconChevron />
          </motion.span>
        </motion.span>
      </SidebarRow>

      <AnimatePresence initial={false}>
        {!collapsed && isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="space-y-0.5 pl-2 overflow-hidden"
          >
            {item.children!.map((ch) => (
              <MotionLink
                key={ch.label}
                to={ch.href ?? "#"}
                className={cn(
                  "block h-8 px-3 rounded-[4px]",
                  "flex items-center gap-2",
                  "text-[12.5px] text-slate-600 hover:text-slate-900",
                  "hover:bg-slate-100 transition"
                )}
                whileTap={{ scale: 0.98 }}
                title={ch.label}
              >
                <span className="h-2 w-2 rounded-[4px] bg-[#21b8a6]/70 shrink-0" />
                <span className="truncate">{ch.label}</span>
              </MotionLink>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
