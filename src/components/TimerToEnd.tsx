import { useEffect, useMemo, useState } from "react";

type TimerToEndProps = {
  from: string;
  to: string;
  className?: string;
  loadPurchases?: () => void;
  loadProductionOrders?: () => void;
};

const pad2 = (value: number) => String(value).padStart(2, "0");

export const formatDate = (date: Date) => {
  const day = pad2(date.getDate());
  const month = pad2(date.getMonth() + 1);
  const year = String(date.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
};

const formatDuration = (ms: number) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / (24 * 60 * 60));
  const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours > 0 || days > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);

  return parts.join(", ");
};

export default function TimerToEnd({
  from,
  to,
  className,
  loadPurchases,
  loadProductionOrders,
}: TimerToEndProps) {
  const [now, setNow] = useState(() => Date.now());
  const [didReload, setDidReload] = useState(false);
  const [waitUntil, setWaitUntil] = useState<number | null>(null);

  useEffect(() => {
    const intervalId = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    setDidReload(false);
    setWaitUntil(null);
  }, [to]);

  useEffect(() => {
    const endMs = Date.parse(to);
    if (Number.isNaN(endMs)) return;

    if (now >= endMs && !didReload) {
      if (waitUntil === null) {
        setWaitUntil(now + 3000);
        return;
      }

      if (now >= waitUntil) {
        setDidReload(true);
        setWaitUntil(null);
        loadPurchases?.();
        loadProductionOrders?.();
      }
    }
  }, [didReload, loadProductionOrders, loadPurchases, now, to, waitUntil]);

  const { durationText, isValid } = useMemo(() => {
    const startMs = Date.parse(from);
    const endMs = Date.parse(to);

    if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
      return { durationText: "--", isValid: false };
    }

    const remainingMs = now < startMs ? endMs - startMs : endMs - now;

    return {
      durationText: formatDuration(remainingMs),
      isValid: true,
    };
  }, [from, now, to]);

  const waitRemainingMs = waitUntil ? Math.max(0, waitUntil - now) : 0;
  const waitRemainingSec = Math.ceil(waitRemainingMs / 1000);
  const isWaiting = waitUntil !== null && !didReload;

  return (
    <div className={`${className ?? ""} p-0`}>
      {!isWaiting ? (
        <div className="tabular-nums">{isValid ? durationText : "--"}</div>
      ) : (
        <div className="mt-1 flex items-center gap-2 text-[10px] text-foreground/60">
          <span className="inline-block h-2 w-2 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground/60" />
          <span>Ingreso a almacen en {waitRemainingSec}s...</span>
        </div>
      )}
    </div>
  );
}
