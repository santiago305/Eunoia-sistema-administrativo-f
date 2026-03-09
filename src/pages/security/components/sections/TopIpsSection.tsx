import type { SecurityTopIpItem } from "../../types/security.api";
import { SectionCard } from "../SectionCard";
import { TopIpRow } from "./TopIpRow";

export function TopIpsSection({
  loading,
  topIps,
  onSelectIp,
}: {
  loading: boolean;
  topIps: SecurityTopIpItem[];
  onSelectIp: (ip: string) => void;
}) {
  return (
    <SectionCard
      title="Top IPs"
      subtitle="IPs con mayor numero de violaciones en el rango seleccionado."
    >
      {loading ? (
        <div className="grid gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[74px] animate-pulse rounded-[22px] bg-zinc-100" />
          ))}
        </div>
      ) : topIps.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-zinc-200 bg-zinc-50 p-10 text-center text-sm text-zinc-500">
          No hay IPs con actividad registrada para este rango.
        </div>
      ) : (
        <div className="space-y-3">
          {topIps.map((item, index) => (
            <TopIpRow key={`${item.ip}-${index}`} item={item} onClick={() => onSelectIp(item.ip)} />
          ))}
        </div>
      )}
    </SectionCard>
  );
}
