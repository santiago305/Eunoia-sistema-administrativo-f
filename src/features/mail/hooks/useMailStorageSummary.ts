import { useCallback, useEffect, useState } from "react";
import { getMyMailStorageSummary } from "../services/messages.service";
import { useAuth } from "@/shared/hooks/useAuth";

type MailStorageSummary = {
  userId: string;
  quotaBytes: number;
  quotaGb: number;
  usedBytes: number;
  remainingBytes: number;
  usedPercent: number;
};

const INITIAL_SUMMARY: MailStorageSummary = {
  userId: "",
  quotaBytes: 0,
  quotaGb: 1,
  usedBytes: 0,
  remainingBytes: 0,
  usedPercent: 0,
};

export function useMailStorageSummary(enabled = true) {
  const { isAuthenticated, authChecked, userId } = useAuth();
  const [summary, setSummary] = useState<MailStorageSummary>(INITIAL_SUMMARY);

  const reload = useCallback(async () => {
    if (!enabled || !authChecked || !isAuthenticated || !userId) {
      setSummary(INITIAL_SUMMARY);
      return;
    }

    try {
      const next = await getMyMailStorageSummary();
      setSummary({
        userId: String(next?.userId ?? userId),
        quotaBytes: Number(next?.quotaBytes ?? 0),
        quotaGb: Number(next?.quotaGb ?? 1),
        usedBytes: Number(next?.usedBytes ?? 0),
        remainingBytes: Number(next?.remainingBytes ?? 0),
        usedPercent: Number(next?.usedPercent ?? 0),
      });
    } catch {
      // mantiene ultimo estado bueno
    }
  }, [authChecked, enabled, isAuthenticated, userId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { summary, reload };
}
