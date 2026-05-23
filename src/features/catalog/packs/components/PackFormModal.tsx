import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Modal } from "@/shared/components/modales/Modal";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { PackItemsEditor, type PackItemEditorRow } from "@/features/catalog/packs/components/PackItemsEditor";
import type { CreatePackBody, PackDetailResponse, UpdatePackBody } from "@/features/catalog/types/pack";

type CreateProps = {
  mode?: "create";
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: CreatePackBody) => void;
  primaryColor?: string;
  loading?: boolean;
};

type EditProps = {
  mode: "edit";
  open: boolean;
  onClose: () => void;
  detail: PackDetailResponse | null;
  detailLoading?: boolean;
  onSubmit: (payload: UpdatePackBody) => void;
  primaryColor?: string;
  loading?: boolean;
};

type Props = CreateProps | EditProps;

const computeTotalCents = (rows: PackItemEditorRow[]) => {
  return rows.reduce((acc, row) => {
    return acc + Math.round(row.quantity * row.price * 100);
  }, 0);
};

const buildSkuLabelFromDetailItem = (item: PackDetailResponse["items"][number]) => {
  const name = item.sku?.name?.trim() || "SKU";
  const attrsText = (item.sku?.attributes ?? [])
    .map((attr) => (attr.value ?? "").trim())
    .filter(Boolean)
    .join(" ");
  const skuPart = item.sku?.backendSku ? ` -${item.sku.backendSku}` : "";
  const customPart = item.sku?.customSku ? ` (${item.sku.customSku})` : "";
  const attrsPart = attrsText ? ` ${attrsText}` : "";
  return `${name}${attrsPart}${skuPart}${customPart}`.trim() || item.skuId;
};

const parseMoney = (value: string) => {
  const number = Number(value.trim().replace(",", "."));
  if (!Number.isFinite(number)) return null;
  if (number < 0) return null;
  return number;
};

const distributeTotalIntoItems = (rows: PackItemEditorRow[], targetTotal: number): PackItemEditorRow[] => {
  const validRows = rows.filter((row) => row.quantity > 0);
  const totalQuantity = validRows.reduce((acc, row) => acc + row.quantity, 0);

  if (!validRows.length || totalQuantity <= 0) return rows;

  const targetCents = Math.round(targetTotal * 100);
  let usedCents = 0;

  return rows.map((row, index) => {
    if (row.quantity <= 0) return row;

    const isLast = index === rows.length - 1;
    const lineCents = isLast ? targetCents - usedCents : Math.round((targetCents * row.quantity) / totalQuantity);

    usedCents += lineCents;

    return {
      ...row,
      price: Number((lineCents / 100 / row.quantity).toFixed(4)),
    };
  });
};

export function PackFormModal(props: Props) {
  const isEditMode = props.mode === "edit";
  const mode = isEditMode ? "edit" : "create";
  const loading = props.loading ?? false;
  const primaryColor = props.primaryColor ?? "hsl(var(--primary))";
  const detail = isEditMode ? props.detail : null;
  const detailLoading = isEditMode ? Boolean(props.detailLoading) : false;

  const [description, setDescription] = useState("");
  const [items, setItems] = useState<PackItemEditorRow[]>([]);
  const [totalText, setTotalText] = useState("0.00");
  const [hydratedPackId, setHydratedPackId] = useState<string | null>(null);

  const totalCents = useMemo(() => computeTotalCents(items), [items]);
  const total = totalCents / 100;

  useEffect(() => {
    if (!props.open) {
      setHydratedPackId(null);
      if (mode === "edit") {
        setDescription("");
        setItems([]);
        setTotalText("0.00");
      }
      return;
    }

    if (mode === "create") {
      setDescription("");
      setItems([]);
      setTotalText("0.00");
      return;
    }

    const packId = detail?.pack?.packId?.value ?? null;
    if (!packId || !detail) return;
    if (hydratedPackId === packId) return;

    setDescription(detail.pack.description ?? "");
    setItems(
      (detail.items ?? []).map((item: PackDetailResponse["items"][number]) => ({
        id: item.id,
        packItemId: item.id,
        skuId: item.skuId,
        skuLabel: buildSkuLabelFromDetailItem(item),
        quantity: item.quantity,
        price: item.price,
      })),
    );
    setHydratedPackId(packId);
  }, [detail, hydratedPackId, mode, props.open]);

  useEffect(() => {
    setTotalText(total.toFixed(2));
  }, [total]);

  const isBusy = loading || detailLoading;
  const canSave = Boolean(description.trim()) && items.length > 0 && !isBusy;

  const fieldStyle: CSSProperties = {
    "--tw-ring-color": `color-mix(in srgb, ${primaryColor} 20%, transparent)`,
  } as CSSProperties;

  const saveButtonStyle: CSSProperties = {
    backgroundColor: primaryColor,
    borderColor: `color-mix(in srgb, ${primaryColor} 20%, transparent)`,
    "--tw-ring-color": `color-mix(in srgb, ${primaryColor} 20%, transparent)`,
  } as CSSProperties;

  const handleTotalBlur = () => {
    const parsedTotal = parseMoney(totalText);
    if (parsedTotal === null) {
      setTotalText(total.toFixed(2));
      return;
    }

    setItems((prev) => distributeTotalIntoItems(prev, parsedTotal));
    setTotalText(parsedTotal.toFixed(2));
  };

  if (!props.open) return null;

  const title = mode === "edit" ? "Editar pack" : "Nuevo pack";

  return (
    <Modal open={props.open} title={title} onClose={props.onClose} className="w-[680px] max-h-[600px]">
      <div className="space-y-3">
        <FloatingInput
          label="Descripción"
          name="pack-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="h-11 text-xs"
          disabled={isBusy}
          style={fieldStyle}
        />

        <PackItemsEditor
          rows={items}
          setRows={setItems}
          totalText={totalText}
          setTotalText={setTotalText}
          onTotalBlur={handleTotalBlur}
          primaryColor={primaryColor}
          lockSkuOnEdit={mode === "edit"}
          disabled={isBusy}
          loading={isBusy}
        />

        <div className="mt-2 flex justify-end gap-2">
          <SystemButton variant="outline" size="md" onClick={props.onClose} disabled={isBusy}>
            Cancelar
          </SystemButton>

          <SystemButton
            size="md"
            style={saveButtonStyle}
            disabled={!canSave}
            loading={isBusy}
            onClick={() => {
              if (!canSave) return;

              if (mode === "edit") {
                const payload: UpdatePackBody = {
                  description: description.trim(),
                  total,
                  itemsReplace: items.map((row) => ({
                    id: row.packItemId,
                    skuId: row.skuId,
                    quantity: row.quantity,
                    price: row.price,
                  })),
                };
                (props as EditProps).onSubmit(payload);
                return;
              }

              const payload: CreatePackBody = {
                description: description.trim(),
                total,
                items: items.map((row) => ({
                  skuId: row.skuId,
                  quantity: row.quantity,
                  price: row.price,
                })),
              };
              (props as CreateProps).onSubmit(payload);
            }}
          >
            Guardar
          </SystemButton>
        </div>
      </div>
    </Modal>
  );
}
