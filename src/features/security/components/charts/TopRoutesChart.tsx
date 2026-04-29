import { motion } from "framer-motion";
import type { SecurityTopRouteItem } from "../../types/security.api";

type TopRoutesChartProps = {
  data: SecurityTopRouteItem[];
};

export function TopRoutesChart({ data }: TopRoutesChartProps) {
  const sortedData = [...data].sort((a, b) => b.count - a.count);
  const maxCount = sortedData[0]?.count ?? 0;

  if (sortedData.length === 0) {
    return (
      <div className="flex h-[180px] items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 px-4 text-center text-sm text-muted-foreground">
        No hay rutas para mostrar en el rango seleccionado.
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {sortedData.map((route, index) => {
        const percentage = maxCount > 0 ? (route.count / maxCount) * 100 : 0;

        return (
          <div key={route.path} className="space-y-1">
            <div className="flex items-center justify-between gap-3">
              <span
                className="max-w-[180px] truncate text-xs font-mono-tight text-foreground"
                title={route.path}
              >
                {route.path}
              </span>
              <span className="shrink-0 text-xs font-mono-tight text-muted-foreground">
                {route.count}
              </span>
            </div>

            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 0.8, delay: index * 0.08 }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
