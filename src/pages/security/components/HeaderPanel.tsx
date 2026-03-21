import { useEffect, useMemo, useState } from "react";
import { RefreshCcw, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { FloatingSelect } from "@/components/FloatingSelect";
import { formatDate, formatRelativeTime } from "./security.utils";
import { SystemButton } from "@/components/SystemButton";

type HeaderPanelProps = {
  hours: number;
  setHours: (value: number) => void;
  topLimit: number;
  setTopLimit: (value: number) => void;
  onRefresh: () => void;
  lastUpdated: Date | null;
};

const HOUR_OPTIONS = [
  { value: "1", label: "Últ. 1 hora" },
  { value: "6", label: "Últ. 6 horas" },
  { value: "12", label: "Últ. 12 horas" },
  { value: "24", label: "Últ. 24 horas" },
  { value: "48", label: "Últ. 48 horas" },
  { value: "168", label: "Últ. 7 días" },
];

const TOP_LIMIT_OPTIONS = [
  { value: "10", label: "Top 10" },
  { value: "20", label: "Top 20" },
  { value: "50", label: "Top 50" },
  { value: "100", label: "Top 100" },
];

export function HeaderPanel({
  hours,
  setHours,
  topLimit,
  setTopLimit,
  onRefresh,
  lastUpdated,
}: HeaderPanelProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 60000);

    return () => window.clearInterval(interval);
  }, []);

  const lastUpdatedLabel = useMemo(
    () => formatRelativeTime(lastUpdated, now),
    [lastUpdated, now],
  );

  const lastUpdatedTooltip = useMemo(() => {
    if (!lastUpdated) return "Sin actualizaciones";
    return formatDate(lastUpdated.toISOString());
  }, [lastUpdated]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mb-5 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center"
    >
      <div className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary">
          <ShieldCheck className="h-4 w-4 text-primary-foreground" />
        </div>

        <div>
          <h1 className="text-sm font-semibold leading-tight text-foreground">
            Security Dashboard
          </h1>
          <p className="text-xs text-muted-foreground" title={lastUpdatedTooltip}>
            Monitoreo en tiempo real · Última actualización {lastUpdatedLabel}
          </p>
        </div>
      </div>

      <div className="grid w-full gap-3 sm:grid-cols-3 xl:w-auto">
        <FloatingSelect
          label="Ventana"
          name="security-hours"
          value={String(hours)}
          options={HOUR_OPTIONS}
          onChange={(value) => setHours(Number(value))}
          containerClassName="min-w-0"
          className="h-8 xs"
        />

        <FloatingSelect
          label="Ranking"
          name="security-top-limit"
          value={String(topLimit)}
          options={TOP_LIMIT_OPTIONS}
          onChange={(value) => setTopLimit(Number(value))}
          containerClassName="min-w-0"
          className="h-8 text-xs"
        />

        <SystemButton
          variant="warning" 
          onClick={onRefresh}
          className="h-10"
          leftIcon={<RefreshCcw className="h-4 w-4" />}
        > 
          Refrescar
        </SystemButton>
      </div>
    </motion.div>
  );
}
