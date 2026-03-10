import { useEffect, useMemo, useState } from "react";

type TimerToEndProps = {
    from: string;
    to: string;
    className?: string;
    loadPurchases: () => void
};

const pad2 = (value: number) => String(value).padStart(2, "0");

export const formatDate = (d: Date) => {
    const dd = pad2(d.getDate());
    const mm = pad2(d.getMonth() + 1);
    const yy = String(d.getFullYear()).slice(-2);
    return `${dd}/${mm}/${yy}`;
};

const formatTime12 = (d: Date) => {
    let hours = d.getHours();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours === 0 ? 12 : hours;
    const hh = pad2(hours);
    const mm = pad2(d.getMinutes());
    const ss = pad2(d.getSeconds());
    return `${hh}:${mm}:${ss} ${ampm}`;
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
    parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);
    return parts.join(", ");
};

export default function TimerToEnd({ from, to, className, loadPurchases }: TimerToEndProps) {
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
                loadPurchases();
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
}
