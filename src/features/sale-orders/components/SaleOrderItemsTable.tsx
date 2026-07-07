import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Package, Trash2 } from "lucide-react";
import { env } from "@/env";
import type {
  SaleOrderItemComponentInput,
  SaleOrderItemInput,
} from "@/features/sale-orders/types/saleOrder";
import type { skuStock } from "@/features/catalog/types/documentInventory";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { getStockSku } from "@/shared/services/documentService";
import { cn } from "@/shared/lib/utils";
import { deriveSkuPresentation } from "@/features/sale-orders/utils/skuPresentation";

type Props = {
  items: SaleOrderItemInput[];
  warehouseId?: string;
  productsEditable: boolean;
  onEdit: (item: SaleOrderItemInput, index: number) => void;
  onDelete: (item: SaleOrderItemInput, index: number) => void;
  onOpenDetail: (
    item: SaleOrderItemInput,
    index: number,
    component: SaleOrderItemComponentInput,
  ) => void;
};

const formatMoney = (value?: number | null) =>
  Number(value ?? 0).toLocaleString("es-PE", {
    style: "currency",
    currency: "PEN",
  });

const formatQuantity = (value?: number | null) =>
  Number(value ?? 0).toLocaleString("es-PE", {
    maximumFractionDigits: 3,
  });

const getItemKey = (item: SaleOrderItemInput, index: number) =>
  item.id ?? `${item.referencePackId ?? "item"}-${index}`;

const getSkuId = (component: SaleOrderItemComponentInput) =>
  component.skuId ?? component.sku?.id ?? "";

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
  productsEditable,
  onEdit,
  onDelete,
  onOpenDetail,
}: Props) {
  const [collapsedItems, setCollapsedItems] = useState<string[]>([]);
  const [stocksBySkuId, setStocksBySkuId] = useState<
    Record<string, skuStock | null>
  >({});
  const [loadingStock, setLoadingStock] = useState(false);

  const uniqueSkuIds = useMemo(
    () =>
      Array.from(
        new Set(
          items.flatMap((item) =>
            (item.components ?? []).map(getSkuId).filter(Boolean),
          ),
        ),
      ),
    [items],
  );

  useEffect(() => {
    if (!warehouseId || uniqueSkuIds.length === 0) {
      setStocksBySkuId({});
      setLoadingStock(false);
      return;
    }

    let cancelled = false;

    const loadStocks = async () => {
      setLoadingStock(true);

      const pairs = await Promise.all(
        uniqueSkuIds.map(async (skuId) => {
          try {
            const stock = await getStockSku({ warehouseId, skuId });
            return [skuId, stock] as const;
          } catch {
            return [skuId, null] as const;
          }
        }),
      );

      if (!cancelled) {
        setStocksBySkuId(Object.fromEntries(pairs));
        setLoadingStock(false);
      }
    };

    void loadStocks();

    return () => {
      cancelled = true;
    };
  }, [uniqueSkuIds, warehouseId]);

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
              aria-label="Expandir componentes"
              className="w-12 px-2 py-2"
            />
            <HeaderCell>Pack</HeaderCell>
            <HeaderCell>Cantidad</HeaderCell>
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
                colSpan={8}
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
                stocksBySkuId,
                loadingStock,
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
                  productsEditable={productsEditable}
                  onToggle={() => toggleItem(itemKey)}
                  onEdit={onEdit}
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
  productsEditable,
  onToggle,
  onEdit,
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
  productsEditable: boolean;
  onToggle: () => void;
  onEdit: Props["onEdit"];
  onDelete: Props["onDelete"];
  onOpenDetail: Props["onOpenDetail"];
}) {
  const action = expanded ? "Contraer" : "Desplegar";

  return (
    <>
      <tr
        className={cn(
          "border-b border-border/60 transition-colors",
          productsEditable && "cursor-pointer hover:bg-muted/30",
        )}
        onClick={
          productsEditable ? () => onEdit(item, index) : undefined
        }
      >
        <td className="w-12 px-2 py-2 align-middle">
          <button
            type="button"
            aria-expanded={expanded}
            aria-label={`${action} componentes de ${item.description}`}
            onClick={(event) => {
              event.stopPropagation();
              onToggle();
            }}
            className="inline-flex h-10 w-10 items-center justify-center rounded-sm transition-colors hover:bg-muted/50"
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 transition-transform",
                expanded && "rotate-180",
              )}
            />
          </button>
        </td>
        <td className="min-w-20 px-1 py-2 align-middle text-[10px]">
          <span className="block truncate font-semibold">
            {item.description}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {(item.components ?? []).length} componente(s)
          </span>
        </td>
        <NumberCell >{formatQuantity(item.quantity)}</NumberCell>
        <NumberCell >{formatMoney(item.unitPrice)}</NumberCell>
        <NumberCell >{formatMoney(item.total)}</NumberCell>
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
          <td colSpan={8} className="p-0 sm:px-4 sm:py-1">
            <ComponentsSubtable
              item={item}
              warehouseId={warehouseId}
              stocksBySkuId={stocksBySkuId}
              loadingStock={loadingStock}
              onOpenDetail={(component) => onOpenDetail(item, index, component)}
            />
          </td>
        </tr>
      ) : null}
    </>
  );
}

