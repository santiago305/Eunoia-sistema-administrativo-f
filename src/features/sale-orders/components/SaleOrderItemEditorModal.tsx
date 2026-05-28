import { useCallback, useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { Modal } from "@/shared/components/modales/Modal";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { listPacks, getPackById } from "@/shared/services/packService";
import type { PackDetailResponse } from "@/features/catalog/types/pack";
import type { SaleOrderItemComponentInput, SaleOrderItemInput } from "@/features/sale-orders/types/saleOrder";
import { parseDecimalInput } from "@/shared/utils/functionPurchases";
import { buildSkuLabelFromDetailItem } from "@/features/catalog/packs/Packs";

type Props = {
  open: boolean;
  title: string;
  value: SaleOrderItemInput;
  onChange: (next: SaleOrderItemInput) => void;
  onClose: () => void;
  onConfirm: () => void;
};

const roundMoney = (value: number) => Math.round((Number(value) || 0) * 100) / 100;

const calcTotal = (quantity: number, unitPrice: number) => {
  return roundMoney((Number(quantity) || 0) * (Number(unitPrice) || 0));
};

const calcUnitPrice = (quantity: number, total: number) => {
  const qty = Number(quantity) || 0;
  if (qty <= 0) return 0;
  return roundMoney((Number(total) || 0) / qty);
};

const sumComponentsTotal = (components: SaleOrderItemComponentInput[] = []) => {
  return roundMoney(components.reduce((acc, item) => acc + (Number(item.total) || 0), 0));
};

const upsertComponent = (
  components: SaleOrderItemComponentInput[] = [],
  next: SaleOrderItemComponentInput,
) => {
  const filtered = components.filter((c) => c.skuId !== next.skuId);
  return [...filtered, next];
};

const distributeTotalToComponents = (
  components: SaleOrderItemComponentInput[] = [],
  newTotal: number,
) => {
  const currentTotal = sumComponentsTotal(components);

  if (currentTotal <= 0 || components.length === 0) return components;

  let accumulated = 0;

  return components.map((item, index) => {
    const isLast = index === components.length - 1;
    const ratio = (Number(item.total) || 0) / currentTotal;
    const total = isLast ? roundMoney(newTotal - accumulated) : roundMoney(newTotal * ratio);

    accumulated += total;

    return {
      ...item,
      total,
      unitPrice: calcUnitPrice(item.quantity, total),
    };
  });
};

export function SaleOrderItemEditorModal({ open, title, value, onChange, onClose, onConfirm }: Props) {
  const [packQuery, setPackQuery] = useState("");
  const [packOptions, setPackOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [packDetail, setPackDetail] = useState<PackDetailResponse | null>(null);
  const [excludedSkuIds, setExcludedSkuIds] = useState<string[]>([]);

  const hasPack = Boolean(value.referencePackId);
  const isEditing = Boolean(value.components?.length);

  useEffect(() => {
    if (!open) return;

    const load = async () => {
      const res = await listPacks({
        q: packQuery || undefined,
        page: 1,
        limit: 10,
        isActive: "true",
      });

      setPackOptions(
        (res.items ?? []).map((row) => {
          const id = typeof row.pack.packId === "string" ? row.pack.packId : row.pack.packId?.value ?? "";
          return { value: id, label: row.pack.description };
        }),
      );
    };

    void load();
  }, [open, packQuery]);

  useEffect(() => {
    const packId = value.referencePackId;

    if (!open || !packId) {
      setPackDetail(null);
      setExcludedSkuIds([]);
      return;
    }

    const loadDetail = async () => {
      const res = await getPackById(packId);
      setPackDetail(res);

      if (value.components?.length) return;

      const description = String(res.pack.description ?? "").trim();
      const quantity = Number(value.quantity) > 0 ? Number(value.quantity) : 1;

      const components = (res.items ?? []).map((row) => {
        const componentQuantity = roundMoney((Number(row.quantity) || 0) * quantity);
        const componentUnitPrice = Number(row.price ?? row.sku?.price ?? 0);
        const componentTotal = calcTotal(componentQuantity, componentUnitPrice);

        return {
          skuId: row.skuId,
          quantity: componentQuantity,
          unitPrice: componentUnitPrice,
          total: componentTotal,
          referencePackItemId: row.id,
        };
      });

      const total = sumComponentsTotal(components);
      const unitPrice = calcUnitPrice(quantity, total);

      onChange({
        ...value,
        description,
        quantity,
        unitPrice,
        total,
        components,
      });
    };

    void loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, value.referencePackId]);

  useEffect(() => {
    if (!open) return;
    setPackQuery("");
  }, [open]);

  const packItems = useMemo(() => packDetail?.items ?? [], [packDetail]);
  const excludedSkuSet = useMemo(() => new Set(excludedSkuIds), [excludedSkuIds]);

  const visiblePackItems = useMemo(
    () => packItems.filter((row) => !excludedSkuSet.has(row.skuId)),
    [excludedSkuSet, packItems],
  );

  const componentRows = useMemo(() => {
    if (isEditing) {
      return (value.components ?? []).map((component) => {
        const packItem = packItems.find(
          (item) => item.id === component.referencePackItemId || item.skuId === component.skuId,
        );

        return {
          id: component.referencePackItemId ?? component.skuId,
          skuId: component.skuId,
          label: packItem ? buildSkuLabelFromDetailItem(packItem) : component.skuId,
          packQuantity: Number(packItem?.quantity) || 0,
          packPrice: Number(packItem?.price ?? packItem?.sku?.price ?? component.unitPrice ?? 0),
          referencePackItemId: component.referencePackItemId ?? packItem?.id,
          component,
        };
      });
    }

    return visiblePackItems.map((row) => {
      const component = (value.components ?? []).find((c) => c.skuId === row.skuId);
      const baseQty = roundMoney((Number(row.quantity) || 0) * (Number(value.quantity) || 0));
      const unitPrice = component?.unitPrice ?? Number(row.price ?? row.sku?.price ?? 0);
      const quantity = component?.quantity ?? baseQty;

      return {
        id: row.id,
        skuId: row.skuId,
        label: buildSkuLabelFromDetailItem(row),
        packQuantity: Number(row.quantity) || 0,
        packPrice: Number(row.price ?? row.sku?.price ?? 0),
        referencePackItemId: row.id,
        component: {
          skuId: row.skuId,
          quantity,
          unitPrice,
          total: component?.total ?? calcTotal(quantity, unitPrice),
          referencePackItemId: row.id,
        },
      };
    });
  }, [isEditing, packItems, value.components, value.quantity, visiblePackItems]);

  const buildComponentsFromQuantity = (quantity: number) => {
    return componentRows.map((row) => {
      const componentQuantity = isEditing
        ? row.component.quantity
        : roundMoney((Number(row.packQuantity) || 0) * quantity);

      const componentUnitPrice = Number(row.component.unitPrice) || row.packPrice;
      const componentTotal = calcTotal(componentQuantity, componentUnitPrice);

      return {
        skuId: row.skuId,
        quantity: componentQuantity,
        unitPrice: componentUnitPrice,
        total: componentTotal,
        referencePackItemId: row.referencePackItemId,
      };
    });
  };

  const recalcParentFromComponents = (
    nextValue: SaleOrderItemInput,
    components: SaleOrderItemComponentInput[],
  ): SaleOrderItemInput => {
    const total = sumComponentsTotal(components);
    const unitPrice = calcUnitPrice(nextValue.quantity, total);

    return {
      ...nextValue,
      components,
      total,
      unitPrice,
    };
  };

  const removePackSku = useCallback(
    (skuId: string) => {
      if ((value.components ?? []).length <= 1) return;

      setExcludedSkuIds((prev) => (prev.includes(skuId) ? prev : [...prev, skuId]));

      const components = (value.components ?? []).filter((component) => component.skuId !== skuId);

      onChange(recalcParentFromComponents(value, components));
    },
    [onChange, value],
  );

  return (
    <Modal open={open} onClose={onClose} title={title} className="max-w-4xl max-h-160" bodyClassName="p-4">
      <div className="space-y-4">
        <div className="grid grid-cols-1">
          <FloatingSelect
            label="Seleccionar Pack"
            name="pack"
            value={value.referencePackId ?? ""}
            onChange={(v) => {
              setExcludedSkuIds([]);
              onChange({
                ...value,
                referencePackId: v || undefined,
                components: [],
                unitPrice: 0,
                total: 0,
              });
            }}
            options={packOptions}
            searchable
            searchPlaceholder="Buscar pack..."
            emptyMessage="Sin packs"
            onSearchChange={setPackQuery}
          />
        </div>

        <div className="bg-gray-100/80 p-5 rounded-xl space-y-5">
          <FloatingInput
            label="Descripción"
            name="item-description"
            value={value.description}
            onChange={(e) => onChange({ ...value, description: e.target.value })}
          />

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <FloatingInput
              label="Cantidad"
              name="item-qty"
              type="number"
              min={0}
              step="0.001"
              value={String(value.quantity)}
              onChange={(e) => {
                const quantity = parseDecimalInput(e.target.value);

                if (hasPack && componentRows.length > 0) {
                  const components = buildComponentsFromQuantity(quantity);
                  const total = sumComponentsTotal(components);
                  const unitPrice = calcUnitPrice(quantity, total);

                  onChange({
                    ...value,
                    quantity,
                    unitPrice,
                    total,
                    components,
                  });

                  return;
                }

                const total = calcTotal(quantity, value.unitPrice);

                onChange({
                  ...value,
                  quantity,
                  total,
                });
              }}
            />

            <FloatingInput
              label="Precio unit."
              name="item-unit-price"
              type="number"
              min={0}
              step="0.01"
              value={String(value.unitPrice)}
              onChange={(e) => {
                const unitPrice = parseDecimalInput(e.target.value);
                const total = calcTotal(value.quantity, unitPrice);

                if (hasPack) {
                  const components = distributeTotalToComponents(value.components ?? [], total);

                  onChange({
                    ...value,
                    unitPrice,
                    total,
                    components,
                  });

                  return;
                }

                onChange({
                  ...value,
                  unitPrice,
                  total,
                });
              }}
            />

            <FloatingInput
              label="Total"
              name="item-total"
              type="number"
              min={0}
              step="0.01"
              value={String(value.total)}
              onChange={(e) => {
                const total = parseDecimalInput(e.target.value);
                const unitPrice = calcUnitPrice(value.quantity, total);

                if (hasPack) {
                  const components = distributeTotalToComponents(value.components ?? [], total);

                  onChange({
                    ...value,
                    total,
                    unitPrice,
                    components,
                  });

                  return;
                }

                onChange({
                  ...value,
                  total,
                  unitPrice,
                });
              }}
            />
          </div>

          {hasPack && (
            <div className="rounded-xl bg-white p-3 text-sm shadow-inherit">
              <div className="font-semibold">Productos del pack</div>

              <div className="mt-2 space-y-2">
                {componentRows.map((row) => {
                  const currentQty = Number(row.component.quantity) || 0;
                  const currentUnitPrice = Number(row.component.unitPrice) || 0;
                  const currentTotal = Number(row.component.total) || 0;
                  const disabledDelete = componentRows.length <= 1;

                  return (
                    <div key={row.id} className="grid grid-cols-[1fr_90px_90px_90px_50px] gap-2 items-center">
                      <div className="truncate">{row.label}</div>

                      <FloatingInput
                        label="Cantidad"
                        name={`pack-sku-qty-${row.skuId}`}
                        type="number"
                        min={0}
                        step="0.001"
                        value={String(currentQty)}
                        onChange={(e) => {
                          const quantity = parseDecimalInput(e.target.value);
                          const total = calcTotal(quantity, currentUnitPrice);

                          const nextComponent: SaleOrderItemComponentInput = {
                            skuId: row.skuId,
                            quantity,
                            unitPrice: currentUnitPrice,
                            total,
                            referencePackItemId: row.referencePackItemId,
                          };

                          const components = upsertComponent(value.components ?? [], nextComponent);

                          onChange(recalcParentFromComponents(value, components));
                        }}
                      />

                      <FloatingInput
                        label="Precio unit."
                        name={`pack-sku-price-${row.skuId}`}
                        type="number"
                        min={0}
                        step="0.01"
                        value={String(currentUnitPrice)}
                        onChange={(e) => {
                          const unitPrice = parseDecimalInput(e.target.value);
                          const total = calcTotal(currentQty, unitPrice);

                          const nextComponent: SaleOrderItemComponentInput = {
                            skuId: row.skuId,
                            quantity: currentQty,
                            unitPrice,
                            total,
                            referencePackItemId: row.referencePackItemId,
                          };

                          const components = upsertComponent(value.components ?? [], nextComponent);

                          onChange(recalcParentFromComponents(value, components));
                        }}
                      />

                      <FloatingInput
                        label="Total"
                        name={`pack-sku-total-${row.skuId}`}
                        type="number"
                        min={0}
                        step="0.01"
                        value={String(currentTotal)}
                        onChange={(e) => {
                          const total = parseDecimalInput(e.target.value);
                          const unitPrice = calcUnitPrice(currentQty, total);

                          const nextComponent: SaleOrderItemComponentInput = {
                            skuId: row.skuId,
                            quantity: currentQty,
                            unitPrice,
                            total,
                            referencePackItemId: row.referencePackItemId,
                          };

                          const components = upsertComponent(value.components ?? [], nextComponent);

                          onChange(recalcParentFromComponents(value, components));
                        }}
                      />

                      <div className="flex justify-center">
                        <SystemButton
                          variant="danger"
                          size="icon"
                          className="h-9 w-9"
                          title={disabledDelete ? "Debe existir al menos un SKU" : "Eliminar SKU"}
                          disabled={disabledDelete}
                          onClick={() => removePackSku(row.skuId)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </SystemButton>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <SystemButton variant="outline" onClick={onClose}>
            Cancelar
          </SystemButton>

          <SystemButton onClick={onConfirm}>Guardar</SystemButton>
        </div>
      </div>
    </Modal>
  );
}