import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Modal } from "@/shared/components/modales/Modal";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { FloatingSuggestInput } from "@/shared/components/components/FloatingSuggestInput";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { listPacks, getPackById } from "@/shared/services/packService";
import type { PackDetailResponse, PackItemSku } from "@/features/catalog/types/pack";
import type { SaleOrderItemComponentInput, SaleOrderItemInput } from "@/features/sale-orders/types/saleOrder";
import { parseDecimalInput } from "@/shared/utils/functionPurchases";
import { buildSkuLabelFromDetailItem } from "@/features/catalog/packs/Packs";
import { SaleOrderAddSkuModal } from "@/features/sale-orders/components/modal-create/SaleOrderAddSkuModal";
import { deriveSkuPresentation } from "@/features/sale-orders/utils/skuPresentation";

type Props = {
    open: boolean;
    title: string;
    value: SaleOrderItemInput;
    onChange: (next: SaleOrderItemInput) => void;
    onClose: () => void;
    onConfirm: () => void;
};

type ComponentRow = {
    id: string;
    skuId: string;
    label: string;
    packQuantity: number;
    packPrice: number;
    referencePackItemId?: string;
    component: SaleOrderItemComponentInput;
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

const getSkuCode = (sku: PackItemSku | null | undefined, skuId: string) => {
    return `${sku?.backendSku ?? ""}${sku?.customSku ?? ""}${skuId ?? ""}`;
};

const getSkuImage = (sku: PackItemSku | null | undefined) => {
    return sku?.image ?? null;
};

const getComponentSkuId = (component: SaleOrderItemComponentInput) => {
    return component.skuId ?? component.sku?.id ?? "";
};

const getComponentMatchKey = (component: SaleOrderItemComponentInput) => {
    return getComponentSkuId(component) || component.referencePackItemId || component.id || "";
};

const upsertComponent = (components: SaleOrderItemComponentInput[] = [], next: SaleOrderItemComponentInput) => {
    const nextKey = getComponentMatchKey(next);
    const index = nextKey ? components.findIndex((component) => getComponentMatchKey(component) === nextKey) : -1;
    if (index === -1) return [...components, next];

    return components.map((component, i) => (i === index ? { ...component, ...next } : component));
};

const distributeTotalToComponents = (components: SaleOrderItemComponentInput[] = [], newTotal: number) => {
    if (components.length === 0) return components;

    const targetCents = Math.round((Number(newTotal) || 0) * 100);
    const baseCents = Math.trunc(targetCents / components.length);
    const remainderCents = targetCents - baseCents * components.length;

    return components.map((item, index) => {
        const lineCents = baseCents + (index === components.length - 1 ? remainderCents : 0);
        const total = roundMoney(lineCents / 100);

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
    const [openAddSku, setOpenAddSku] = useState(false);
    const [skuMetaById, setSkuMetaById] = useState<Record<string, { label: string; price?: number }>>({});

    const isEditing = Boolean(value.components?.length);
    const itemPresentation = useMemo(() => {
        if (value.referencePackId) {
            return {
                label: "Pack registrado",
                description: "La composición pertenece al catálogo; los cambios se guardarán solamente en este pedido.",
            };
        }
        if (value.packNameSnapshot) {
            return {
                label: "Pack histórico",
                description: "Se conserva la composición guardada aunque el pack del catálogo ya no esté disponible.",
            };
        }
        const componentCount = value.components?.length ?? 0;
        if (componentCount === 1) {
            return {
                label: "Producto independiente",
                description: "Al contener un solo SKU se mostrará como producto, no como pack.",
            };
        }
        if (componentCount >= 2) {
            return {
                label: "Pack desconocido",
                description: "Es una agrupación personalizada para este pedido y no modifica el catálogo de packs.",
            };
        }
        return {
            label: value.description.trim() ? "Agrupación en preparación" : "Sin selección",
            description: "Selecciona un pack registrado o escribe una descripción y añade productos para crear una agrupación personalizada.",
        };
    }, [value.components?.length, value.description, value.packNameSnapshot, value.referencePackId]);

    useEffect(() => {
        if (!open) return;

        let cancelled = false;
        const timeoutId = window.setTimeout(() => {
            const load = async () => {
                try {
                    const res = await listPacks({
                        q: packQuery.trim() || undefined,
                        page: 1,
                        limit: 10,
                        isActive: "true",
                    });

                    if (cancelled) return;

                    setPackOptions(
                        (res.items ?? []).map((row) => {
                            const id = typeof row.pack.packId === "string" ? row.pack.packId : (row.pack.packId?.value ?? "");
                            return { value: id, label: row.pack.description };
                        }),
                    );
                } catch {
                    if (!cancelled) setPackOptions([]);
                }
            };

            void load();
        }, 350);

        return () => {
            cancelled = true;
            window.clearTimeout(timeoutId);
        };
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

            const description = String(res.pack.description ?? "").trim();
            const quantity = Number(value.quantity) > 0 ? Number(value.quantity) : 1;
            const packBasePrice = Number(res.pack.total ?? 0);

            if (value.components?.length) {
                const components = value.components.map((component) => {
                    if (component.basePrice != null) return component;

                    const skuId = getComponentSkuId(component);
                    const packItem = (res.items ?? []).find(
                        (row) =>
                            row.id === component.referencePackItemId ||
                            row.skuId === skuId,
                    );

                    return {
                        ...component,
                        basePrice: Number(
                            packItem?.price ??
                                packItem?.sku?.price ??
                                component.sku?.price ??
                                component.unitPrice ??
                                0,
                        ),
                    };
                });

                onChange({
                    ...value,
                    description: value.description || description,
                    basePrice:
                        value.basePrice ?? packBasePrice ?? value.unitPrice,
                    components,
                });
                return;
            }

            const components: SaleOrderItemComponentInput[] = (res.items ?? []).map((row) => {
                const componentQuantity = roundMoney((Number(row.quantity) || 0) * quantity);
                const componentUnitPrice = Number(row.price ?? row.sku?.price ?? 0);
                const componentTotal = calcTotal(componentQuantity, componentUnitPrice);
                const skuLabel = buildSkuLabelFromDetailItem(row);

                return {
                    skuId: row.skuId,
                    skuLabel,
                    skuCode: getSkuCode(row.sku, row.skuId),
                    skuImage: getSkuImage(row.sku),
                    quantity: componentQuantity,
                    basePrice: componentUnitPrice,
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
                basePrice: packBasePrice,
                unitPrice,
                total,
                components,
            });
        };

        void loadDetail();
        // Hydrate only when the selected pack changes; value/onChange updates inside the effect should not retrigger it.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, value.referencePackId]);

    useEffect(() => {
        if (!open) return;
        setPackQuery("");
    }, [open]);

    const packItems = useMemo(() => packDetail?.items ?? [], [packDetail]);
    const excludedSkuSet = useMemo(() => new Set(excludedSkuIds), [excludedSkuIds]);

    const visiblePackItems = useMemo(() => packItems.filter((row) => !excludedSkuSet.has(row.skuId)), [excludedSkuSet, packItems]);

    const componentRows = useMemo<ComponentRow[]>(() => {
        if (isEditing) {
            return (value.components ?? []).map((component) => {
                const resolvedSkuId = component.skuId ?? component.sku?.id ?? "";
                const cached = resolvedSkuId ? skuMetaById[resolvedSkuId] : undefined;
                const packItem = packItems.find((item) => item.id === component.referencePackItemId || item.skuId === resolvedSkuId);
                const skuPresentation = component.sku
                    ? deriveSkuPresentation({ ...component.sku, attributes: component.attributes }, resolvedSkuId)
                    : null;

                const fallbackLabel = packItem ? buildSkuLabelFromDetailItem(packItem) : (cached?.label ?? resolvedSkuId);
                const label = skuPresentation?.skuLabel ?? component.skuLabel ?? fallbackLabel;
                const componentQuantity = Number(component.quantity) || 0;
                const parentQuantity = Number(value.quantity) || 0;
                const packQuantity = Number(packItem?.quantity) || (parentQuantity > 0 ? roundMoney(componentQuantity / parentQuantity) : componentQuantity);

                return {
                    id: component.referencePackItemId ?? resolvedSkuId,
                    skuId: resolvedSkuId,
                    label,
                    packQuantity,
                    packPrice: Number(
                        component.basePrice ??
                            packItem?.price ??
                            packItem?.sku?.price ??
                            component.sku?.price ??
                            component.unitPrice ??
                            0,
                    ),
                    referencePackItemId: component.referencePackItemId ?? packItem?.id,
                    component: {
                        ...component,
                        skuId: resolvedSkuId,
                        skuLabel: label,
                        skuCode: skuPresentation?.skuCode ?? component.skuCode ?? (packItem ? getSkuCode(packItem.sku, resolvedSkuId) : resolvedSkuId),
                        skuImage: skuPresentation?.skuImage ?? component.skuImage ?? (packItem ? getSkuImage(packItem.sku) : null),
                    },
                };
            });
        }

        return visiblePackItems.map((row) => {
            const existingComponent = (value.components ?? []).find((component) => getComponentSkuId(component) === row.skuId);
            const baseQty = roundMoney((Number(row.quantity) || 0) * (Number(value.quantity) || 0));
            const unitPrice = existingComponent?.unitPrice ?? Number(row.price ?? row.sku?.price ?? 0);
            const quantity = existingComponent?.quantity ?? baseQty;
            const label = existingComponent?.skuLabel ?? buildSkuLabelFromDetailItem(row);

            return {
                id: row.id,
                skuId: row.skuId,
                label,
                packQuantity: Number(row.quantity) || 0,
                packPrice: Number(row.price ?? row.sku?.price ?? 0),
                referencePackItemId: row.id,
                component: {
                    ...(existingComponent ?? {}),
                    skuId: row.skuId,
                    skuLabel: label,
                    skuCode: existingComponent?.skuCode ?? getSkuCode(row.sku, row.skuId),
                    skuImage: existingComponent?.skuImage ?? getSkuImage(row.sku),
                    quantity,
                    basePrice: Number(
                        existingComponent?.basePrice ??
                            row.price ??
                            row.sku?.price ??
                            unitPrice,
                    ),
                    unitPrice,
                    total: existingComponent?.total ?? calcTotal(quantity, unitPrice),
                    referencePackItemId: row.id,
                },
            };
        });
    }, [isEditing, packItems, skuMetaById, value.components, value.quantity, visiblePackItems]);

    const buildComponentsFromQuantity = (quantity: number, total: number) => {
        const components = componentRows.map((row) => {
            return {
                ...row.component,
                skuId: row.skuId,
                skuLabel: row.component.skuLabel ?? row.label,
                skuCode: row.component.skuCode,
                skuImage: row.component.skuImage ?? null,
                quantity: roundMoney(quantity),
                unitPrice: 0,
                total: 0,
                referencePackItemId: row.referencePackItemId,
            };
        });

        return distributeTotalToComponents(components, total);
    };

    const buildComponentFromRow = (row: ComponentRow): SaleOrderItemComponentInput => ({
        ...row.component,
        skuId: row.skuId,
        skuLabel: row.component.skuLabel ?? row.label,
        skuCode: row.component.skuCode,
        skuImage: row.component.skuImage ?? row.component.sku?.image ?? null,
        quantity: Number(row.component.quantity) || 0,
        unitPrice: Number(row.component.unitPrice) || 0,
        total: Number(row.component.total) || 0,
        referencePackItemId: row.referencePackItemId,
    });

    const buildComponentsFromTotal = (total: number) => {
        const components = componentRows.length > 0 ? componentRows.map(buildComponentFromRow) : (value.components ?? []);
        return distributeTotalToComponents(components, total);
    };

    const recalcParentFromComponents = (nextValue: SaleOrderItemInput, components: SaleOrderItemComponentInput[]): SaleOrderItemInput => {
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

            if (packItems.some((row) => row.skuId === skuId)) {
                setExcludedSkuIds((prev) => (prev.includes(skuId) ? prev : [...prev, skuId]));
            }

            const components = (value.components ?? []).filter((component) => getComponentSkuId(component) !== skuId);

            onChange(recalcParentFromComponents(value, components));
        },
        [onChange, packItems, value],
    );

    return (
        <Modal open={open} onClose={onClose} title={title} className="max-w-4xl max-h-160" bodyClassName="p-4">
            <div className="space-y-4">
                    <div className="bg-muted/40 p-5 rounded-xl space-y-5">
                        <div
                            role="status"
                            aria-live="polite"
                            data-testid="sale-order-item-presentation"
                            className="rounded-lg border border-border bg-background px-3 py-2"
                        >
                            <p className="text-xs font-semibold text-foreground">{itemPresentation.label}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{itemPresentation.description}</p>
                        </div>
                        <FloatingSuggestInput
                            label="Descripción"
                            name="item-description"
                            value={value.description}
                            onChange={(text) => {
                                setPackQuery(text);
                                onChange({
                                    ...value,
                                    description: text,
                                    referencePackId: undefined,
                                    packNameSnapshot: null,
                                    basePrice: undefined,
                                    components: (value.components ?? []).map((component) => ({
                                        ...component,
                                        referencePackItemId: undefined,
                                    })),
                                });
                            }}
                            onOptionSelect={(option) => {
                                setExcludedSkuIds([]);
                                onChange({
                                    ...value,
                                    description: option.label,
                                    referencePackId: option.value || undefined,
                                    packNameSnapshot: option.value ? option.label : null,
                                    components: [],
                                    basePrice: undefined,
                                    unitPrice: 0,
                                    total: 0,
                                });
                            }}
                            options={packOptions}
                            searchPlaceholder="Busca un pack o escribe una agrupación"
                            emptyMessage="No se encontraron packs"
                            panelWidthMode="min-trigger"
                        />

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                            <FloatingInput
                                label="Cantidad"
                                name="item-qty"
                                type="number"
                                min={0}
                                step="0.01"
                                value={String(value.quantity)}
                                onChange={(e) => {
                                    const quantity = roundMoney(parseDecimalInput(e.target.value));
                                    const total = calcTotal(quantity, value.unitPrice);
                                    if (componentRows.length > 0) {
                                        const components = buildComponentsFromQuantity(quantity, total);
                                        onChange({
                                            ...value,
                                            quantity,
                                            total,
                                            components,
                                        });

                                        return;
                                    }
                                    onChange({
                                        ...value,
                                        quantity,
                                        total,
                                    });
                                }}
                            />

                            <FloatingInput
                                label="Precio base"
                                name="item-base-price"
                                type="number"
                                min={0}
                                step="0.01"
                                value={String(value.basePrice ?? value.unitPrice)}
                                readOnly
                            />

                            <FloatingInput
                                label="Precio unit."
                                name="item-unit-price"
                                type="number"
                                min={0}
                                step="0.01"
                                value={String(value.unitPrice)}
                                onChange={(e) => {
                                    const unitPrice = roundMoney(parseDecimalInput(e.target.value));
                                    const total = calcTotal(value.quantity, unitPrice);
                                    if (componentRows.length > 0) {
                                        const components = buildComponentsFromTotal(total);
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
                                    const total = roundMoney(parseDecimalInput(e.target.value));
                                    const unitPrice = calcUnitPrice(value.quantity, total);

                                    if (componentRows.length > 0) {
                                        const components = buildComponentsFromTotal(total);

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

                    <div className="rounded-xl bg-background p-3 text-sm shadow-inherit">
                        <div className="flex">
                            <div className="font-semibold p-2">Productos incluidos</div>
                            <SystemButton size="sm" leftIcon={<Plus className="h-4 w-4" />} aria-label="Añadir producto" title="Añadir producto" onClick={() => setOpenAddSku(true)} />
                        </div>

                        <div className="mt-2 space-y-2">
                            {componentRows.map((row) => {
                                const currentQty = Number(row.component.quantity) || 0;
                                const currentUnitPrice = Number(row.component.unitPrice) || 0;
                                const currentBasePrice = Number(
                                    row.component.basePrice ?? row.packPrice ?? currentUnitPrice,
                                ) || 0;
                                const currentTotal = Number(row.component.total) || 0;
                                const disabledDelete = componentRows.length <= 1;

                                return (
                                    <div key={row.id} className="grid grid-cols-[1fr_90px_90px_90px_90px_50px] gap-2 items-center">
                                        <div className="truncate">{row.label}</div>

                                        <FloatingInput
                                            label="Cantidad"
                                            name={`pack-sku-qty-${row.skuId}`}
                                            type="number"
                                            min={0}
                                            step="0.01"
                                            value={String(currentQty)}
                                            onChange={(e) => {
                                                const quantity = roundMoney(parseDecimalInput(e.target.value));
                                                const total = calcTotal(quantity, currentUnitPrice);

                                                const nextComponent: SaleOrderItemComponentInput = {
                                                    ...row.component,
                                                    skuId: row.skuId,
                                                    skuLabel: row.component.skuLabel ?? row.label,
                                                    skuCode: row.component.skuCode,
                                                    skuImage: row.component.skuImage ?? row.component.sku?.image ?? null,
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
                                            label="Precio base"
                                            name={`pack-sku-base-price-${row.skuId}`}
                                            type="number"
                                            min={0}
                                            step="0.01"
                                            value={String(currentBasePrice)}
                                            readOnly
                                        />

                                        <FloatingInput
                                            label="Precio unit."
                                            name={`pack-sku-price-${row.skuId}`}
                                            type="number"
                                            min={0}
                                            step="0.01"
                                            value={String(currentUnitPrice)}
                                            onChange={(e) => {
                                                const unitPrice = roundMoney(parseDecimalInput(e.target.value));
                                                const total = calcTotal(currentQty, unitPrice);

                                                const nextComponent: SaleOrderItemComponentInput = {
                                                    ...row.component,
                                                    skuId: row.skuId,
                                                    skuLabel: row.component.skuLabel ?? row.label,
                                                    skuCode: row.component.skuCode,
                                                    skuImage: row.component.skuImage ?? row.component.sku?.image ?? null,
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
                                                const total = roundMoney(parseDecimalInput(e.target.value));
                                                const unitPrice = calcUnitPrice(currentQty, total);

                                                const nextComponent: SaleOrderItemComponentInput = {
                                                    ...row.component,
                                                    skuId: row.skuId,
                                                    skuLabel: row.component.skuLabel ?? row.label,
                                                    skuCode: row.component.skuCode,
                                                    skuImage: row.component.skuImage ?? row.component.sku?.image ?? null,
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
                                                onClick={() => (row.skuId ? removePackSku(row.skuId) : undefined)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </SystemButton>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <SaleOrderAddSkuModal
                    open={openAddSku}
                    onClose={() => setOpenAddSku(false)}
                    onAdd={({ skuId, label, quantity, basePrice, unitPrice, skuImage }) => {
                        setSkuMetaById((prev) => ({ ...prev, [skuId]: { label, price: basePrice } }));
                        setExcludedSkuIds((prev) => prev.filter((id) => id !== skuId));

                        const normalizedQuantity = roundMoney(quantity);
                        const total = calcTotal(normalizedQuantity, unitPrice);

                        const nextComponent: SaleOrderItemComponentInput = {
                            skuId,
                            skuLabel: label,
                            skuCode: skuId,
                            skuImage: skuImage ?? null,
                            quantity: normalizedQuantity,
                            basePrice,
                            unitPrice,
                            total,
                            referencePackItemId: undefined,
                        };

                        const components = upsertComponent(value.components ?? [], nextComponent);
                        onChange(recalcParentFromComponents(value, components));
                        setOpenAddSku(false);
                    }}
                />

                <div className="flex justify-end gap-2">
                    <SystemButton variant="outline" onClick={onClose}>
                        Cancelar
                    </SystemButton>
                    <SystemButton
                        onClick={() => {
                            onConfirm();
                        }}
                    >
                        Guardar
                    </SystemButton>
                </div>
            </div>
        </Modal>
    );
}
