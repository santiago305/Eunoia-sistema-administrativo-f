import { cn } from "@/lib/utils"
import { LogoLarge, LogoSmall } from "@/components/dashboard/logos"
import { motion, AnimatePresence } from "framer-motion"

export function SidebarHeader({
  collapsed,
  onToggle,
}: {
  collapsed: boolean
  onToggle: () => void
}) {
  return (
    <div>
      <motion.button
        type="button"
        onClick={onToggle}
        title={collapsed ? "Expandir" : "Colapsar"}
        layout
        transition={{ type: "spring", stiffness: 420, damping: 32 }}
        className={cn(
          "w-full h-auto py-4",
          "flex items-center justify-start", // 👈 clave: centra siempre
          "hover:bg-slate-100 transition"
        )}
      >
        {/* Contenedor fijo para evitar que el logo empuje el layout */}
        <div className="relative h-8 w-[180px] flex items-center justify-center">
          <AnimatePresence mode="wait" initial={false}>
            {collapsed ? (
              <motion.div
                key="logo-small"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.12 }}
                className="absolute inset-0 flex items-center justify-center "
              >
                <LogoSmall />
              </motion.div>
            ) : (
              <motion.div
                key="logo-large"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.12 }}
                className="absolute inset-0 flex items-center justify-start ml-2.5"
              >
                <LogoLarge />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.button>
    </div>
  )
}
