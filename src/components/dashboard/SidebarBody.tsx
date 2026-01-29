import type { SidebarItem } from "@/components/dashboard/types"
import { SidebarGroup } from "@/components/dashboard/sidebar-body/SidebarGroup"
import { SidebarItemLink } from "@/components/dashboard/sidebar-body/SidebarItemLink"

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
      className="flex-1 p-1.5 overflow-y-auto overflow-x-hidden"
      onClick={onCloseUserMenu}
    >
      <div className="space-y-0.5">
        {items.map((it) => {
          const hasChildren = Boolean(it.children?.length)
          const isOpen = openGroup === it.label

          if (hasChildren) {
            return (
              <SidebarGroup
                key={it.label}
                item={it}
                collapsed={collapsed}
                isOpen={isOpen}
                onToggle={() => onToggleGroup(it.label)}
              />
            )
          }

          return <SidebarItemLink key={it.label} item={it} collapsed={collapsed} />
        })}
      </div>
    </div>
  )
}