function ComponentsSubtable({
  item,
  warehouseId,
  stocksBySkuId,
  loadingStock,
  onOpenDetail,
}: {
  item: SaleOrderItemInput;
  warehouseId?: string;
  stocksBySkuId: Record<string, skuStock | null>;
  loadingStock: boolean;
  onOpenDetail: (component: SaleOrderItemComponentInput) => void;
}) {
  const components = item.components ?? [];

  return (
    <div className="overflow-hidden rounded-sm border border-border/60 bg-background">
      <table className="w-full min-w-[700px] text-xs">
        <thead>
          <tr className="border-b border-border/60 bg-muted/30">
            <SubHeaderCell>Producto</SubHeaderCell>
            <SubHeaderCell>Cantidad</SubHeaderCell>
            <SubHeaderCell>Precio u.</SubHeaderCell>
            <SubHeaderCell>Total</SubHeaderCell>
            <SubHeaderCell>Stock</SubHeaderCell>
          </tr>
        </thead>
        <tbody>
          {components.length === 0 ? (
            <tr>
              <td
                colSpan={5}
                className="px-3 py-5 text-center text-muted-foreground"
              >
                Este pack no tiene componentes SKU.
              </td>
            </tr>
          ) : (
            components.map((component, componentIndex) => {
              const skuId = getSkuId(component);
              const stock = skuId ? stocksBySkuId[skuId] : null;
              const stockLabel = !warehouseId
                ? "—"
                : loadingStock
                  ? "..."
                  : formatQuantity(stock?.available);

              return (
                <tr
                  key={`${skuId || "sku"}-${componentIndex}`}
                  className="cursor-pointer border-b border-border/50 transition-colors last:border-b-0 hover:bg-muted/30"
                  onClick={() => onOpenDetail(component)}
                >
                  <SkuCell component={component} />
                  <NumberCell>{formatQuantity(component.quantity)}</NumberCell>
                  <NumberCell>{formatMoney(component.unitPrice)}</NumberCell>
                  <NumberCell>{formatMoney(component.total)}</NumberCell>
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
  );
}

function getPackStockFlags(
  components: SaleOrderItemComponentInput[],
  warehouseId: string | undefined,
  stocksBySkuId: Record<string, skuStock | null>,
  loadingStock: boolean,
) {
  if (!warehouseId || components.length === 0) {
    return { stock: "—", reserved: "—" };
  }
  if (loadingStock) {
    return { stock: "...", reserved: "..." };
  }

  const hasEnough = components.every((component) => {
    const stock = stocksBySkuId[getSkuId(component)];
    return Number(stock?.available ?? 0) >= Number(component.quantity ?? 0);
  });
  const isReserved = components.every((component) => {
    const stock = stocksBySkuId[getSkuId(component)];
    return Number(stock?.reserved ?? 0) >= Number(component.quantity ?? 0);
  });

  return {
    stock: hasEnough ? "Sí" : "No",
    reserved: isReserved ? "Sí" : "No",
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

function SubHeaderCell({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
      {children}
    </th>
  );
}

function NumberCell({ children }: { children: React.ReactNode }) {
  return (
    <td className="px-3 py-2 align-middle tabular-nums text-[10px]">{children}</td>
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
}: {
  component: SaleOrderItemComponentInput;
}) {
  const label = getSkuLabel(component);
  const image = resolveImageUrl(component.skuImage ?? component.sku?.image);

  return (
    <td className="min-w-64 px-3 py-2 align-middle">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-muted">
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
        </div>
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
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      {children}
    </SystemButton>
  );
}
