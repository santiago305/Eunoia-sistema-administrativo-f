import {
  useMemo,
  useState,
  type CSSProperties,
  type Dispatch,
  type SetStateAction,
} from "react";
import { Pencil, Plus, Star, Trash2 } from "lucide-react";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { SystemButton } from "@/shared/components/components/SystemButton";

export type TelephoneEditorRow = {
  id: string;
  serverId?: string;
  number: string;
  isActive: boolean;
  isMain: boolean;
};

type Props = {
  rows: TelephoneEditorRow[];
  setRows: Dispatch<SetStateAction<TelephoneEditorRow[]>>;
  primaryColor: string;
  disabled?: boolean;
  loading?: boolean;
};

const buildRowId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `tel-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export function ClientTelephonesEditor({
  rows,
  setRows,
  primaryColor,
  disabled = false,
  loading = false,
}: Props) {
  const [number, setNumber] = useState("");
  const [isMain, setIsMain] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  const canSubmit = Boolean(number.trim()) && !disabled && !loading;

  const primaryRing: CSSProperties = useMemo(
    () =>
      ({
        "--tw-ring-color": `color-mix(in srgb, ${primaryColor} 20%, transparent)`,
      }) as CSSProperties,
    [primaryColor],
  );

  const resetForm = () => {
    setNumber("");
    setIsMain(false);
    setIsActive(true);
    setEditingId(null);
  };

  const applyMainRule = (items: TelephoneEditorRow[], nextMainId: string) =>
    items.map((item) => {
      if (item.id !== nextMainId) return { ...item, isMain: false };
      return { ...item, isMain: true, isActive: true };
    });

  const submit = () => {
    if (!canSubmit) return;

    const trimmed = number.trim();

    setRows((current) => {
      let next = [...current];

      if (editingId) {
        next = next.map((item) =>
          item.id === editingId
            ? { ...item, number: trimmed, isActive, isMain }
            : item,
        );

        if (isMain) next = applyMainRule(next, editingId);

        return next;
      }

      const newId = buildRowId();
      const nextIsMain = current.length === 0 ? true : isMain;

      next.push({
        id: newId,
        serverId: undefined,
        number: trimmed,
        isActive,
        isMain: nextIsMain,
      });

      if (nextIsMain) next = applyMainRule(next, newId);

      return next;
    });

    resetForm();
  };

  const remove = (id: string) => {
    setRows((current) => current.filter((item) => item.id !== id));
    if (editingId === id) resetForm();
  };

  const startEdit = (row: TelephoneEditorRow) => {
    setEditingId(row.id);
    setNumber(row.number);
    setIsMain(row.isMain);
    setIsActive(row.isActive);
  };

  const setMain = (id: string) => {
    setRows((current) => applyMainRule(current, id));
  };

  const canRemoveMain = rows.length > 1;

  return (
    <div className="mt-4 rounded-md border border-border/70 bg-muted/10 p-3">
      <div className="mb-2">
        <div className="text-sm font-semibold text-slate-900">Teléfonos</div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[240px] flex-1">
            <FloatingInput
              label="Número"
              name="client-phone-number"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              className="h-10 text-xs"
              disabled={disabled || loading}
              style={primaryRing}
            />
          </div>

          <SystemButton
            size="sm"
            className="h-10"
            leftIcon={
              editingId ? (
                <Pencil className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )
            }
            disabled={!canSubmit}
            onClick={submit}
            style={{
              backgroundColor: primaryColor,
              borderColor: `color-mix(in srgb, ${primaryColor} 20%, transparent)`,
            }}
          >
            {editingId ? "Actualizar" : "Agregar"}
          </SystemButton>

          {editingId ? (
            <SystemButton
              variant="outline"
              size="sm"
              className="h-10"
              onClick={resetForm}
              disabled={disabled || loading}
            >
              Cancelar
            </SystemButton>
          ) : null}
        </div>

        <div className="space-y-1">
          {rows.length ? (
            rows.map((row) => (
              <div
                key={row.id}
                className="flex items-center gap-2 rounded-sm px-2 py-2 transition hover:bg-slate-50"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12px] font-medium text-slate-800">
                    {row.number}
                  </div>

                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px]">
                    {row.isMain ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
                        <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                        Principal
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <SystemButton
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    title="Editar"
                    onClick={() => startEdit(row)}
                    disabled={disabled || loading}
                  >
                    <Pencil className="h-4 w-4" />
                  </SystemButton>

                  <SystemButton
                    variant="outline"
                    size="icon"
                    className={`h-9 w-9 ${
                      row.isMain
                        ? "border-amber-200 bg-amber-50 text-amber-600"
                        : ""
                    }`}
                    title={row.isMain ? "Teléfono principal" : "Hacer principal"}
                    onClick={() => setMain(row.id)}
                    disabled={disabled || loading}
                  >
                    <Star
                      className={`h-4 w-4 ${
                        row.isMain
                          ? "fill-amber-500 text-amber-500"
                          : ""
                      }`}
                    />
                  </SystemButton>

                  <SystemButton
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    title="Quitar"
                    onClick={() => remove(row.id)}
                    disabled={disabled || loading || !canRemoveMain}
                  >
                    <Trash2 className="h-4 w-4" />
                  </SystemButton>
                </div>
              </div>
            ))
          ) : (
            <div></div>
          )}
        </div>
      </div>
    </div>
  );
}