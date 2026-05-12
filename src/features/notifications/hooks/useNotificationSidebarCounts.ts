import { useCallback, useEffect, useState } from "react";
import { listMessages } from "../services/messages.service";
import { listDrafts } from "../services/drafts.service";
import type { MessageFolder } from "../types/message.types";
import { useAuth } from "@/shared/hooks/useAuth";
import { NOTIFICATION_WINDOW_EVENTS } from "../constants/notification-events.constants";

type SidebarCounts = {
  inbox: number;
  starred: number;
  sent: number;
  drafts: number;
  trash: number;
  archived: number;
  snoozed: number;
};

const INITIAL_COUNTS: SidebarCounts = {
  inbox: 0,
  starred: 0,
  sent: 0,
  drafts: 0,
  trash: 0,
  archived: 0,
  snoozed: 0,
};

export function useNotificationSidebarCounts() {
  const { isAuthenticated, authChecked, userId } = useAuth();
  const [counts, setCounts] = useState<SidebarCounts>(INITIAL_COUNTS);

  const reload = useCallback(async () => {
    if (!authChecked || !isAuthenticated || !userId) {
      setCounts(INITIAL_COUNTS);
      return;
    }

    try {
      const folders: MessageFolder[] = ["inbox", "starred", "sent", "trash"];
      const [inbox, starred, sent, trash, drafts] = await Promise.all([
        listMessages({ folder: folders[0], page: 1, limit: 1 }),
        listMessages({ folder: folders[1], page: 1, limit: 1 }),
        listMessages({ folder: folders[2], page: 1, limit: 1 }),
        listMessages({ folder: folders[3], page: 1, limit: 1 }),
        listDrafts(),
      ]);

      setCounts({
        inbox: inbox.total ?? 0,
        starred: starred.total ?? 0,
        sent: sent.total ?? 0,
        trash: trash.total ?? 0,
        drafts: drafts.length ?? 0,
        archived: 0,
        snoozed: 0,
      });
    } catch {
      // Mantiene el ultimo estado valido para no congelar el sidebar en 0.
    }
  }, [authChecked, isAuthenticated, userId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const handleRefresh = () => void reload();
    window.addEventListener(NOTIFICATION_WINDOW_EVENTS.refresh, handleRefresh);
    window.addEventListener("focus", handleRefresh);
    return () => {
      window.removeEventListener(NOTIFICATION_WINDOW_EVENTS.refresh, handleRefresh);
      window.removeEventListener("focus", handleRefresh);
    };
  }, [reload]);

  return counts;
}
