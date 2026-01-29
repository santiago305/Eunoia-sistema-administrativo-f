import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function FooterMenuItem({
  icon,
  label,
  danger,
  onClick,
}: {
  icon: ReactNode
  label: string
  danger?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full h-10 px-2 rounded-[4px]",
        "flex items-center gap-3 text-left",
        danger
          ? "text-red-600 hover:bg-red-50"
          : "text-slate-700 hover:bg-slate-100",
        "transition"
      )}
    >
      <span>{icon}</span>
      <span className="text-[13px] font-medium">{label}</span>
    </button>
  )
}
