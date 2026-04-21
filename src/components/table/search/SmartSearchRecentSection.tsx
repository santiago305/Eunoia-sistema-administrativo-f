import { Star } from "lucide-react";
import type { DataTableRecentSearchItem } from "./types";

type Props<TSnapshot> = {
  items: DataTableRecentSearchItem<TSnapshot>[];
  onApplySnapshot: (snapshot: TSnapshot) => void;
};

export function SmartSearchRecentSection<TSnapshot>({
  items,
  onApplySnapshot,
}: Props<TSnapshot>) {
  if (!items.length) return null;

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <Star className="h-3.5 w-3.5 text-amber-500" />
        <h3 className="text-sm font-semibold text-slate-900">Recientes</h3>
      </div>

      <div className="space-y-1">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onApplySnapshot(item.snapshot)}
            className="flex w-full items-center rounded-sm px-3 py-2 text-left text-[13px] text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            title={item.label}
          >
            <span className="block min-w-0 flex-1 truncate">{item.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
