import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Package, Plus, Trash2 } from "lucide-react";
import { env } from "@/env";
import type {
  SaleOrderEditPolicy,
  SaleOrderItemComponentInput,
  SaleOrderItemInput,
} from "@/features/sale-orders/types/saleOrder";
import type { skuStock } from "@/features/catalog/types/documentInventory";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { cn } from "@/shared/lib/utils";
import { deriveSkuPresentation } from "@/features/sale-orders/utils/skuPresentation";
import { parseDecimalInput } from "@/shared/utils/functionPurchases";
import { getSaleOrderStocksBySkuIds } from "@/shared/services/saleOrderStockService";
import { getPackById, listPacks } from "@/shared/services/packService";
import { SaleOrderAddSkuModal } from "@/features/sale-orders/components/modal-create/SaleOrderAddSkuModal";
import { buildSkuLabelFromDetailItem } from "@/features/catalog/packs/Packs";

type Props = {
  items: SaleOrderItemInput[];
  warehouseId?: string;
  reserveBool?: boolean | null;
  stockStatus?: SaleOrderEditPolicy["stockStatus"];
  productsEditable: boolean;
  onChangeItem: (item: SaleOrderItemInput, index: number) => void;
  onDelete: (item: SaleOrderItemInput, index: number) => void;
  onOpenDetail: (
    item: SaleOrderItemInput,
    index: number,
    component: SaleOrderItemComponentInput,
  ) => void;
};

const STOCK_REFRESH_DEBOUNCE_MS = 250;

const roundMoney = (value: number) =>
  Math.round((Number(value) || 0) * 100) / 100;

const calcTotal = (quantity: number, unitPrice: number) =>
  roundMoney((Number(quantity) || 0) * (Number(unitPrice) || 0));

const calcUnitPrice = (quantity: number, total: number) => {
  const safeQuantity = Number(quantity) || 0;
  if (safeQuantity <= 0) return 0;
  return roundMoney((Number(total) || 0) / safeQuantity);
};

const sumComponentsTotal = (
  components: SaleOrderItemComponentInput[] = [],
) =>
  roundMoney(
    components.reduce(
      (accumulator, component) =>
        accumulator + (Number(component.total) || 0),
      0,
    ),
  );

const distributeTotalToComponents = (
  components: SaleOrderItemComponentInput[] = [],
  newTotal: number,
) => {
  if (components.length === 0) return components;

  const targetCents = Math.round((Number(newTotal) || 0) * 100);
  const baseCents = Math.trunc(targetCents / components.length);
  const remainderCents = targetCents - baseCents * components.length;

  return components.map((component, componentIndex) => {
    const lineCents =
      baseCents +
      (componentIndex === components.length - 1 ? remainderCents : 0);
    const total = roundMoney(lineCents / 100);

    return {
      ...component,
      total,
      unitPrice: calcUnitPrice(component.quantity, total),
    };
  });
};

const recalcParentFromComponents = (
  item: SaleOrderItemInput,
  components: SaleOrderItemComponentInput[],
): SaleOrderItemInput => {
  const total = sumComponentsTotal(components);

  return {
    ...item,
    components,
    total,
    unitPrice: calcUnitPrice(item.quantity, total),
  };
};

const updatePackQuantity = (
  item: SaleOrderItemInput,
  quantity: number,
): SaleOrderItemInput => {
  const total = calcTotal(quantity, item.unitPrice);
  const currentComponents = item.components ?? [];

  if (currentComponents.length === 0) {
    return { ...item, quantity, total };
  }

  const components = distributeTotalToComponents(
    currentComponents.map((component) => ({
      ...component,
      quantity: roundMoney(quantity),
      unitPrice: 0,
      total: 0,
    })),
    total,
  );

  return { ...item, quantity, total, components };
};

const updatePackUnitPrice = (
  item: SaleOrderItemInput,
  unitPrice: number,
): SaleOrderItemInput => {
  const total = calcTotal(item.quantity, unitPrice);
  const currentComponents = item.components ?? [];

  return {
    ...item,
    unitPrice,
    total,
    components:
      currentComponents.length > 0
        ? distributeTotalToComponents(currentComponents, total)
        : currentComponents,
  };
};

const updatePackTotal = (
  item: SaleOrderItemInput,
  total: number,
): SaleOrderItemInput => {
  const currentComponents = item.components ?? [];

  return {
    ...item,
    total,
    unitPrice: calcUnitPrice(item.quantity, total),
    components:
      currentComponents.length > 0
        ? distributeTotalToComponents(currentComponents, total)
        : currentComponents,
  };
};

const updateComponentQuantity = (
  item: SaleOrderItemInput,
  componentIndex: number,
  quantity: number,
) => {
  const components = (item.components ?? []).map((component, index) =>
    index === componentIndex
      ? {
          ...component,
          quantity,
          total: calcTotal(quantity, component.unitPrice),
        }
      : component,
  );

  return recalcParentFromComponents(item, components);
};

