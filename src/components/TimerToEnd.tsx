import { useEffect, useMemo, useState } from "react";

type TimerToEndProps = {
<<<<<<< HEAD
  from: string;
  to: string;
  className?: string;
  loadPurchases?: () => void;
  loadProductionOrders?: () => void;
=======
    from: string;
    to: string;
    className?: string;
    loadPurchases?: () => void;
    loadProductionOrders?: () => void;
>>>>>>> 37e743728e21ebee97534fe8f2eed35587fbf7f7
};

const pad2 = (value: number) => String(value).padStart(2, "0");

<<<<<<< HEAD
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
=======
export const formatDate = (d: Date) => {
    const dd = pad2(d.getDate());
    const mm = pad2(d.getMonth() + 1);
    const yy = String(d.getFullYear()).slice(-2);
    return `${dd}/${mm}/${yy}`;
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

export default function TimerToEnd({ from, to, className, loadPurchases,loadProductionOrders
}: TimerToEndProps) {
    const [now, setNow] = useState(() => Date.now());
    const [didReload, setDidReload] = useState(false);
    const [waitUntil, setWaitUntil] = useState<number | null>(null);

    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
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
                if(loadPurchases){
                    loadPurchases();
                }
                if(loadProductionOrders){
                    loadProductionOrders();
                }
            }
        }
    }, [to, now, didReload, loadPurchases, waitUntil]);

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
    }, [from, to, now]);

    const waitRemainingMs = waitUntil ? Math.max(0, waitUntil - now) : 0;
    const waitRemainingSec = Math.ceil(waitRemainingMs / 1000);
    const isWaiting = waitUntil !== null && !didReload;

    return (
        <div className={`${className} p-0`}>
            {!isWaiting && (
                <>
                    <div className="tabular-nums">{isValid ? durationText : "--"}</div>
                </>
            )}
            {isWaiting && (
                <div className="mt-1 flex items-center gap-2 text-[10px] text-black/60">
                    <span className="inline-block h-2 w-2 animate-spin rounded-full border-2 border-black/30 border-t-black/70" />
                    <span>Ingreso a almacen en {waitRemainingSec}s...</span>
                </div>
            )}
        </div>
    );
>>>>>>> 37e743728e21ebee97534fe8f2eed35587fbf7f7
}
