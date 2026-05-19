import { useCallback, useEffect, useMemo, useState } from "react";
import { countSidebarMessages } from "../services/messages.service";
import { useAuth } from "@/shared/hooks/useAuth";
import { NOTIFICATION_WINDOW_EVENTS } from "../constants/mail-events.constants";

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

export function useMailSidebarCounts(enabled = true, labelIds: string[] = []) {
  const { isAuthenticated, authChecked, userId } = useAuth();
  const [counts, setCounts] = useState<SidebarCounts>(INITIAL_COUNTS);
  const normalizedLabelIds = useMemo(() => Array.from(new Set(labelIds.filter(Boolean))), [labelIds]);

  const reload = useCallback(async () => {
    if (!enabled) {
      setCounts(INITIAL_COUNTS);
      return;
    }

    if (!authChecked || !isAuthenticated || !userId) {
      setCounts(INITIAL_COUNTS);
      return;
    }

    try {
      const consolidated = await countSidebarMessages(normalizedLabelIds);
      setCounts({
        inbox: Number(consolidated?.inbox ?? 0),
        starred: Number(consolidated?.starred ?? 0),
        sent: Number(consolidated?.sent ?? 0),
        drafts: Number(consolidated?.drafts ?? 0),
        trash: Number(consolidated?.trash ?? 0),
        archived: Number(consolidated?.archived ?? 0),
        snoozed: Number(consolidated?.snoozed ?? 0),
        labelUnreadById: consolidated?.labelUnreadById ?? {},
      });
    } catch {
      // Mantiene el ultimo estado valido para no congelar el sidebar en 0.
    }
  }, [authChecked, enabled, isAuthenticated, normalizedLabelIds, userId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!enabled) return;

    const handleRefresh = () => void reload();
    window.addEventListener(NOTIFICATION_WINDOW_EVENTS.systemNotificationCreated, handleRefresh);
    window.addEventListener(NOTIFICATION_WINDOW_EVENTS.messagesRefresh, handleRefresh);
    return () => {
      window.removeEventListener(NOTIFICATION_WINDOW_EVENTS.systemNotificationCreated, handleRefresh);
      window.removeEventListener(NOTIFICATION_WINDOW_EVENTS.messagesRefresh, handleRefresh);
    };
  }, [enabled, reload]);

  return counts;
}