const updateComponentUnitPrice = (
  item: SaleOrderItemInput,
  componentIndex: number,
  unitPrice: number,
) => {
  const components = (item.components ?? []).map((component, index) =>
    index === componentIndex
      ? {
          ...component,
          unitPrice,
          total: calcTotal(component.quantity, unitPrice),
        }
      : component,
  );

  return recalcParentFromComponents(item, components);
};

const updateComponentTotal = (
  item: SaleOrderItemInput,
  componentIndex: number,
  total: number,
) => {
  const components = (item.components ?? []).map((component, index) =>
    index === componentIndex
      ? {
          ...component,
          total,
          unitPrice: calcUnitPrice(component.quantity, total),
        }
      : component,
  );

  return recalcParentFromComponents(item, components);
};

const getSkuId = (component: SaleOrderItemComponentInput) =>
  component.skuId ?? component.sku?.id ?? "";

const getComponentMatchKey = (component: SaleOrderItemComponentInput) =>
  getSkuId(component) ||
  component.referencePackItemId ||
  component.id ||
  "";

const upsertComponent = (
  components: SaleOrderItemComponentInput[] = [],
  nextComponent: SaleOrderItemComponentInput,
) => {
  const nextKey = getComponentMatchKey(nextComponent);
  const existingIndex = nextKey
    ? components.findIndex(
        (component) => getComponentMatchKey(component) === nextKey,
      )
    : -1;

  if (existingIndex === -1) return [...components, nextComponent];

  return components.map((component, index) =>
    index === existingIndex
      ? { ...component, ...nextComponent }
      : component,
  );
};

const formatQuantity = (value?: number | null) =>
  Number(value ?? 0).toLocaleString("es-PE", {
    maximumFractionDigits: 2,
  });

const getItemKey = (item: SaleOrderItemInput, index: number) =>
  item.id ?? `${item.referencePackId ?? "item"}-${index}`;

const resolveImageUrl = (value?: string | null) => {
  if (!value) return "";
  if (/^(https?:|blob:|data:)/i.test(value)) return value;
  try {
    return new URL(value, env.apiBaseUrl).toString();
  } catch {
    return value;
  }
};

const getSkuLabel = (component: SaleOrderItemComponentInput) =>
  component.sku
    ? deriveSkuPresentation(
        { ...component.sku, attributes: component.attributes },
        getSkuId(component),
      ).skuLabel
    : component.skuLabel ||
      component.skuCode ||
      component.skuId ||
      "SKU";

type SaleOrderItemKind = "PRODUCT" | "PACK" | "UNKNOWN_PACK";

type PackSelectOption = {
  value: string;
  label: string;
};

const UNKNOWN_PACK_OPTION_VALUE = "__unknown_pack__";
const HISTORICAL_PACK_OPTION_VALUE = "__historical_pack__";

const getSaleOrderItemKind = (
  item: SaleOrderItemInput,
): SaleOrderItemKind => {
  const components = item.components ?? [];
  if (
    !item.referencePackId &&
    !item.packNameSnapshot &&
    components.length === 1
  ) {
    return "PRODUCT";
  }
  if (item.referencePackId || item.packNameSnapshot) return "PACK";
  return "UNKNOWN_PACK";
};

const updateIndependentProductQuantity = (
  item: SaleOrderItemInput,
  quantity: number,
) => {
  const component = item.components?.[0];
  if (!component) return item;
  const total = calcTotal(quantity, component.unitPrice);
  return {
    ...item,
    quantity,
    unitPrice: component.unitPrice,
    total,
    components: [{ ...component, quantity, total }],
  };
};

const updateIndependentProductUnitPrice = (
  item: SaleOrderItemInput,
  unitPrice: number,
) => {
  const component = item.components?.[0];
  if (!component) return item;
  const total = calcTotal(component.quantity, unitPrice);
  return {
    ...item,
    quantity: component.quantity,
    unitPrice,
    total,
    components: [{ ...component, unitPrice, total }],
  };
};

const updateIndependentProductTotal = (
  item: SaleOrderItemInput,
  total: number,
) => {
  const component = item.components?.[0];
  if (!component) return item;
  const unitPrice = calcUnitPrice(component.quantity, total);
  return {
    ...item,
    quantity: component.quantity,
    unitPrice,
    total,
    components: [{ ...component, unitPrice, total }],
  };
};

