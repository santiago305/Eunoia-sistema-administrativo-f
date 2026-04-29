import { useCallback, useMemo, useState } from "react";
import { Plus, Scale, Trash2 } from "lucide-react";
import { createProductEquivalence, deleteProductEquivalence } from "@/shared/services/equivalenceService";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { SectionHeaderForm } from "@/shared/components/components/SectionHederForm";
import { DataTable } from "@/shared/components/table/DataTable";
import type { DataTableColumn } from "@/shared/components/table/types";
import type { CreateProductEquivalenceDto, ProductEquivalence } from "@/features/catalog/types/equivalence";
import type { ListUnitResponse } from "@/features/catalog/types/unit";

type EquivalenceRow = {
  id: string;
  unitName: string;
  description: string;
};

type EquivalenceLike = Pick<
  ProductEquivalence,
  "id" | "fromUnitId" | "toUnitId" | "factor" | "fromUnit" | "toUnit"
>;

export function EquivalenceFormFields({
  productId,
  baseUnitId,
  units,
  equivalences,
  loading,
  onCreated,
  onCreateEquivalence,
  onDeleteEquivalence,
  tableId,
  PRIMARY,
}: {
  productId?: string;
  baseUnitId: string;
  units?: ListUnitResponse;
  equivalences: EquivalenceLike[];
  loading?: boolean;
  onCreated?: () => Promise<void>;
  onCreateEquivalence?: (payload: CreateProductEquivalenceDto) => Promise<void> | void;
  onDeleteEquivalence?: (id: string) => Promise<void> | void;
  tableId?: string;
  PRIMARY: string;
}) {
  const [fromUnitId, setFromUnitId] = useState("");
  const [factor, setFactor] = useState("1");

  const unitOptions = useMemo(
    () =>
      (units ?? []).map((u) => ({
        value: u.id,
        label: `${u.name} (${u.code})`,
      })),
    [units],
  );

  const baseUnitLabel = useMemo(
    () =>
      (units ?? []).find((u) => u.id === baseUnitId)?.name ??
      (baseUnitId ? baseUnitId : "Sin unidad base"),
    [units, baseUnitId],
  );

  const handleCreate = useCallback(async () => {
    if (!baseUnitId || !fromUnitId || !factor) return;

    const payload = {
      fromUnitId,
      toUnitId: baseUnitId,
      factor: Number(factor),
    };

    if (onCreateEquivalence) {
      await onCreateEquivalence(payload);
    } else if (productId) {
      await createProductEquivalence(productId, payload);
      await onCreated?.();
    }

    setFromUnitId("");
    setFactor("1");
  }, [baseUnitId, factor, fromUnitId, onCreateEquivalence, onCreated, productId]);

  const deleteEquivalence = useCallback(
    async (id: string) => {
      try {
        if (onDeleteEquivalence) {
          await onDeleteEquivalence(id);
        } else {
          await deleteProductEquivalence(id);
          await onCreated?.();
        }
      } catch {
        return;
      }
    },
    [onDeleteEquivalence, onCreated],
  );

  const rows = useMemo<EquivalenceRow[]>(
    () =>
      equivalences.map((eq) => {
        const fromUnit = eq.fromUnit ?? (units ?? []).find((u) => u.id === eq.fromUnitId);
        const toUnit = eq.toUnit ?? (units ?? []).find((u) => u.id === eq.toUnitId);
        const fromLabel = fromUnit ? `${fromUnit.name} (${fromUnit.code})` : eq.fromUnitId;
        const toLabel = toUnit ? `${toUnit.name} (${toUnit.code})` : eq.toUnitId;

        return {
          id: eq.id,
          unitName: `${fromLabel} (${eq.factor})`,
          description: `Equivale a ${eq.factor} - ${toLabel}`,
        };
      }),
    [equivalences, units],
  );

  const columns = useMemo<DataTableColumn<EquivalenceRow>[]>(
    () => [
      {
        id: "unitName",
        header: "Unidad de medida",
        accessorKey: "unitName",
        hideable: false,
        sortable: false,
      },
      {
        id: "description",
        header: "Equivalencia",
        accessorKey: "description",
        hideable: false,
        sortable: false,
      },
      {
        id: "actions",
        header: "Acciones",
        cell: (row) => (
          <div className="flex justify-end">
            <SystemButton
              variant="danger"
              size="custom"
              className="h-8 w-9 rounded-lg"
              onClick={() => {
                void deleteEquivalence(row.id);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </SystemButton>
          </div>
        ),
        className: "text-right",
        headerClassName: "text-right",
        hideable: false,
        sortable: false,
      },
    ],
    [deleteEquivalence],
  );

  const canPersist = Boolean(onCreateEquivalence || productId);
  const canCreate = Boolean(baseUnitId && fromUnitId && factor && canPersist);
  const resolvedTableId = tableId ?? (productId ? `product-equivalences-${productId}` : "product-equivalences-draft");

  return (
    <div className="space-y-4">
      <SectionHeaderForm icon={Scale} title="Nueva equivalencia" />

      <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_1fr_100px] ">
        <FloatingInput label="Unidad origen" value={baseUnitLabel} name="origin" disabled />

        <FloatingInput
          label="Factor"
          type="number"
          name="factor"
          value={factor}
          min={1}
          onChange={(e) => setFactor(e.target.value)}
        />

        <FloatingSelect
          label="Unidad de destino"
          name="destino"
          value={fromUnitId}
          onChange={(value) => setFromUnitId(value)}
          options={unitOptions}
          searchable
          searchPlaceholder="Buscar unidad..."
          emptyMessage="Sin unidades de medida"
        />

        <SystemButton
          leftIcon={<Plus className="h-4 w-4" />}
          className="h-10"
          style={{
            backgroundColor: PRIMARY,
            borderColor: `color-mix(in srgb, ${PRIMARY} 20%, transparent)`,
          }}
          onClick={() => void handleCreate()}
          disabled={!canCreate}
        >
          Agregar
        </SystemButton>
      </div>

      <div className="mt-3 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
        <DataTable
          tableId={resolvedTableId}
          data={rows}
          columns={columns}
          rowKey="id"
          loading={loading}
          emptyMessage="No hay equivalencias registradas."
          hoverable={false}
          animated={false}
          maxHeight="300px"
        />
      </div>
    </div>
  );
}
