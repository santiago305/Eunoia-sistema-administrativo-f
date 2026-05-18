import { useCallback, useEffect, useState } from "react";
import { countSidebarMessages, listMailLabels } from "../services/messages.service";
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

export function useMailSidebarCounts(enabled = true) {
  const { isAuthenticated, authChecked, userId } = useAuth();
  const [counts, setCounts] = useState<SidebarCounts>(INITIAL_COUNTS);

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
      const labels = await listMailLabels();
      const customLabelIds = (labels ?? [])
        .filter((label) => label.type === "CUSTOM")
        .map((label) => label.id);
      const consolidated = await countSidebarMessages(customLabelIds);
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
  }, [authChecked, enabled, isAuthenticated, userId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!enabled) return;

    const handleRefresh = () => void reload();
    window.addEventListener(NOTIFICATION_WINDOW_EVENTS.systemNotificationCreated, handleRefresh);
    window.addEventListener(NOTIFICATION_WINDOW_EVENTS.messagesRefresh, handleRefresh);
    window.addEventListener("focus", handleRefresh);
    return () => {
      window.removeEventListener(NOTIFICATION_WINDOW_EVENTS.systemNotificationCreated, handleRefresh);
      window.removeEventListener(NOTIFICATION_WINDOW_EVENTS.messagesRefresh, handleRefresh);
      window.removeEventListener("focus", handleRefresh);
    };
  }, [enabled, reload]);

  return counts;
}