export function SaleOrderItemsTable({
  items,
  warehouseId,
  reserveBool,
  stockStatus = "NONE",
  productsEditable,
  onChangeItem,
  onDelete,
  onOpenDetail,
}: Props) {
  const [collapsedItems, setCollapsedItems] = useState<string[]>([]);
  const [stocksBySkuId, setStocksBySkuId] = useState<
    Record<string, skuStock | null>
  >({});
  const [loadingStock, setLoadingStock] = useState(false);
  const [recentPackOptions, setRecentPackOptions] = useState<PackSelectOption[]>(
    [],
  );
  const hasSelectablePacks = items.some(
    (item) => getSaleOrderItemKind(item) !== "PRODUCT",
  );

  useEffect(() => {
    if (!hasSelectablePacks) {
      setRecentPackOptions([]);
      return;
    }

    let cancelled = false;

    const loadRecentPacks = async () => {
      try {
        const response = await listPacks({
          page: 1,
          limit: 10,
          isActive: "true",
        });

        if (!cancelled) {
          setRecentPackOptions(
            (response.items ?? [])
              .map((entry) => ({
                value:
                  typeof entry.pack.packId === "string"
                    ? entry.pack.packId
                    : entry.pack.packId?.value ?? "",
                label: entry.pack.description,
              }))
              .filter((option) => option.value),
          );
        }
      } catch {
        if (!cancelled) setRecentPackOptions([]);
      }
    };

    void loadRecentPacks();

    return () => {
      cancelled = true;
    };
  }, [hasSelectablePacks]);

  const skuIdsKey = useMemo(
    () =>
      Array.from(
        new Set(
          items.flatMap((item) =>
            (item.components ?? []).map(getSkuId).filter(Boolean),
          ),
        ),
      )
        .sort()
        .join("|"),
    [items],
  );

  const stockDemandKey = useMemo(
    () =>
      items
        .flatMap((item) =>
          (item.components ?? [])
            .map((component) => {
              const skuId = getSkuId(component);
              if (!skuId) return "";
              return `${skuId}:${Number(component.quantity ?? 0)}`;
            })
            .filter(Boolean),
        )
        .sort()
        .join("|"),
    [items],
  );

  useEffect(() => {
    const skuIds = skuIdsKey ? skuIdsKey.split("|") : [];

    if (stockStatus === "CONSUMED" || !warehouseId || skuIds.length === 0) {
      setStocksBySkuId({});
      setLoadingStock(false);
      return;
    }

    let cancelled = false;

    const loadStocks = async () => {
      setLoadingStock(true);

      try {
        const stocks = await getSaleOrderStocksBySkuIds({
          warehouseId,
          skuIds,
          forceRefresh: true,
          requestKey: stockDemandKey,
        });

        if (!cancelled) {
          setStocksBySkuId(stocks);
        }
      } catch {
        if (!cancelled) {
          setStocksBySkuId(
            Object.fromEntries(skuIds.map((skuId) => [skuId, null])),
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingStock(false);
        }
      }
    };

    const timeoutId = window.setTimeout(() => {
      void loadStocks();
    }, STOCK_REFRESH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [stockDemandKey, stockStatus, skuIdsKey, warehouseId]);

  const toggleItem = (key: string) => {
    setCollapsedItems((current) =>
      current.includes(key)
        ? current.filter((itemKey) => itemKey !== key)
        : [...current, key],
    );
  };

  return (
    <div className="overflow-hidden rounded-sm border border-border/70 bg-background shadow-sm">
      <div className="max-h-[380px] overflow-auto scrollbar-panel">
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-10 bg-background">
            <tr className="border-b border-border/70 bg-muted/40">
              <th
                aria-label="Mostrar componentes de packs"
                className="px-2 py-2"
              />
              <HeaderCell>Producto / Pack</HeaderCell>
              <HeaderCell>Cant.</HeaderCell>
              <HeaderCell>Precio base</HeaderCell>
              <HeaderCell>Precio u.</HeaderCell>
              <HeaderCell>Total</HeaderCell>
              <HeaderCell>Stock</HeaderCell>
              <HeaderCell>Reservado</HeaderCell>
              <HeaderCell className="text-center">Acciones</HeaderCell>
            </tr>
          </thead>

          <tbody>
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-12 text-center text-sm text-muted-foreground"
                >
                  No hay productos ni packs.
                </td>
              </tr>
            ) : (
              items.map((item, index) => {
                const itemKey = getItemKey(item, index);
                const expanded = !collapsedItems.includes(itemKey);
                const components = item.components ?? [];
                const itemKind = getSaleOrderItemKind(item);
                if (itemKind === "PRODUCT") {
                  const component = components[0];
                  if (!component) return null;
                  const skuId = getSkuId(component);
                  const stock = skuId ? stocksBySkuId[skuId] : null;
                  return (
                    <ProductRow
                      key={itemKey}
                      item={item}
                      itemKey={itemKey}
                      index={index}
                      component={component}
                      stockLabel={resolveComponentStockLabel({
                        warehouseId,
                        loadingStock,
                        stockStatus,
                        available: stock?.available,
                      })}
                      reservedLabel={resolveReserveLabel(
                        reserveBool,
                        stockStatus,
                      )}
                      productsEditable={productsEditable}
                      onChangeItem={onChangeItem}
                      onDelete={onDelete}
                      onOpenDetail={onOpenDetail}
                    />
                  );
                }
                const flags = getPackStockFlags(
                  components,
                  warehouseId,
                  reserveBool,
                  stocksBySkuId,
                  loadingStock,
                  stockStatus,
                );

                return (
                  <PackRows
                    key={itemKey}
                    item={item}
                    itemKind={itemKind}
                    itemKey={itemKey}
                    index={index}
                    expanded={expanded}
                    stockLabel={flags.stock}
                    reservedLabel={flags.reserved}
                    warehouseId={warehouseId}
                    stocksBySkuId={stocksBySkuId}
                    loadingStock={loadingStock}
                    stockStatus={stockStatus}
                    productsEditable={productsEditable}
                    recentPackOptions={recentPackOptions}
                    onToggle={() => toggleItem(itemKey)}
                    onChangeItem={onChangeItem}
                    onDelete={onDelete}
                    onOpenDetail={onOpenDetail}
                  />
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProductRow({
  item,
  itemKey,
  index,
  component,
  stockLabel,
  reservedLabel,
  productsEditable,
  onChangeItem,
  onDelete,
  onOpenDetail,
}: {
  item: SaleOrderItemInput;
  itemKey: string;
  index: number;
  component: SaleOrderItemComponentInput;
  stockLabel: string;
  reservedLabel: string;
  productsEditable: boolean;
  onChangeItem: Props["onChangeItem"];
  onDelete: Props["onDelete"];
  onOpenDetail: Props["onOpenDetail"];
}) {
  const skuLabel = getSkuLabel(component);

  return (
    <tr className="border-b border-border/60 transition-colors hover:bg-muted/20">
      <td className="px-2 py-2 align-middle" aria-hidden="true" />
      <SkuCell
        component={component}
        badge="Producto"
        onOpenImage={() => onOpenDetail(item, index, component)}
      />
      <EditableNumberCell>
        <CompactFloatingNumberInput
          label="Cantidad"
          ariaLabel={`Cantidad del producto ${skuLabel}`}
          name={`product-quantity-${itemKey}`}
          value={component.quantity}
          step="0.01"
          readOnly={!productsEditable}
          onValueChange={(quantity) =>
            onChangeItem(
              updateIndependentProductQuantity(item, quantity),
              index,
            )
          }
        />
      </EditableNumberCell>
      <EditableNumberCell>
        <CompactFloatingNumberInput
          label="Precio base"
          ariaLabel={`Precio base del producto ${skuLabel}`}
          name={`product-base-price-${itemKey}`}
          value={
            component.basePrice ??
            component.sku?.price ??
            item.basePrice ??
            component.unitPrice
          }
          readOnly
        />
      </EditableNumberCell>
      <EditableNumberCell>
        <CompactFloatingNumberInput
          label="Precio unit."
          ariaLabel={`Precio unitario del producto ${skuLabel}`}
          name={`product-unit-price-${itemKey}`}
          value={component.unitPrice}
          readOnly={!productsEditable}
          onValueChange={(unitPrice) =>
            onChangeItem(
              updateIndependentProductUnitPrice(item, unitPrice),
              index,
            )
          }
        />
      </EditableNumberCell>
      <EditableNumberCell>
        <CompactFloatingNumberInput
          label="Total"
          ariaLabel={`Total del producto ${skuLabel}`}
          name={`product-total-${itemKey}`}
          value={component.total}
          readOnly={!productsEditable}
          onValueChange={(total) =>
            onChangeItem(updateIndependentProductTotal(item, total), index)
          }
        />
      </EditableNumberCell>
      <StatusCell testId={`product-stock-${item.id ?? itemKey}`}>
        {stockLabel}
      </StatusCell>
      <StatusCell testId={`product-reserved-${item.id ?? itemKey}`}>
        {reservedLabel}
      </StatusCell>
      <td className="px-2 py-2 align-middle">
        <div className="flex justify-center gap-2">
          <ActionButton
            action="Eliminar producto"
            item={item}
            targetLabel={skuLabel}
            danger
            disabled={!productsEditable}
            onClick={() => onDelete(item, index)}
          >
            <Trash2 className="h-4 w-4" />
          </ActionButton>
        </div>
      </td>
    </tr>
  );
}

function PackRows({
  item,
  itemKind,
  itemKey,
  index,
  expanded,
  stockLabel,
  reservedLabel,
  warehouseId,
  stocksBySkuId,
  loadingStock,
  stockStatus,
  productsEditable,
  recentPackOptions,
  onToggle,
  onChangeItem,
  onDelete,
  onOpenDetail,
}: {
  item: SaleOrderItemInput;
  itemKind: Exclude<SaleOrderItemKind, "PRODUCT">;
  itemKey: string;
  index: number;
  expanded: boolean;
  stockLabel: string;
  reservedLabel: string;
  warehouseId?: string;
  stocksBySkuId: Record<string, skuStock | null>;
  loadingStock: boolean;
  stockStatus: SaleOrderEditPolicy["stockStatus"];
  productsEditable: boolean;
  recentPackOptions: PackSelectOption[];
  onToggle: () => void;
  onChangeItem: Props["onChangeItem"];
  onDelete: Props["onDelete"];
  onOpenDetail: Props["onOpenDetail"];
}) {
  const action = expanded ? "Contraer" : "Desplegar";
  const accessibleItemType = "pack";

  return (
    <>
      <tr className="border-b border-border/60 transition-colors hover:bg-muted/20">
        <td className="px-2 py-2 align-middle">
          <button
            type="button"
            aria-expanded={expanded}
            aria-label={`${action} componentes del ${accessibleItemType} ${item.description}`}
            onClick={onToggle}
            className="inline-flex h-9 w-9 items-center justify-center rounded-sm transition-colors hover:bg-muted/50"
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 transition-transform",
                expanded && "rotate-180",
              )}
            />
          </button>
        </td>
        <td className="px-2 py-2 align-middle text-[10px]">
          <SaleOrderPackSelect
            item={item}
            itemKind={itemKind}
            itemKey={itemKey}
            recentOptions={recentPackOptions}
            disabled={!productsEditable}
            onChange={(nextItem) => onChangeItem(nextItem, index)}
          />
          <span className="text-[10px] text-muted-foreground">
            {(item.components ?? []).length} producto(s)
          </span>
        </td>
        <EditableNumberCell>
          <CompactFloatingNumberInput
            label="Cantidad"
            ariaLabel={`Cantidad del ${accessibleItemType} ${item.description}`}
            name={`pack-quantity-${itemKey}`}
            value={item.quantity}
            step="0.01"
            readOnly={!productsEditable}
            onValueChange={(quantity) =>
              onChangeItem(updatePackQuantity(item, quantity), index)
            }
          />
        </EditableNumberCell>
        <EditableNumberCell>
          <CompactFloatingNumberInput
            label="Precio base"
            ariaLabel={`Precio base del ${accessibleItemType} ${item.description}`}
            name={`pack-base-price-${itemKey}`}
            value={item.basePrice ?? item.unitPrice}
            readOnly
          />
        </EditableNumberCell>
        <EditableNumberCell>
          <CompactFloatingNumberInput
            label="Precio unit."
            ariaLabel={`Precio unitario del ${accessibleItemType} ${item.description}`}
            name={`pack-unit-price-${itemKey}`}
            value={item.unitPrice}
            readOnly={!productsEditable}
            onValueChange={(unitPrice) =>
              onChangeItem(updatePackUnitPrice(item, unitPrice), index)
            }
          />
        </EditableNumberCell>
        <EditableNumberCell>
          <CompactFloatingNumberInput
            label="Total"
            ariaLabel={`Total del ${accessibleItemType} ${item.description}`}
            name={`pack-total-${itemKey}`}
            value={item.total}
            readOnly={!productsEditable}
            onValueChange={(total) =>
              onChangeItem(updatePackTotal(item, total), index)
            }
          />
        </EditableNumberCell>
        <StatusCell testId={`pack-stock-${item.id ?? itemKey}`}>
          {stockLabel}
        </StatusCell>
        <StatusCell testId={`pack-reserved-${item.id ?? itemKey}`}>
          {reservedLabel}
        </StatusCell>
        <td className="px-2 py-2 align-middle">
          <div className="flex justify-center gap-2">
            <ActionButton
              action="Eliminar"
              item={item}
              danger
              disabled={!productsEditable}
              onClick={() => onDelete(item, index)}
            >
              <Trash2 className="h-4 w-4" />
            </ActionButton>
          </div>
        </td>
      </tr>
      {expanded ? (
        <tr className="border-b border-border/70 bg-muted/[0.12]">
          <td colSpan={9} className="p-0 sm:px-4 sm:py-1">
            <ComponentsSubtable
              item={item}
              itemIndex={index}
              warehouseId={warehouseId}
              stocksBySkuId={stocksBySkuId}
              loadingStock={loadingStock}
              stockStatus={stockStatus}
              productsEditable={productsEditable}
              onChangeItem={onChangeItem}
              onOpenDetail={(component) =>
                onOpenDetail(item, index, component)
              }
            />
          </td>
        </tr>
      ) : null}
    </>
  );
}

function ComponentsSubtable({
  item,
  itemIndex,
  warehouseId,
  stocksBySkuId,
  loadingStock,
  stockStatus,
  productsEditable,
  onChangeItem,
  onOpenDetail,
}: {
  item: SaleOrderItemInput;
  itemIndex: number;
  warehouseId?: string;
  stocksBySkuId: Record<string, skuStock | null>;
  loadingStock: boolean;
  stockStatus: SaleOrderEditPolicy["stockStatus"];
  productsEditable: boolean;
  onChangeItem: Props["onChangeItem"];
  onOpenDetail: (component: SaleOrderItemComponentInput) => void;
}) {
  const [openAddSku, setOpenAddSku] = useState(false);
  const components = item.components ?? [];
  const containerLabel = "pack";

  return (
    <>
      <div className="w-fit max-w-full overflow-hidden rounded-sm border border-border/60 bg-background">
        <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border/60 bg-muted/30">
            <SubHeaderCell ariaLabel="Producto">
              <div className="flex items-center gap-2">
                <span>Producto</span>
                <SystemButton
                  size="custom"
                  variant="outline"
                  className="h-6 rounded-md px-2 text-[10px] normal-case tracking-normal"
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                  aria-label={`Añadir producto al ${containerLabel} ${item.description}`}
                  title={`Añadir producto al ${containerLabel} ${item.description}`}
                  disabled={!productsEditable}
                  onClick={() => setOpenAddSku(true)}
                >
                  Añadir
                </SystemButton>
              </div>
            </SubHeaderCell>
            <SubHeaderCell>Cantidad</SubHeaderCell>
            <SubHeaderCell>Precio base</SubHeaderCell>
            <SubHeaderCell>Precio u.</SubHeaderCell>
            <SubHeaderCell>Total</SubHeaderCell>
            <SubHeaderCell>Stock</SubHeaderCell>
          </tr>
        </thead>
        <tbody>
          {components.length === 0 ? (
            <tr>
              <td
                colSpan={6}
                className="px-3 py-5 text-center text-muted-foreground"
              >
                Esta agrupación no tiene productos.
              </td>
            </tr>
          ) : (
            components.map((component, componentIndex) => {
              const skuId = getSkuId(component);
              const skuLabel = getSkuLabel(component);
              const stock = skuId ? stocksBySkuId[skuId] : null;
              const stockLabel = resolveComponentStockLabel({
                warehouseId,
                loadingStock,
                stockStatus,
                available: stock?.available,
              });

              return (
                <tr
                  key={`${skuId || "sku"}-${componentIndex}`}
                  className="border-b border-border/50 transition-colors last:border-b-0 hover:bg-muted/20"
                >
                  <SkuCell
                    component={component}
                    onOpenImage={() => onOpenDetail(component)}
                  />
                  <EditableNumberCell>
                    <CompactFloatingNumberInput
                      label="Cantidad"
                      ariaLabel={`Cantidad de ${skuLabel}`}
                      name={`component-quantity-${itemIndex}-${componentIndex}`}
                      value={component.quantity}
                      step="0.01"
                      readOnly={!productsEditable}
                      onValueChange={(quantity) =>
                        onChangeItem(
                          updateComponentQuantity(
                            item,
                            componentIndex,
                            quantity,
                          ),
                          itemIndex,
                        )
                      }
                    />
                  </EditableNumberCell>
                  <EditableNumberCell>
                    <CompactFloatingNumberInput
                      label="Precio base"
                      ariaLabel={`Precio base de ${skuLabel}`}
                      name={`component-base-price-${itemIndex}-${componentIndex}`}
                      value={
                        component.basePrice ??
                        component.sku?.price ??
                        component.unitPrice
                      }
                      readOnly
                    />
                  </EditableNumberCell>
                  <EditableNumberCell>
                    <CompactFloatingNumberInput
                      label="Precio unit."
                      ariaLabel={`Precio unitario de ${skuLabel}`}
                      name={`component-unit-price-${itemIndex}-${componentIndex}`}
                      value={component.unitPrice}
                      readOnly={!productsEditable}
                      onValueChange={(unitPrice) =>
                        onChangeItem(
                          updateComponentUnitPrice(
                            item,
                            componentIndex,
                            unitPrice,
                          ),
                          itemIndex,
                        )
                      }
                    />
                  </EditableNumberCell>
                  <EditableNumberCell>
                    <CompactFloatingNumberInput
                      label="Total"
                      ariaLabel={`Total de ${skuLabel}`}
                      name={`component-total-${itemIndex}-${componentIndex}`}
                      value={component.total}
                      readOnly={!productsEditable}
                      onValueChange={(total) =>
                        onChangeItem(
                          updateComponentTotal(item, componentIndex, total),
                          itemIndex,
                        )
                      }
                    />
                  </EditableNumberCell>
                  <td
                    data-testid={`component-stock-${skuId || componentIndex}`}
                    className="px-3 py-2 align-middle tabular-nums"
                  >
                    {stockLabel}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
        </table>
      </div>

      <SaleOrderAddSkuModal
        open={openAddSku}
        onClose={() => setOpenAddSku(false)}
        onAdd={({ skuId, label, quantity, basePrice, unitPrice, skuImage }) => {
          const nextComponent: SaleOrderItemComponentInput = {
            skuId,
            skuLabel: label,
            skuCode: skuId,
            skuImage: skuImage ?? null,
            quantity,
            basePrice,
            unitPrice,
            total: calcTotal(quantity, unitPrice),
            referencePackItemId: undefined,
          };

          const nextComponents = upsertComponent(
            item.components ?? [],
            nextComponent,
          );

          onChangeItem(
            recalcParentFromComponents(item, nextComponents),
            itemIndex,
          );
          setOpenAddSku(false);
        }}
      />
    </>
  );
}

function resolveReserveLabel(
  reserveBool: boolean | null | undefined,
  stockStatus: SaleOrderEditPolicy["stockStatus"],
) {
  if (stockStatus === "CONSUMED") return "OUT";
  if (reserveBool == null) return "—";
  return reserveBool ? "Sí" : "No";
}

function resolveComponentStockLabel({
  warehouseId,
  loadingStock,
  stockStatus,
  available,
}: {
  warehouseId?: string;
  loadingStock: boolean;
  stockStatus: SaleOrderEditPolicy["stockStatus"];
  available?: number | null;
}) {
  if (stockStatus === "CONSUMED") return "OUT";
  if (!warehouseId) return "—";
  if (loadingStock) return "...";
  return formatQuantity(available);
}

function getPackStockFlags(
  components: SaleOrderItemComponentInput[],
  warehouseId: string | undefined,
  reserveBool: boolean | null | undefined,
  stocksBySkuId: Record<string, skuStock | null>,
  loadingStock: boolean,
  stockStatus: SaleOrderEditPolicy["stockStatus"],
) {
  const reserved = resolveReserveLabel(reserveBool, stockStatus);

  if (stockStatus === "CONSUMED") {
    return { stock: "OUT", reserved };
  }

  if (!warehouseId || components.length === 0) {
    return { stock: "—", reserved };
  }
  if (loadingStock) {
    return { stock: "...", reserved };
  }

  const hasEnough = components.every((component) => {
    const stock = stocksBySkuId[getSkuId(component)];
    return Number(stock?.available ?? 0) >= Number(component.quantity ?? 0);
  });
  return {
    stock: hasEnough ? "Sí" : "No",
    reserved,
  };
}

function HeaderCell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={cn(
        "px-2.5 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground",
        className,
      )}
    >
      {children}
    </th>
  );
}

function SubHeaderCell({
  children,
  ariaLabel,
}: {
  children: React.ReactNode;
  ariaLabel?: string;
}) {
  return (
    <th
      aria-label={ariaLabel}
      className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
    >
      {children}
    </th>
  );
}

function EditableNumberCell({ children }: { children: React.ReactNode }) {
  return <td className="px-1.5 py-2 align-middle">{children}</td>;
}

function SaleOrderPackSelect({
  item,
  itemKind,
  itemKey,
  recentOptions,
  disabled,
  onChange,
}: {
  item: SaleOrderItemInput;
  itemKind: Exclude<SaleOrderItemKind, "PRODUCT">;
  itemKey: string;
  recentOptions: PackSelectOption[];
  disabled: boolean;
  onChange: (item: SaleOrderItemInput) => void;
}) {
  const [query, setQuery] = useState("");
  const [searchOptions, setSearchOptions] =
    useState<PackSelectOption[]>(recentOptions);
  const [pendingOption, setPendingOption] =
    useState<PackSelectOption | null>(null);
  const [selectionError, setSelectionError] = useState("");

  useEffect(() => {
    if (!query.trim()) setSearchOptions(recentOptions);
  }, [query, recentOptions]);

  useEffect(() => {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) return;

    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      const searchPacks = async () => {
        try {
          const response = await listPacks({
            q: normalizedQuery,
            page: 1,
            limit: 10,
            isActive: "true",
          });

          if (!cancelled) {
            setSearchOptions(
              (response.items ?? [])
                .map((entry) => ({
                  value:
                    typeof entry.pack.packId === "string"
                      ? entry.pack.packId
                      : entry.pack.packId?.value ?? "",
                  label: entry.pack.description,
                }))
                .filter((option) => option.value),
            );
          }
        } catch {
          if (!cancelled) setSearchOptions([]);
        }
      };

      void searchPacks();
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [query]);

  const currentOption = useMemo<PackSelectOption>(() => {
    if (itemKind === "UNKNOWN_PACK") {
      return { value: UNKNOWN_PACK_OPTION_VALUE, label: "Desconocido" };
    }

    return {
      value: item.referencePackId ?? HISTORICAL_PACK_OPTION_VALUE,
      label: item.packNameSnapshot?.trim() || item.description?.trim() || "Pack",
    };
  }, [item.description, item.packNameSnapshot, item.referencePackId, itemKind]);

  const options = useMemo(() => {
    const candidates = [
      ...(itemKind === "UNKNOWN_PACK"
        ? [{ value: UNKNOWN_PACK_OPTION_VALUE, label: "Desconocido" }]
        : []),
      pendingOption,
      currentOption,
      ...searchOptions,
    ].filter((option): option is PackSelectOption => Boolean(option?.value));

    return Array.from(
      new Map(candidates.map((option) => [option.value, option])).values(),
    );
  }, [currentOption, itemKind, pendingOption, searchOptions]);

  const handleChange = async (packId: string) => {
    if (
      packId === UNKNOWN_PACK_OPTION_VALUE ||
      packId === HISTORICAL_PACK_OPTION_VALUE ||
      packId === item.referencePackId
    ) {
      return;
    }

    const selectedOption = options.find((option) => option.value === packId);
    if (!selectedOption) return;

    setPendingOption(selectedOption);
    setSelectionError("");

    try {
      const detail = await getPackById(packId);
      const quantity = Number(item.quantity) > 0 ? Number(item.quantity) : 1;
      const description =
        String(detail.pack.description ?? "").trim() || selectedOption.label;
      const components: SaleOrderItemComponentInput[] = (detail.items ?? []).map(
        (row) => {
          const componentQuantity = roundMoney(
            (Number(row.quantity) || 0) * quantity,
          );
          const unitPrice = Number(row.price ?? row.sku?.price ?? 0);

          return {
            skuId: row.skuId,
            skuLabel: buildSkuLabelFromDetailItem(row),
            skuCode: row.sku
              ? `${row.sku.backendSku ?? ""}${row.sku.customSku ?? ""}${row.skuId}`
              : row.skuId,
            skuImage: row.sku?.image ?? null,
            quantity: componentQuantity,
            basePrice: unitPrice,
            unitPrice,
            total: calcTotal(componentQuantity, unitPrice),
            referencePackItemId: row.id,
          };
        },
      );
      const total = sumComponentsTotal(components);

      onChange({
        ...item,
        description,
        referencePackId: packId,
        packNameSnapshot: description,
        quantity,
        basePrice: Number(detail.pack.total ?? 0),
        unitPrice: calcUnitPrice(quantity, total),
        total,
        components,
      });
      setPendingOption(null);
    } catch {
      setPendingOption(null);
      setSelectionError("No se pudo cargar el pack. Intenta nuevamente.");
    }
  };

  return (
    <FloatingSelect
      label="Pack"
      name={`pack-select-${itemKey}`}
      value={pendingOption?.value ?? currentOption.value}
      options={options}
      onChange={(packId) => void handleChange(packId)}
      onSearchChange={setQuery}
      resetSearchOnClose
      searchable
      searchPlaceholder="Buscar pack..."
      emptyMessage="No se encontraron packs"
      disabled={disabled || Boolean(pendingOption)}
      error={selectionError || undefined}
      panelWidthMode="min-trigger"
      className="h-8 rounded-md px-2 py-1 text-xs font-semibold"
    />
  );
}

function CompactFloatingNumberInput({
  label,
  ariaLabel,
  name,
  value,
  step = "0.01",
  readOnly = false,
  onValueChange,
}: {
  label: string;
  ariaLabel: string;
  name: string;
  value?: number | null;
  step?: string;
  readOnly?: boolean;
  onValueChange?: (value: number) => void;
}) {
  return (
    <div className="w-24 min-w-24">
      <FloatingInput
        label={label}
        aria-label={ariaLabel}
        name={name}
        type="number"
        min={0}
        step={step}
        value={String(value ?? 0)}
        readOnly={readOnly}
        className="h-9 rounded-md px-2 py-1 text-xs"
        onClick={(event) => event.stopPropagation()}
        onChange={(event) =>
          onValueChange?.(roundMoney(parseDecimalInput(event.target.value)))
        }
      />
    </div>
  );
}

function StatusCell({
  children,
  testId,
}: {
  children: React.ReactNode;
  testId: string;
}) {
  return (
    <td data-testid={testId} className="px-3 py-2 align-middle font-medium">
      {children}
    </td>
  );
}

function SkuCell({
  component,
  badge,
  onOpenImage,
}: {
  component: SaleOrderItemComponentInput;
  badge?: "Producto";
  onOpenImage: () => void;
}) {
  const label = getSkuLabel(component);
  const image = resolveImageUrl(component.skuImage ?? component.sku?.image);

  return (
    <td className="min-w-64 px-3 py-2 align-middle">
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={`Ver imagen de ${label}`}
          title={`Ver imagen de ${label}`}
          onClick={onOpenImage}
          className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-muted outline-none transition hover:ring-2 hover:ring-primary/30 focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          {image ? (
            <img
              src={image}
              alt={label}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <Package className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        <div className="min-w-0">
          {badge ? (
            <span className="mb-1 inline-flex rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">
              {badge}
            </span>
          ) : null}
          <p className="truncate font-semibold">{label}</p>
        </div>
      </div>
    </td>
  );
}

function ActionButton({
  action,
  item,
  targetLabel,
  danger = false,
  disabled,
  onClick,
  children,
}: {
  action: string;
  item: SaleOrderItemInput;
  targetLabel?: string;
  danger?: boolean;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <SystemButton
      size="icon"
      variant={danger ? "danger" : "outline"}
      className="h-9 w-9"
      title={`${action} ${targetLabel ?? item.description}`}
      aria-label={`${action} ${targetLabel ?? item.description}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </SystemButton>
  );
}
