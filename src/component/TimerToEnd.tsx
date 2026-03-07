import { useEffect, useMemo, useState } from "react";

type TimerToEndProps = {
    from: string;
    to: string;
    className?: string;
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

export default function TimerToEnd({ from, to, className }: TimerToEndProps) {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);

    const { dateText, timeText, isValid } = useMemo(() => {
        const startMs = Date.parse(from);
        const endMs = Date.parse(to);

        if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
            return { dateText: "--/--/--", timeText: "--:--:-- --", isValid: false };
        }

        const currentMs = Math.min(Math.max(now, startMs), endMs);
        const currentDate = new Date(currentMs);

        return {
            dateText: formatDate(currentDate),
            timeText: formatTime12(currentDate),
            isValid: true,
        };
    }, [from, to, now]);

    return (
        <div className={`${className} p-2`}>
            <div className="tabular-nums">{isValid ? dateText : "--/--/--"}</div>
            <div className="tabular-nums">{isValid ? timeText : "--:--:-- --"}</div>
        </div>
    );
}
