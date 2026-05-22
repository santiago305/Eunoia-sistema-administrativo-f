import { useMemo, useRef, useState, type CSSProperties, type Dispatch, type SetStateAction } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { SystemButton } from "@/shared/components/components/SystemButton";
import type { ProductSkuWithAttributes } from "@/features/catalog/types/product";
import { listSkus } from "@/shared/services/skuService";
import { ProductTypes } from "../../types/ProductTypes";

export type PackItemEditorRow = {
  id: string;
  packItemId?: string;
  skuId: string;
  skuLabel: string;
  quantity: number;
  price: number;
};

type Props = {
  rows: PackItemEditorRow[];
  setRows: Dispatch<SetStateAction<PackItemEditorRow[]>>;
  totalText: string;
  setTotalText: (value: string) => void;
  onTotalBlur: () => void;
  primaryColor: string;
  lockSkuOnEdit?: boolean;
  disabled?: boolean;
  loading?: boolean;
};

const buildRowId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `pack-item-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const clampDecimals = (value: number, decimals: number) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

function parsePositiveNumber(text: string) {
  const trimmed = text.trim().replace(",", ".");
  if (!trimmed) return null;
  const num = Number(trimmed);
  if (!Number.isFinite(num)) return null;
  if (num <= 0) return null;
  return num;
}

function parseNonNegativeNumber(text: string) {
  const trimmed = text.trim().replace(",", ".");
  if (!trimmed) return null;
  const num = Number(trimmed);
  if (!Number.isFinite(num)) return null;
  if (num < 0) return null;
  return num;
}

const buildPackOptionLabel = (item: ProductSkuWithAttributes) => {
  const name = (item.sku?.name ?? "SKU").trim() || "SKU";
  const attrsText = (item.attributes ?? [])
    .map((attr) => (attr.value ?? "").trim())
    .filter(Boolean)
    .join(" ");
  const skuPart = item.sku?.backendSku ? ` -${item.sku.backendSku}` : "";
  const customPart = item.sku?.customSku ? ` (${item.sku.customSku})` : "";
  const attrsPart = attrsText ? ` ${attrsText}` : "";
  return `${name}${attrsPart}${skuPart}${customPart}`.trim();
};

const splitSkuLabel = (label: string) => {
  const trimmed = label.trim();
  if (!trimmed) return { primary: "", secondary: "" };

  const bulletIndex = trimmed.lastIndexOf(" · ");
  if (bulletIndex > 0) {
    const primary = trimmed.slice(0, bulletIndex).trim();
    const secondary = trimmed.slice(bulletIndex + 1).trim(); // keeps "· ..."
    if (primary && secondary) return { primary, secondary };
  }

  const parenMatch = trimmed.match(/\s(\([^()]+\))\s*$/);
  if (parenMatch?.[1]) {
    return {
      primary: trimmed.slice(0, Math.max(0, trimmed.length - parenMatch[0].length)).trim(),
      secondary: parenMatch[1].trim(),
    };
  }

  const dashIndex = trimmed.lastIndexOf(" -");
  if (dashIndex > 0) {
    const primary = trimmed.slice(0, dashIndex).trim();
    const secondary = trimmed.slice(dashIndex + 1).trim(); // keeps "-..."
    if (primary && secondary) return { primary, secondary };
  }

  return { primary: trimmed, secondary: "" };
};

export function PackItemsEditor({
  rows,
  setRows,
  totalText,
  setTotalText,
  onTotalBlur,
  primaryColor,
  lockSkuOnEdit = false,
  disabled = false,
  loading = false,
}: Props) {  const [skuId, setSkuId] = useState("");
  const [skuOptions, setSkuOptions] = useState<Array<{ value: string; label: string; price?: number }>>([]);
  const [skuLoading, setSkuLoading] = useState(false);
  const skuQueryRef = useRef("");
  const skuTimeoutRef = useRef<number | null>(null);

  const [quantityText, setQuantityText] = useState("1");
  const [priceText, setPriceText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const isEditingPersisted = useMemo(() => {
    if (!lockSkuOnEdit || !editingId) return false;
    const row = rows.find((r) => r.id === editingId) ?? null;
    return Boolean(row?.packItemId);
  }, [editingId, lockSkuOnEdit, rows]);

  const primaryRing: CSSProperties = useMemo(
    () =>
      ({
        "--tw-ring-color": `color-mix(in srgb, ${primaryColor} 20%, transparent)`,
      }) as CSSProperties,
    [primaryColor],
  );

  const selectedSkuOption = useMemo(() => skuOptions.find((opt) => opt.value === skuId) ?? null, [skuId, skuOptions]);

  const resetForm = () => {
    setSkuId("");
    setQuantityText("1");
    setPriceText("");
    setEditingId(null);
  };

  const loadSkus = async (q: string) => {
    const query = q.trim();
    setSkuLoading(true);
    try {
      const res = await listSkus({ 
        q: query || undefined,
        productType: ProductTypes.PRODUCT,
        isActive: true,
        page: 1,
        limit: 20 
      });
      const items = (res.items ?? []) as ProductSkuWithAttributes[];
      const mapped = items.map((item) => ({
        value: item.sku.id,
        label: buildPackOptionLabel(item),
        price: Number(item.sku.price ?? 0),
      }));
      setSkuOptions(mapped);
    } catch {
      setSkuOptions([]);
    } finally {
      setSkuLoading(false);
    }
  };

  const handleSkuSearchChange = (text: string) => {
    skuQueryRef.current = text;
    if (skuTimeoutRef.current) window.clearTimeout(skuTimeoutRef.current);
    const delay = text.trim() ? 350 : 0;
    skuTimeoutRef.current = window.setTimeout(() => {
      skuTimeoutRef.current = null;
      void loadSkus(skuQueryRef.current);
    }, delay);
  };

  const canSubmit = !disabled && !loading;

  const submit = () => {
    if (!canSubmit) return;

    const quantity = parsePositiveNumber(quantityText);
    const price = parseNonNegativeNumber(priceText || String(selectedSkuOption?.price ?? ""));

    if (!skuId) return;
    if (quantity == null) return;
    if (price == null) return;

    const normalizedQuantity = clampDecimals(quantity, 2);
    const normalizedPrice = clampDecimals(price, 2);
    const label = selectedSkuOption?.label ?? skuId;

    setRows((current) => {
      const alreadyAdded = current.some((item) => item.skuId === skuId && item.id !== editingId);
      if (alreadyAdded) return current;

      if (editingId) {
        return current.map((item) =>
          item.id === editingId
            ? { ...item, skuId, skuLabel: label, quantity: normalizedQuantity, price: normalizedPrice }
            : item,
        );
      }

      return [
        ...current,
        {
          id: buildRowId(),
          skuId,
          skuLabel: label,
          quantity: normalizedQuantity,
          price: normalizedPrice,
        },
      ];
    });

    resetForm();
  };

  const remove = (id: string) => {
    setRows((current) => current.filter((item) => item.id !== id));
    if (editingId === id) resetForm();
  };

  const startEdit = (row: PackItemEditorRow) => {
    setEditingId(row.id);
    setSkuId(row.skuId);
    setQuantityText(String(row.quantity));
    setPriceText(String(row.price));
    if (!skuOptions.some((opt) => opt.value === row.skuId)) {
      setSkuOptions((prev) => [{ value: row.skuId, label: row.skuLabel, price: row.price }, ...prev]);
    }
  };

  const rowsWithTotals = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        lineTotal: clampDecimals(row.quantity * row.price, 2),
      })),
    [rows],
  );

  return (
    <div className="mt-4 rounded-md border border-border/70 bg-muted/10 p-3">
      <div className="mb-2">
        <div className="text-sm font-semibold text-slate-900">Ítems</div>
        <div className="text-[11px] text-muted-foreground">Agrega SKUs al pack (no se puede repetir un SKU).</div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[240px]">
            <FloatingSelect
              label="SKU"
              name="pack-item-sku"
              value={skuId}
              options={skuOptions.map((opt) => ({ value: opt.value, label: opt.label }))}
              onChange={(value) => {
                setSkuId(value);
                const opt = skuOptions.find((o) => o.value === value);
                if (opt && !priceText.trim()) {
                  setPriceText(String(opt.price ?? ""));
                }
              }}
              searchable
              searchPlaceholder="Buscar SKU..."
              emptyMessage={skuLoading ? "Cargando..." : "Sin SKUs"}
              onSearchChange={handleSkuSearchChange}
              className="h-10 text-xs"
              disabled={disabled || loading || isEditingPersisted}
            />
          </div>

          <div className="w-28">
            <FloatingInput
              label="Cantidad"
              name="pack-item-qty"
              value={quantityText}
              onChange={(e) => setQuantityText(e.target.value)}
              className="h-10 text-xs"
              disabled={disabled || loading}
              style={primaryRing}
            />
          </div>

          <div className="w-28">
            <FloatingInput
              label="Precio"
              name="pack-item-price"
              value={priceText}
              onChange={(e) => setPriceText(e.target.value)}
              className="h-10 text-xs"
              disabled={disabled || loading}
              style={primaryRing}
            />
          </div>

          <SystemButton
            size="sm"
            className="h-10"
            leftIcon={editingId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            disabled={!canSubmit || !skuId}
            onClick={submit}
            style={{
              backgroundColor: primaryColor,
              borderColor: `color-mix(in srgb, ${primaryColor} 20%, transparent)`,
            }}
          >
            {editingId ? "Actualizar" : "Agregar"}
          </SystemButton>

          {editingId ? (
            <SystemButton variant="outline" size="sm" className="h-10" onClick={resetForm} disabled={disabled || loading}>
              Cancelar
            </SystemButton>
          ) : null}
        </div>

        <div className="space-y-1">
          {rowsWithTotals.length ? (
            rowsWithTotals.map((row) => {
              const parts = splitSkuLabel(row.skuLabel);
              return (
                <div key={row.id} className="flex items-center gap-2 rounded-sm px-2 py-2 hover:bg-slate-50 transition">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12px] font-medium text-slate-800">{parts.primary}</div>
                    {parts.secondary ? <div className="truncate text-[10px] text-slate-500">{parts.secondary}</div> : null}
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-slate-600 tabular-nums">
                      <span>Cant. {row.quantity}</span>
                      <span>×</span>
                      <span>Precio {row.price}</span>
                      <span>=</span>
                      <span className="font-semibold text-slate-800">{row.lineTotal}</span>
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
                      className="h-9 w-9"
                      title="Quitar"
                      onClick={() => remove(row.id)}
                      disabled={disabled || loading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </SystemButton>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-md bg-slate-50 px-3 py-3 text-[11px] text-slate-500">Aún no agregaste ítems.</div>
          )}
        </div>

        <div className="rounded-sm border border-border/60 bg-background px-3 py-2">
          <FloatingInput
            label="Total"
            name="pack-items-total"
            value={totalText}
            onChange={(e) => setTotalText(e.target.value)}
            onBlur={onTotalBlur}
            disabled={disabled || loading || rows.length === 0}
            className="h-10 text-xs tabular-nums"
          />
        </div>
      </div>
    </div>
  );
}
