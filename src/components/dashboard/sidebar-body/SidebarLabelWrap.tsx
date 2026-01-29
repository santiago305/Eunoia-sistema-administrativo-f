import { motion } from "framer-motion"
import type { ReactNode } from "react"

export function SidebarLabelWrap({
  collapsed,
  children,
}: {
  collapsed: boolean
  children: ReactNode
}) {
  return (
    <motion.div
      className="min-w-0 overflow-hidden"
      initial={false}
      animate={collapsed ? { maxWidth: 0 } : { maxWidth: 220 }}
      transition={{
        duration: 0.32,
        delay: collapsed ? 0 : 0.5,
        ease: "easeOut",
      }}
    >
      {children}
    </motion.div>
  )
}
