import { cn } from "@/lib/utils"
import { IconChevron } from "@/components/dashboard/icons"
import type { SidebarItem } from "@/components/dashboard/types"
import { Link } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"

const MotionLink = motion(Link)

export function SidebarBody({
  items,
  collapsed,
  openGroup,
  onToggleGroup,
  onCloseUserMenu,
}: {
  items: SidebarItem[]
  collapsed: boolean
  openGroup: string | null
  onToggleGroup: (label: string) => void
  onCloseUserMenu: () => void
}) {
  // ✅ Label: SOLO fade + slide (no maxWidth aquí)
  const Label = ({ children }: { children: React.ReactNode }) => (
    <motion.span
      className="whitespace-nowrap text-[13px] font-medium"
      initial={false}
      animate={collapsed ? { opacity: 0, x: -6 } : { opacity: 1, x: 0 }}
      transition={{
        duration: 0.18,
        delay: collapsed ? 0 : 0.58, // 👈 un pelín después del espacio
        ease: "easeOut",
      }}
    >
      {children}
    </motion.span>
  )

  // ✅ wrapper del label: anima el ESPACIO (maxWidth) + delay
  const LabelWrap = ({ children }: { children: React.ReactNode }) => (
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

  return (
    <div
      className="flex-1 px-1.5 pt-1.5 pb-1.5 overflow-y-auto overflow-x-hidden"
      onClick={onCloseUserMenu}
    >
      <div className="space-y-2">
        {items.map((it) => {
          const hasChildren = Boolean(it.children?.length)
          const isOpen = openGroup === it.label

          const Row = ({
            as = "button",
            children,
            onClick,
            to,
            title,
          }: {
            as?: "button" | "link"
            children: React.ReactNode
            onClick?: () => void
            to?: string
            title?: string
          }) => {
            const base =
              "group w-full h-11 rounded-[4px] text-slate-700 hover:bg-slate-100 transition flex items-center"

            const content = (
              <motion.div
                layout
                transition={{ type: "spring", stiffness: 520, damping: 38 }}
                className={cn(base, collapsed ? "justify-center px-0" : "justify-start px-3")}
                style={{ gap: collapsed ? 0 : 12 }}
                title={title}
                onClick={onClick}
              >
                {children}
              </motion.div>
            )

            if (as === "link") {
              return (
                <MotionLink to={to ?? "#"} className="block" style={{ textDecoration: "none" }}>
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

          if (hasChildren) {
            return (
              <div key={it.label}>
                <Row
                  as="button"
                  onClick={() => onToggleGroup(it.label)}
                  title={collapsed ? it.label : undefined}
                >
                  <span className="text-slate-700 group-hover:text-slate-900 shrink-0">
                    {it.icon}
                  </span>

                  {/* ✅ label suave: primero espacio, luego texto */}
                  <LabelWrap>
                    <Label>{it.label}</Label>
                  </LabelWrap>

                  {/* Chevron animado */}
                  <motion.span
                    className="text-slate-500 overflow-hidden"
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
                </Row>

                <AnimatePresence initial={false}>
                  {!collapsed && isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      className="mt-2 space-y-1 pl-2 overflow-hidden"
                    >
                      {it.children!.map((ch) => (
                        <MotionLink
                          key={ch.label}
                          to={ch.href ?? "#"}
                          className={cn(
                            "block h-10 px-3 rounded-[4px]",
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

          // ✅ item simple: mismo comportamiento, sin w-0/flex-1 instantáneo
          return (
            <Row as="link" to={it.href ?? "#"} title={collapsed ? it.label : undefined}>
              <span className="text-slate-700 group-hover:text-slate-900 shrink-0">
                {it.icon}
              </span>

              <LabelWrap>
                <Label>{it.label}</Label>
              </LabelWrap>
            </Row>
          )
        })}
      </div>
    </div>
  )
}
