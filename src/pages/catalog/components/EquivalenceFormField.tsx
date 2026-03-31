import { useMemo, useState } from "react";
import { Plus, Scale, Power } from "lucide-react";
import { createProductEquivalence, deleteProductEquivalence } from "@/services/equivalenceService";
import { FloatingInput } from "@/components/FloatingInput";
import { FloatingSelect } from "@/components/FloatingSelect";
import { SystemButton } from "@/components/SystemButton";
import { SectionHeaderForm } from "@/components/SectionHederForm";
import { DataTable } from "@/components/table/DataTable";
import type { DataTableColumn } from "@/components/table/types";
import { ProductEquivalence } from "@/pages/catalog/types/equivalence";
import { ListUnitResponse } from "@/pages/catalog/types/unit";

type EquivalenceRow = {
  id: string;
  unitName: string;
  description: string;
};

export function EquivalenceFormFields({
  productId,
  baseUnitId,
  units,
  equivalences,
  loading,
  onCreated,
  PRIMARY,
}: {
  productId: string;
  baseUnitId: string;
  units?: ListUnitResponse;
  equivalences: ProductEquivalence[];
  loading: boolean;
  onCreated: () => Promise<void>;
  PRIMARY: string;
}) {
  const [fromUnitId, setFromUnitId] = useState("");
  const [factor, setFactor] = useState("1");

  const unitOptions = (units ?? []).map((u) => ({
    value: u.id,
    label: `${u.name} (${u.code})`,
  }));

  const baseUnitLabel =
    (units ?? []).find((u) => u.id === baseUnitId)?.name ??
    (baseUnitId ? baseUnitId : "Sin unidad base");

  const handleCreate = async () => {
    if (!productId || !baseUnitId || !fromUnitId || !factor) return;

    await createProductEquivalence({
      productId,
      fromUnitId,
      toUnitId: baseUnitId,
      factor: Number(factor),
    });

    setFromUnitId("");
    setFactor("1");
    await onCreated();
  };

  const deleteEquivalence = async (id: string) => {
    try {
      await deleteProductEquivalence(id);
      await onCreated();
    } catch {
      console.log("algo salio mal");
    }
  };

  const rows = useMemo<EquivalenceRow[]>(
    () =>
      equivalences.map((eq) => {
        const fromLabel = (units ?? []).find((u) => u.id === eq.fromUnitId);
        const toLabel = (units ?? []).find((u) => u.id === eq.toUnitId);

        return {
          id: eq.id,
          unitName: fromLabel ? `${fromLabel.name} (${eq.factor})` : eq.fromUnitId,
          description: `Equivale a ${eq.factor} - ${toLabel?.name ?? eq.toUnitId}`,
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
              <Power className="h-4 w-4" />
            </SystemButton>
          </div>
        ),
        className: "text-right",
        headerClassName: "text-right",
        hideable: false,
        sortable: false,
      },
    ],
    [rows],
  );

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-black/10 bg-white p-4 sm:p-5 ">
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
            placeholder="Seleccionar unidad"
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
            disabled={!productId || !baseUnitId || !fromUnitId || !factor}
          >
            Agregar
          </SystemButton>
        </div>
        <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm
        mt-3">
          <DataTable
            tableId={`product-equivalences-${productId}`}
            data={rows}
            columns={columns}
            rowKey="id"
            loading={loading}
            emptyMessage="No hay equivalencias registradas."
            hoverable={false}
            animated={false}
          />
        </div>
      </div>
    </div>
  );
}