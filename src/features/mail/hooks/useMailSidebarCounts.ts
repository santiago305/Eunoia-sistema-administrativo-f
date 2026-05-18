import { useCallback, useEffect, useState } from "react";
import { countMessages } from "../services/messages.service";
import { listDrafts } from "../services/drafts.service";
import type { MessageFolder } from "../types/message.types";
import { useAuth } from "@/shared/hooks/useAuth";
import { NOTIFICATION_WINDOW_EVENTS } from "../constants/mail-events.constants";
import { listMailLabels } from "../services/messages.service";

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
      const folders: MessageFolder[] = ["inbox", "starred", "trash", "archived", "snoozed", "sent"];
      const [inbox, starred, trash, archived, snoozed, sent, drafts, labels] = await Promise.all([
        countMessages({ view: folders[0], read: false }),
        countMessages({ view: folders[1], read: false }),
        countMessages({ view: folders[2], read: false }),
        countMessages({ view: folders[3], read: false }),
        countMessages({ view: folders[4], read: false }),
        countMessages({ view: folders[5] }),
        listDrafts(),
        listMailLabels(),
      ]);

      const labelUnreadById: Record<string, number> = {};
      await Promise.all(
        (labels ?? []).filter((label) => label.type === "CUSTOM").map(async (label) => {
          const result = await countMessages({ view: "inbox", read: false, labelId: label.id });
          labelUnreadById[label.id] = result.total ?? 0;
        }),
      );

      setCounts({
        inbox: inbox.total ?? 0,
        starred: starred.total ?? 0,
        sent: sent.total ?? 0,
        trash: trash.total ?? 0,
        drafts: drafts.length ?? 0,
        archived: archived.total ?? 0,
        snoozed: snoozed.total ?? 0,
        labelUnreadById,
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
    window.addEventListener(NOTIFICATION_WINDOW_EVENTS.refresh, handleRefresh);
    window.addEventListener(NOTIFICATION_WINDOW_EVENTS.messagesRefresh, handleRefresh);
    window.addEventListener("focus", handleRefresh);
    return () => {
      window.removeEventListener(NOTIFICATION_WINDOW_EVENTS.refresh, handleRefresh);
      window.removeEventListener(NOTIFICATION_WINDOW_EVENTS.messagesRefresh, handleRefresh);
      window.removeEventListener("focus", handleRefresh);
    };
  }, [enabled, reload]);

  return counts;
}

