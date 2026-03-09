import { ArrowRight } from "lucide-react";

import type { SecurityTopIpItem } from "../../types/security.api";
import { BRAND, formatDate } from "../security.utils";

export function TopIpRow({
  item,
  onClick,
}: {
  item: SecurityTopIpItem;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center justify-between rounded-[22px] border border-zinc-200 bg-white px-4 py-4 text-left transition hover:border-[rgba(33,184,166,.30)] hover:bg-[rgba(33,184,166,.03)] hover:shadow-[0_12px_28px_rgba(15,23,42,.05)]"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-[var(--brand)]" style={{ ["--brand" as string]: BRAND }} />
          <p className="truncate text-sm font-semibold text-zinc-900 md:text-[15px]">{item.ip}</p>
        </div>

        <p className="mt-2 text-xs text-zinc-500">Ultima violacion: {formatDate(item.lastViolationAt)}</p>
      </div>

      <div className="ml-4 flex items-center gap-3">
        <div className="rounded-full border border-zinc-200 bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-white">
          {item.violations} eventos
        </div>
        <ArrowRight className="h-4 w-4 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-zinc-700" />
      </div>
    </button>
  );
}
