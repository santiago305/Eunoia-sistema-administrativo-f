import { AlertCircle, RotateCcw, Trash2 } from "lucide-react";
import { useMemo } from "react";
import {
  isValidRecipeQuantity,
  normalizeRecipeQuantityInput,
} from "@/features/catalog/components/recipeFormFields.helpers";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { DataTable } from "@/shared/components/table/DataTable";
import type { DataTableColumn } from "@/shared/components/table/types";
import type { SaleOrderEditorSupply } from "./saleOrderEditorForm";
import { addOrIncreaseSaleOrderSupply } from "./saleOrderSupplies.helpers";
import { SaleOrderSupplySelect } from "./SaleOrderSupplySelect";

type SupplyRow = SaleOrderEditorSupply & Record<string, unknown>;

type Props = {
  supplies: SaleOrderEditorSupply[];
  onChange: (supplies: SaleOrderEditorSupply[]) => void;
  disabled?: boolean;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
};

export function SaleOrderSuppliesSection({
  supplies,
  onChange,
  disabled = false,
  loading = false,
  error,
  onRetry,
}: Props) {
  const columns = useMemo<DataTableColumn<SupplyRow>[]>(
    () => [
      {
        id: "supply",
        header: "Insumo",
        accessorKey: "supplyName",
        hideable: false,
        cell: (row) => (
          <div className="min-w-[180px]">
            <p className="font-medium">{row.supplyName || row.skuName}</p>
            {row.skuName && row.skuName !== row.supplyName ? (
              <p className="text-xs text-muted-foreground">{row.skuName}</p>
            ) : null}
          </div>
        ),
      },
      {
        id: "sku",
        header: "SKU",
        accessorKey: "backendSku",
        cell: (row) => row.customSku || row.backendSku || "—",
      },
      {
        id: "unit",
        header: "Unidad",
        accessorKey: "unitName",
        cell: (row) =>
          [row.unitName, row.unitCode].filter(Boolean).join(" · ") || "—",
      },
      {
        id: "quantity",
        header: "Cantidad",
        accessorKey: "quantity",
        stopRowClick: true,
        cell: (row) => (
          <div className="w-28">
            <FloatingInput
              label="Cantidad"
              name={`supply-quantity-${row.supplySkuId}`}
              type="text"
              inputMode="decimal"
              value={row.quantity}
              disabled={disabled || loading}
              aria-invalid={!isValidRecipeQuantity(row.quantity)}
              onChange={(event) => {
                const quantity = normalizeRecipeQuantityInput(event.target.value);
                if (quantity === null) return;
                onChange(
                  supplies.map((item) =>
                    item.supplySkuId === row.supplySkuId
                      ? { ...item, quantity }
                      : item,
                  ),
                );
              }}
              className="h-10"
            />
          </div>
        ),
      },
      {
        id: "actions",
        header: "Acciones",
        pinned: "right",
        stopRowClick: true,
        cell: (row) => (
          <SystemButton
            type="button"
            size="icon"
            variant="outline"
            className="h-11 w-11 text-destructive"
            aria-label={`Eliminar ${row.supplyName || row.skuName || "insumo"}`}
            title="Eliminar insumo"
            disabled={disabled || loading}
            onClick={() =>
              onChange(
                supplies.filter(
                  (item) => item.supplySkuId !== row.supplySkuId,
                ),
              )
            }
          >
            <Trash2 className="h-4 w-4" />
          </SystemButton>
        ),
      },
    ],
    [disabled, loading, onChange, supplies],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          La lista pertenece solo a este pedido. Agregar el mismo insumo aumenta su cantidad.
        </p>
        <SaleOrderSupplySelect
          disabled={disabled || loading || Boolean(error)}
          onAdd={(supply) =>
            onChange(addOrIncreaseSaleOrderSupply(supplies, supply))
          }
        />
      </div>

      {error ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm"
        >
          <span className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            {error}
          </span>
          <SystemButton
            type="button"
            size="sm"
            variant="outline"
            leftIcon={<RotateCcw className="h-4 w-4" />}
            onClick={onRetry}
          >
            Reintentar
          </SystemButton>
        </div>
      ) : null}

      <DataTable<SupplyRow>
        tableId="sale-order-supplies"
        data={supplies as SupplyRow[]}
        columns={columns}
        rowKey="supplySkuId"
        loading={loading}
        emptyMessage={
          loading
            ? "Cargando receta de insumos..."
            : "Este pedido no tiene insumos agregados."
        }
        showSelectionInfo={false}
        rowClickable={false}
        responsiveCards
        maxHeight="360px"
      />
    </div>
  );
}
