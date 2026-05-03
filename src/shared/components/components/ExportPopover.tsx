import { Popover } from "@/shared/components/modales/Popover";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { GripVertical, Download, Save } from "lucide-react";
import { useMemo, useRef, useState } from "react";

export type ExportColumn = {
  key: string;
  label: string;
};

export type ExportPreset<TColumn extends ExportColumn = ExportColumn> = {
  metricId: string;
  name: string;
  columns: TColumn[];
};

type Props<TColumn extends ExportColumn = ExportColumn> = {
  columns: TColumn[];
  loading?: boolean;
  presets?: ExportPreset<TColumn>[];
  onSavePreset?: (payload: { name: string; columns: TColumn[] }) => Promise<void> | void;
  onDeletePreset?: (metricId: string) => Promise<void> | void;
  onExport: (columns: TColumn[]) => Promise<void> | void;
  buttonLabel?: string;
};

export function ExportPopover<TColumn extends ExportColumn = ExportColumn>({
  columns,
  loading = false,
  presets = [],
  onSavePreset,
  onDeletePreset,
  onExport,
  buttonLabel = "Exportar",
}: Props<TColumn>) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [selected, setSelected] = useState<TColumn[]>(columns);
  const [presetName, setPresetName] = useState("");

  const selectedKeys = useMemo(() => new Set(selected.map((column) => column.key)), [selected]);

  const toggleColumn = (column: TColumn) => {
    setSelected((current) => {
      const exists = current.some((item) => item.key === column.key);
      if (exists) return current.filter((item) => item.key !== column.key);
      return [...current, column];
    });
  };

  const moveColumn = (columnKey: string, targetKey: string) => {
    setSelected((current) => {
      const sourceIndex = current.findIndex((item) => item.key === columnKey);
      const targetIndex = current.findIndex((item) => item.key === targetKey);
      if (sourceIndex < 0 || targetIndex < 0) return current;
      const next = [...current];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  };

  const handleSavePreset = async () => {
    const name = presetName.trim();
    if (!name || !selected.length) return;
    await onSavePreset?.({ name, columns: selected });
    setPresetName("");
  };

  return (
    <div className="relative inline-block">
      <SystemButton ref={buttonRef} size="sm" leftIcon={<Download className="h-4 w-4" />} onClick={() => setOpen((v) => !v)}>
        {buttonLabel}
      </SystemButton>

      <Popover open={open} onClose={() => setOpen(false)} anchorRef={buttonRef} placement="bottom-end" offset={10} hideHeader bodyClassName="w-[24rem] p-3">
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Selecciona columnas y orden para Excel.</p>

          {presets.length ? (
            <select
              className="w-full rounded-md border border-border px-2 py-2 text-xs"
              defaultValue=""
              onChange={(e) => {
                const value = e.target.value;
                const preset = presets.find((item) => item.name === value);
                if (preset) setSelected(preset.columns);
              }}
            >
              <option value="">Cargar configuración guardada</option>
              {presets.map((preset) => (
                <option key={preset.metricId} value={preset.name}>
                  {preset.name}
                </option>
              ))}
            </select>
          ) : null}

          <div className="max-h-72 space-y-2 overflow-auto pr-1">
            {columns.map((column) => {
              const checked = selectedKeys.has(column.key);
              return (
                <div
                  key={column.key}
                  draggable={checked}
                  onDragStart={() => checked && setDraggingKey(column.key)}
                  onDragOver={(event) => {
                    if (!checked) return;
                    event.preventDefault();
                  }}
                  onDrop={() => {
                    if (!draggingKey || draggingKey === column.key) return;
                    moveColumn(draggingKey, column.key);
                    setDraggingKey(null);
                  }}
                  onDragEnd={() => setDraggingKey(null)}
                  className="flex items-center gap-2 rounded-md border border-border px-2 py-2"
                >
                  <Checkbox checked={checked} onCheckedChange={() => toggleColumn(column)} />
                  <span className="flex-1 text-xs">{column.label}</span>
                  <GripVertical className={`h-4 w-4 ${checked ? "text-muted-foreground" : "text-muted-foreground/30"}`} />
                </div>
              );
            })}
          </div>

          <div className="flex gap-2 items-center">
            <input value={presetName} onChange={(event) => setPresetName(event.target.value)} placeholder="Nombre de configuración" className="h-9 flex-1 rounded-md border border-border px-2 text-xs" />
            <SystemButton size="sm" variant="outline" leftIcon={<Save className="h-4 w-4" />} onClick={handleSavePreset}>
              Guardar
            </SystemButton>
            {presets.length ? (
              <SystemButton
                size="sm"
                variant="outline"
                onClick={() => {
                  const current = presets.find((preset) => preset.name === presetName.trim());
                  if (current) void onDeletePreset?.(current.metricId);
                }}
              >
                Borrar
              </SystemButton>
            ) : null}
          </div>

          <SystemButton size="sm" className="w-full" onClick={() => onExport(selected)} disabled={loading || selected.length === 0} leftIcon={<Download className="h-4 w-4" />}>
            {loading ? "Exportando..." : "Exportar"}
          </SystemButton>
        </div>
      </Popover>
    </div>
  );
}

