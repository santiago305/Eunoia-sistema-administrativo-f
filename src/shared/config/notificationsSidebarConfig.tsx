import {
  Archive,
  Bookmark,
  Clock3,
  File,
  Inbox,
  Pencil,
  Send,
  Star,
  Trash2,
} from "lucide-react";
import { RoutesPaths } from "@/routes/config/routesPaths";
import type { SidebarItem } from "../components/components/dashboard/types";
import type { MailLabelItem } from "@/features/notifications/types/message.types";

export type NotificationSidebarCounts = {
  inbox: number;
  starred: number;
  sent?: number;
  drafts: number;
  trash: number;
  archived: number;
  snoozed: number;
  labelUnreadById: Record<string, number>;
};

export const getNotificationsSidebarItems = (
  counts?: Partial<NotificationSidebarCounts>,
  labels?: MailLabelItem[],
  canCreateLabel?: boolean,
): SidebarItem[] => [
  {
    label: "Redactar",
    icon: <Pencil className="text-sidebar-foreground" />,
    isComposeAction: true,
  },
  {
    label: "Recibidos",
    href: `${RoutesPaths.notifications}/inbox`,
    icon: <Inbox className="text-sidebar-foreground" />,
    badgeCount: counts?.inbox,
  },
  {
    label: "Destacados",
    href: `${RoutesPaths.notifications}/starred`,
    icon: <Star className="text-sidebar-foreground" />,
    badgeCount: counts?.starred,
  },
  {
    label: "Enviados",
    href: `${RoutesPaths.notifications}/sent`,
    icon: <Send className="text-sidebar-foreground" />,
  },
  {
    label: "Borradores",
    href: `${RoutesPaths.notifications}/drafts`,
    icon: <File className="text-sidebar-foreground" />,
    badgeCount: counts?.drafts,
  },
  {
    label: "Pospuestos",
    href: `${RoutesPaths.notifications}/snoozed`,
    icon: <Clock3 className="text-sidebar-foreground" />,
    badgeCount: counts?.snoozed,
  },
  {
    label: "Archivados",
    href: `${RoutesPaths.notifications}/archived`,
    icon: <Archive className="text-sidebar-foreground" />,
    badgeCount: counts?.archived,
  },
  {
    label: "Mas",
    collapsibleLabels: { closed: "Mas", open: "Menos" },
    children: [
      ...((labels ?? []).map((label) => ({
        label: label.name,
        href:
          label.type === "MODULE"
            ? `${RoutesPaths.notifications}/inbox?originModule=${label.key}`
            : `${RoutesPaths.notifications}/inbox?labelId=${label.id}`,
        isCustomLabel: label.type === "CUSTOM",
        labelId: label.id,
        badgeCount: counts?.labelUnreadById?.[label.id] ?? 0,
        icon: (
          <Bookmark
            style={{
              color: label.color ?? "currentColor",
              fill: label.color ?? "transparent",
              transform: "rotate(270deg)",
            }}
            className="text-sidebar-foreground"
          />
        ),
      }))),
      ...(canCreateLabel ? [{
        label: "+ Etiqueta",
        href: `${RoutesPaths.notifications}/inbox?createLabel=1`,
      }] : []),
    ],
  },
  {
    label: "Papelera",
    href: `${RoutesPaths.notifications}/trash`,
    icon: <Trash2 className="text-sidebar-foreground" />,
    badgeCount: counts?.trash,
  },
];
