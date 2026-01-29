import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import type { ReactNode } from "react"
import { Link } from "react-router-dom"

const MotionLink = motion(Link)

export function SidebarRow({
  as = "button",
  collapsed,
  children,
  onClick,
  to,
  title,
}: {
  as?: "button" | "link"
  collapsed: boolean
  children: ReactNode
  onClick?: () => void
  to?: string
  title?: string
}) {
  const base =
    "group w-full h-9 rounded-[4px] text-slate-700 hover:bg-slate-100 transition flex items-center"

  const content = (
    <motion.div
      layout
      transition={{ type: "spring", stiffness: 520, damping: 38 }}
      className={cn(base, collapsed ? "justify-center px-0" : "justify-between px-3")}
      style={{ gap: collapsed ? 0 : 12 }}
      title={title}
      onClick={onClick}
    >
      {children}
    </motion.div>
  )

  if (as === "link") {
    return (
      <MotionLink to={to ?? "#"} className="block m-0" style={{ textDecoration: "none" }}>
        {content}
      </MotionLink>
    )
  }

  return (
    <button type="button" className="w-full">
      {content}
    </button>
  )
}
