import type React from "react"

export type SidebarChild = {
  label: string
  href: string
}

export type SidebarItem = {
  label: string
  href?: string
  icon: React.ReactNode
  children?: SidebarChild[]
}

export type SidebarUser = {
  name: string
  photoUrl?: string | null
}
