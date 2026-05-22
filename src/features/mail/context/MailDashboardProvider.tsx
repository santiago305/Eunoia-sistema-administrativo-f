import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { RoutesPaths } from "@/routes/config/routesPaths";
import { useMailLabels } from "@/features/mail/hooks/useMailLabels";
import { useMailSidebarCounts } from "@/features/mail/hooks/useMailSidebarCounts";
import type { MailLabelItem } from "@/features/mail/types/message.types";
import { NOTIFICATION_WINDOW_EVENTS } from "@/features/mail/constants/mail-events.constants";
import { hasAnyUnreadFromSidebarCounts } from "@/features/mail/utils/mail-state.utils";

type SidebarCounts = {
  inbox: number;
  starred: number;
  sent: number;
  scheduled: number;
  drafts: number;
  trash: number;
  archived: number;
  snoozed: number;
  labelUnreadById: Record<string, number>;
};

type MailDashboardContextValue = {
  isMailRoute: boolean;
  counts: SidebarCounts;
  applyCountsDelta: (delta: Partial<Omit<SidebarCounts, "labelUnreadById">> & { labelUnreadById?: Record<string, number> }) => void;
  applyUnreadByLabelDelta: (labelIds: string[], delta: number) => void;
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
  scheduled: 0,
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
  applyCountsDelta: () => {},
  applyUnreadByLabelDelta: () => {},
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
  const [counts, setCounts] = useState<SidebarCounts>(INITIAL_COUNTS);
  const { items, loading, reload, createLabel, editLabel, deleteLabel } = useMailLabels(isMailRoute);
  const customLabelIds = useMemo(
    () => items.filter((label) => label.type === "CUSTOM").map((label) => label.id),
    [items],
  );
  const seedCounts = useMailSidebarCounts(isMailRoute, customLabelIds);

  useEffect(() => {
    setCounts(seedCounts);
  }, [seedCounts]);

  const applyCountsDelta = useCallback(
    (delta: Partial<Omit<SidebarCounts, "labelUnreadById">> & { labelUnreadById?: Record<string, number> }) => {
      setCounts((prev) => {
        const next: SidebarCounts = {
          ...prev,
          inbox: Math.max(0, prev.inbox + Number(delta.inbox ?? 0)),
          starred: Math.max(0, prev.starred + Number(delta.starred ?? 0)),
          sent: Math.max(0, prev.sent + Number(delta.sent ?? 0)),
          scheduled: Math.max(0, prev.scheduled + Number(delta.scheduled ?? 0)),
          drafts: Math.max(0, prev.drafts + Number(delta.drafts ?? 0)),
          trash: Math.max(0, prev.trash + Number(delta.trash ?? 0)),
          archived: Math.max(0, prev.archived + Number(delta.archived ?? 0)),
          snoozed: Math.max(0, prev.snoozed + Number(delta.snoozed ?? 0)),
          labelUnreadById: { ...prev.labelUnreadById },
        };
        if (delta.labelUnreadById) {
          Object.entries(delta.labelUnreadById).forEach(([labelId, value]) => {
            const current = Number(next.labelUnreadById[labelId] ?? 0);
            next.labelUnreadById[labelId] = Math.max(0, current + Number(value ?? 0));
          });
        }
        return next;
      });
    },
    [],
  );

  const applyUnreadByLabelDelta = useCallback((labelIds: string[], delta: number) => {
    if (!labelIds.length || delta === 0) return;
    setCounts((prev) => {
      const nextMap = { ...prev.labelUnreadById };
      labelIds.forEach((labelId) => {
        const current = Number(nextMap[labelId] ?? 0);
        nextMap[labelId] = Math.max(0, current + delta);
      });
      return { ...prev, labelUnreadById: nextMap };
    });
  }, []);

  useEffect(() => {
    if (!isMailRoute) return;
    const hasUnread = hasAnyUnreadFromSidebarCounts(counts);
    window.dispatchEvent(
      new CustomEvent<boolean>(NOTIFICATION_WINDOW_EVENTS.mailUnreadStateChanged, {
        detail: hasUnread,
      }),
    );
  }, [counts, isMailRoute]);

  const value = useMemo<MailDashboardContextValue>(
    () => ({
      isMailRoute,
      counts,
      applyCountsDelta,
      applyUnreadByLabelDelta,
      labels: items,
      labelsLoading: loading,
      reloadLabels: reload,
      createLabel,
      editLabel,
      deleteLabel,
    }),
    [isMailRoute, counts, applyCountsDelta, applyUnreadByLabelDelta, items, loading, reload, createLabel, editLabel, deleteLabel],
  );

  return <MailDashboardContext.Provider value={value}>{children}</MailDashboardContext.Provider>;
}

export function useMailDashboardContext() {
  return useContext(MailDashboardContext);
}
