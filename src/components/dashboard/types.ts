import { ReactNode } from "react";

export interface SidebarItem {
  label: string;
  href?: string;
  icon?: ReactNode;
  children?: Omit<SidebarItem, "icon" | "children">[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface Session {
  id: string;
  device: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
}
