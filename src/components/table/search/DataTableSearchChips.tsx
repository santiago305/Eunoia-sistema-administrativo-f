import { X } from "lucide-react";
import type { DataTableSearchChip } from "./types";

type Props<TFilterKey extends string> = {
  chips: DataTableSearchChip<TFilterKey>[];
  onRemove: (chip: DataTableSearchChip<TFilterKey>) => void;
};

export function DataTableSearchChips<TFilterKey extends string>({
  chips,
  onRemove,
}: Props<TFilterKey>) {
  if (!chips.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((chip) => (
        <div
          key={chip.id}
          className="
            inline-flex items-center gap-1.5
            rounded-sm
            border border-slate-200/80
            bg-slate-50
            px-1.5 py-0.5
            text-[11px] text-slate-600
            shadow-sm
          "
        >
          <span className="whitespace-nowrap">{chip.label}</span>

          <button
            type="button"
            onClick={() => onRemove(chip)}
            className="
              inline-flex items-center justify-center
              h-4 w-auto
              rounded-sm
              text-slate-400
              transition
              hover:bg-slate-200
              hover:text-slate-700
            "
            aria-label={`Quitar ${chip.label}`}
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
