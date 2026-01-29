import { cn } from "@/lib/utils"
import { IconChevron } from "@/components/dashboard/icons"
import type { SidebarItem } from "@/components/dashboard/types"

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
  return (
    <div
      className="flex-1 px-1.5 pt-1.5 pb-1.5 overflow-y-auto"
      onClick={onCloseUserMenu}
    >
      <div className="space-y-2">
        {items.map((it) => {
          const hasChildren = Boolean(it.children?.length)
          const isOpen = openGroup === it.label

          if (hasChildren) {
            return (
              <div key={it.label}>
                <button
                  type="button"
                  onClick={() => onToggleGroup(it.label)}
                  className={cn(
                    "group w-full flex items-center gap-3",
                    "h-11 px-3 rounded-[4px]",
                    "text-slate-700 hover:bg-slate-100 transition"
                  )}
                  title={collapsed ? it.label : undefined}
                >
                  <span className="text-slate-700 group-hover:text-slate-900">
                    {it.icon}
                  </span>

                  {!collapsed && (
                    <>
                      <span className="text-[13px] font-medium flex-1 text-left">
                        {it.label}
                      </span>
                      <span
                        className={cn(
                          "text-slate-500 transition-transform",
                          isOpen ? "rotate-90" : "rotate-0"
                        )}
                      >
                        <IconChevron />
                      </span>
                    </>
                  )}
                </button>

                {!collapsed && isOpen && (
                  <div className="mt-2 space-y-1 pl-2">
                    {it.children!.map((ch) => (
                      <a
                        key={ch.label}
                        href={ch.href}
                        className={cn(
                          "block h-10 px-3 rounded-[4px]",
                          "flex items-center",
                          "text-[12.5px] text-slate-600 hover:text-slate-900",
                          "hover:bg-slate-100 transition"
                        )}
                      >
                        <span className="mr-2 h-2 w-2 rounded-[4px] bg-[#21b8a6]/70" />
                        {ch.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )
          }

          return (
            <a
              key={it.label}
              href={it.href ?? "#"}
              className={cn(
                "group flex items-center gap-3",
                "h-11 px-3 rounded-[4px]",
                "text-slate-700 hover:bg-slate-100 transition"
              )}
              title={collapsed ? it.label : undefined}
            >
              <span className="text-slate-700 group-hover:text-slate-900">
                {it.icon}
              </span>
              {!collapsed && (
                <span className="text-[13px] font-medium">{it.label}</span>
              )}
            </a>
          )
        })}
      </div>
    </div>
  )
}
