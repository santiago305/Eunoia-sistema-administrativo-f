import { cn } from "@/lib/utils"
import { LogoLarge, LogoSmall } from "@/components/dashboard/logos"

export function SidebarHeader({
  collapsed,
  onToggle,
}: {
  collapsed: boolean
  onToggle: () => void
}) {
  return (
    <div className="px-1.5 pt-1.5">
      <button
        type="button"
        onClick={onToggle}
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
  )
}
