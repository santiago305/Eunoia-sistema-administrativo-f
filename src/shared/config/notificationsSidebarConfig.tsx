import {
  BookOpen,
  Archive,
  Boxes,
  ChevronDown,
  Clock3,
  Factory,
  File,
  Inbox,
  Pencil,
  Send,
  ShieldCheck,
  ShoppingCart,
  Star,
  Trash2,
  UserCog,
  Warehouse,
} from "lucide-react";
import { RoutesPaths } from "@/routes/config/routesPaths";
import type { SidebarItem } from "../components/components/dashboard/types";

export type NotificationSidebarCounts = {
  inbox: number;
  starred: number;
  sent: number;
  drafts: number;
  trash: number;
  archived: number;
  snoozed: number;
};

export const getNotificationsSidebarItems = (
  counts?: Partial<NotificationSidebarCounts>,
): SidebarItem[] => [
  {
    label: "Redactar",
    href: `${RoutesPaths.notifications}?folder=inbox&compose=1`,
    icon: <Pencil className="text-sidebar-foreground" />,
    isComposeAction: true,
  },
  {
    label: "Recibidos",
    href: `${RoutesPaths.notifications}?folder=inbox`,
    icon: <Inbox className="text-sidebar-foreground" />,
    badgeCount: counts?.inbox,
  },
  {
    label: "Destacados",
    href: `${RoutesPaths.notifications}?folder=starred`,
    icon: <Star className="text-sidebar-foreground" />,
    badgeCount: counts?.starred,
  },
  {
    label: "Enviados",
    href: `${RoutesPaths.notifications}?folder=sent`,
    icon: <Send className="text-sidebar-foreground" />,
    badgeCount: counts?.sent,
  },
  {
    label: "Borradores",
    href: `${RoutesPaths.notifications}?folder=drafts`,
    icon: <File className="text-sidebar-foreground" />,
    badgeCount: counts?.drafts,
  },
  {
    label: "Pospuestos",
    href: `${RoutesPaths.notifications}?folder=snoozed`,
    icon: <Clock3 className="text-sidebar-foreground" />,
    badgeCount: counts?.snoozed,
  },
  {
    label: "Archivados",
    href: `${RoutesPaths.notifications}?folder=archived`,
    icon: <Archive className="text-sidebar-foreground" />,
    badgeCount: counts?.archived,
  },
  {
    label: "Mas",
    icon: <ChevronDown className="text-sidebar-foreground" />,
    collapsibleLabels: { closed: "Mas", open: "Menos" },
    children: [
      {
        label: "Compras",
        href: `${RoutesPaths.notifications}?folder=inbox&originModule=purchases`,
        icon: <ShoppingCart className="text-sidebar-foreground" />,
      },
      {
        label: "Produccion",
        href: `${RoutesPaths.notifications}?folder=inbox&originModule=production`,
        icon: <Factory className="text-sidebar-foreground" />,
      },
      {
        label: "Almacen",
        href: `${RoutesPaths.notifications}?folder=inbox&originModule=warehouse`,
        icon: <Warehouse className="text-sidebar-foreground" />,
      },
      {
        label: "Catalogo",
        href: `${RoutesPaths.notifications}?folder=inbox&originModule=catalog`,
        icon: <BookOpen className="text-sidebar-foreground" />,
      },
      {
        label: "Suministros",
        href: `${RoutesPaths.notifications}?folder=inbox&originModule=supplies`,
        icon: <Boxes className="text-sidebar-foreground" />,
      },
      {
        label: "Seguridad",
        href: `${RoutesPaths.notifications}?folder=inbox&originModule=security`,
        icon: <ShieldCheck className="text-sidebar-foreground" />,
      },
      {
        label: "Roles",
        href: `${RoutesPaths.notifications}?folder=inbox&originModule=roles`,
        icon: <UserCog className="text-sidebar-foreground" />,
      },
    ],
  },
  {
    label: "Papelera",
    href: `${RoutesPaths.notifications}?folder=trash`,
    icon: <Trash2 className="text-sidebar-foreground" />,
    badgeCount: counts?.trash,
  },
];

