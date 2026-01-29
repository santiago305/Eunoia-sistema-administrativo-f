import { motion } from "framer-motion"
import type { ReactNode } from "react"

export function SidebarLabel({
  collapsed,
  children,
}: {
  collapsed: boolean
  children: ReactNode
}) {
  return (
    <motion.span
      className="whitespace-nowrap text-[13px] font-medium"
      initial={false}
      animate={collapsed ? { opacity: 0, x: -6 } : { opacity: 1, x: 0 }}
      transition={{
        duration: 0.18,
        delay: collapsed ? 0 : 0.58,
        ease: "easeOut",
      }}
    >
      {children}
    </motion.span>
  )
}
