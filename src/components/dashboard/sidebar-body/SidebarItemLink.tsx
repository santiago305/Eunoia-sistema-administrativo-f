import { motion } from "framer-motion"
import type { SidebarItem } from "@/components/dashboard/types"
import { SidebarLabel } from "@/components/dashboard/sidebar-body/SidebarLabel"
import { SidebarLabelWrap } from "@/components/dashboard/sidebar-body/SidebarLabelWrap"
import { SidebarRow } from "@/components/dashboard/sidebar-body/SidebarRow"

export function SidebarItemLink({
  item,
  collapsed,
}: {
  item: SidebarItem
  collapsed: boolean
}) {
  return (
    <SidebarRow as="link" collapsed={collapsed} to={item.href ?? "#"} title={collapsed ? item.label : undefined}>
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
    </SidebarRow>
  )
}
