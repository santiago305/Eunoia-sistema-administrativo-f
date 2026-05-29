import { Database, Minus, Plus } from "lucide-react";
import { SystemButton } from "@/shared/components/components/SystemButton";

type UserStoragePanelProps = {
  canEditQuota: boolean;
  quotaGb: number;
  storagePercent: number;
  usedLabel: string;
  saving: boolean;
  onChangeQuota: (direction: 1 | -1) => void;
  onQuotaInputChange: (value: number) => void;
  onSaveQuota: () => void;
};

export function UserStoragePanel({
  canEditQuota,
  quotaGb,
  storagePercent,
  usedLabel,
  saving,
  onChangeQuota,
  onQuotaInputChange,
  onSaveQuota,
}: UserStoragePanelProps) {
  return (
    <aside className="min-w-0 border-t border-zinc-100 pt-5 xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0">
      <div className="flex items-center gap-2">
        <Database className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold text-zinc-950">Almacenamiento</p>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-3xl font-semibold leading-none text-zinc-950">{quotaGb} GB</p>
          <p className="mt-2 text-xs text-zinc-500">Cuota asignada</p>
        </div>
        <span className="text-sm font-medium text-zinc-700">{storagePercent}%</span>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-sm bg-zinc-100">
        <div
          className="h-full rounded-sm bg-gradient-to-r from-primary/70 via-primary/50 to-primary/20 transition-all"
          style={{ width: `${storagePercent}%` }}
        />
      </div>

      <p className="mt-2 text-xs text-zinc-500">{usedLabel || "Sin uso registrado"}</p>

      {canEditQuota ? (
        <div className="mt-5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onChangeQuota(-1)}
              disabled={saving || quotaGb <= 1}
              className="grid h-9 w-9 place-items-center rounded-sm text-zinc-700 ring-1 ring-zinc-100 transition hover:bg-zinc-50 disabled:opacity-35"
              title="Bajar almacenamiento"
            >
              <Minus className="h-4 w-4" />
            </button>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={quotaGb}
              onChange={(event) => onQuotaInputChange(Number(event.target.value))}
              className="h-2 flex-1 accent-primary"
              aria-label="Cuota de almacenamiento"
            />
            <button
              type="button"
              onClick={() => onChangeQuota(1)}
              disabled={saving || quotaGb >= 5}
              className="grid h-9 w-9 place-items-center rounded-sm text-zinc-700 ring-1 ring-zinc-100 transition hover:bg-zinc-50 disabled:opacity-35"
              title="Subir almacenamiento"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <SystemButton className="mt-4" fullWidth variant="primary" loading={saving} onClick={onSaveQuota}>
            Guardar cuota
          </SystemButton>
        </div>
      ) : null}
    </aside>
  );
}
