import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { RoutesPaths } from "@/routes/config/routesPaths";
import { useMailLabels } from "@/features/mail/hooks/useMailLabels";
import { useMailSidebarCounts } from "@/features/mail/hooks/useMailSidebarCounts";
import type { MailLabelItem } from "@/features/mail/types/message.types";

type SidebarCounts = {
  inbox: number;
  starred: number;
  sent: number;
  drafts: number;
  trash: number;
  archived: number;
  snoozed: number;
  labelUnreadById: Record<string, number>;
};

type MailDashboardContextValue = {
  isMailRoute: boolean;
  counts: SidebarCounts;
  labels: MailLabelItem[];
  labelsLoading: boolean;
  reloadLabels: () => Promise<void>;
  createLabel: (name: string, color: string) => Promise<MailLabelItem>;
  editLabel: (id: string, payload: { name?: string; color?: string }) => Promise<MailLabelItem>;
  deleteLabel: (id: string) => Promise<void>;
};

const INITIAL_COUNTS: SidebarCounts = {
  inbox: 0,
  starred: 0,
  sent: 0,
  drafts: 0,
  trash: 0,
  archived: 0,
  snoozed: 0,
  labelUnreadById: {},
};

const noopAsync = async () => {};
const noopCreateLabel = async () => {
  throw new Error("MAIL_DASHBOARD_PROVIDER_NOT_READY");
};

const MailDashboardContext = createContext<MailDashboardContextValue>({
  isMailRoute: false,
  counts: INITIAL_COUNTS,
  labels: [],
  labelsLoading: false,
  reloadLabels: noopAsync,
  createLabel: noopCreateLabel,
  editLabel: noopCreateLabel,
  deleteLabel: noopAsync,
});

export function MailDashboardProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const isMailRoute = location.pathname.startsWith(RoutesPaths.notifications);
  const counts = useMailSidebarCounts(isMailRoute);
  const { items, loading, reload, createLabel, editLabel, deleteLabel } = useMailLabels(isMailRoute);

  const value = useMemo<MailDashboardContextValue>(
    () => ({
      isMailRoute,
      counts,
      labels: items,
      labelsLoading: loading,
      reloadLabels: reload,
      createLabel,
      editLabel,
      deleteLabel,
    }),
    [isMailRoute, counts, items, loading, reload, createLabel, editLabel, deleteLabel],
  );

  return <MailDashboardContext.Provider value={value}>{children}</MailDashboardContext.Provider>;
}

export function useMailDashboardContext() {
  return useContext(MailDashboardContext);
}

