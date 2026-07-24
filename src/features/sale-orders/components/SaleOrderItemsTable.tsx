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
import { SystemButton } from "@/shared/components/components/SystemButton";
import { cn } from "@/shared/lib/utils";
import { deriveSkuPresentation } from "@/features/sale-orders/utils/skuPresentation";
import { parseDecimalInput } from "@/shared/utils/functionPurchases";
import { getSaleOrderStocksBySkuIds } from "@/shared/services/saleOrderStockService";
import { SaleOrderAddSkuModal } from "@/features/sale-orders/components/modal-create/SaleOrderAddSkuModal";

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
    maximumFractionDigits: 3,
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
        <table className="w-full table-fixed text-xs">
          <colgroup>
            <col className="w-12" />
            <col className="w-[120px]" />
            <col className="w-[80px]" />
            <col className="w-[82px]" />
            <col className="w-[80px]" />
            <col className="w-[80px]" />
            <col className="w-[50px]" />
            <col className="w-[84px]" />
            <col className="w-16" />
          </colgroup>
          <thead className="sticky top-0 z-10 bg-background">
            <tr className="border-b border-border/70 bg-muted/40">
              <th
                aria-label="Expandir componentes"
                className="w-12 px-2 py-2"
              />
              <HeaderCell>Pack</HeaderCell>
              <HeaderCell>Cantidad</HeaderCell>
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
                  No hay packs disponibles.
                </td>
              </tr>
            ) : (
              items.map((item, index) => {
                const itemKey = getItemKey(item, index);
                const expanded = !collapsedItems.includes(itemKey);
                const components = item.components ?? [];
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

function PackRows({
  item,
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
  onToggle,
  onChangeItem,
  onDelete,
  onOpenDetail,
}: {
  item: SaleOrderItemInput;
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
  onToggle: () => void;
  onChangeItem: Props["onChangeItem"];
  onDelete: Props["onDelete"];
  onOpenDetail: Props["onOpenDetail"];
}) {
  const action = expanded ? "Contraer" : "Desplegar";

  return (
    <>
      <tr className="border-b border-border/60 transition-colors hover:bg-muted/20">
        <td className="w-12 px-2 py-2 align-middle">
          <button
            type="button"
            aria-expanded={expanded}
            aria-label={`${action} componentes de ${item.description}`}
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
        <td className="w-[220px] max-w-[220px] px-2 py-2 align-middle text-[10px]">
          <span className="sr-only">{item.description}</span>
          <FloatingInput
            label="Pack"
            aria-label={`Descripcion del pack ${item.description}`}
            name={`pack-description-${itemKey}`}
            value={item.description ?? ""}
            className="h-8 rounded-md px-2 py-1 text-xs font-semibold"
            onClick={(event) => event.stopPropagation()}
            onChange={(event) =>
              onChangeItem({ ...item, description: event.target.value }, index)
            }
          />
          <span className="text-[10px] text-muted-foreground">
            {(item.components ?? []).length} componente(s)
          </span>
        </td>
        <EditableNumberCell>
          <CompactFloatingNumberInput
            label="Cantidad"
            ariaLabel={`Cantidad del pack ${item.description}`}
            name={`pack-quantity-${itemKey}`}
            value={item.quantity}
            step="0.001"
            readOnly={!productsEditable}
            onValueChange={(quantity) =>
              onChangeItem(updatePackQuantity(item, quantity), index)
            }
          />
        </EditableNumberCell>
        <EditableNumberCell>
          <CompactFloatingNumberInput
            label="Precio base"
            ariaLabel={`Precio base del pack ${item.description}`}
            name={`pack-base-price-${itemKey}`}
            value={item.basePrice ?? item.unitPrice}
            readOnly
          />
        </EditableNumberCell>
        <EditableNumberCell>
          <CompactFloatingNumberInput
            label="Precio unit."
            ariaLabel={`Precio unitario del pack ${item.description}`}
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
            ariaLabel={`Total del pack ${item.description}`}
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

  return (
    <>
      <div className="w-fit max-w-full overflow-hidden rounded-sm border border-border/60 bg-background">
        <table className="w-full text-xs">
        <colgroup>
          <col className="w-[276px]" />
          <col className="w-[108px]" />
          <col className="w-[108px]" />
          <col className="w-[108px]" />
          <col className="w-[108px]" />
          <col className="w-[72px]" />
        </colgroup>
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
                  aria-label={`Adicionar producto a ${item.description}`}
                  title={`Adicionar producto a ${item.description}`}
                  disabled={!productsEditable}
                  onClick={() => setOpenAddSku(true)}
                >
                  Adicionar
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
                Este pack no tiene componentes SKU.
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
                      step="0.001"
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
  return <td className="w-28 px-1.5 py-2 align-middle">{children}</td>;
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
          onValueChange?.(parseDecimalInput(event.target.value))
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
  onOpenImage,
}: {
  component: SaleOrderItemComponentInput;
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
          <p className="truncate font-semibold">{label}</p>
        </div>
      </div>
    </td>
  );
}

function ActionButton({
  action,
  item,
  danger = false,
  disabled,
  onClick,
  children,
}: {
  action: string;
  item: SaleOrderItemInput;
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
      title={`${action} ${item.description}`}
      aria-label={`${action} ${item.description}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </SystemButton>
  );
}
