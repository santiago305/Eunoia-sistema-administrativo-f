import type {
  ActionCatalogItem,
  AssignWarehouseByProvinceConfig,
  WorkflowAction,
  WorkflowActionType,
} from "@/features/workflows/types/workflow";
import { ACTIONS } from "@/features/workflows/types/workflow";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { FloatingMultiSelect } from "@/shared/components/components/FloatingMultiSelect";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { listAllUbigeoProvinces } from "@/shared/services/ubigeoService";
import { listAllActiveWarehouses } from "@/shared/services/warehouseServices";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

type Props = {
  catalog: ActionCatalogItem[];
  value: WorkflowAction[];
  onChange: (actions: WorkflowAction[]) => void;
};

export const ACTION_LABELS: Record<WorkflowActionType, string> = {
  RESERVE_STOCK: "Reservar stock",
  CONSUME_STOCK: "Consumir stock",
  REVERT_STOCK: "Liberar reserva",
  MARK_INVOICE_SENT: "Marcar factura enviada",
  ASSIGN_WAREHOUSE_BY_PROVINCE: "Asignar almacén por provincia",
};

export function WorkflowActionEditor({ catalog, value, onChange }: Props) {
  const [provinceOptions, setProvinceOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [warehouseOptions, setWarehouseOptions] = useState<Array<{ value: string; label: string }>>([]);

  useEffect(() => {
    let active = true;
    void Promise.allSettled([listAllUbigeoProvinces(), listAllActiveWarehouses()])
      .then(([provincesResult, warehousesResult]) => {
        if (!active) return;
        const provinces = provincesResult.status === "fulfilled" ? provincesResult.value : [];
        const warehouses = warehousesResult.status === "fulfilled" ? warehousesResult.value : [];

        setProvinceOptions(
          provinces
            .map((province) => ({ value: province.id, label: province.name }))
            .sort((left, right) => left.label.localeCompare(right.label, "es")),
        );
        setWarehouseOptions(
          warehouses
            .map((warehouse) => ({ value: warehouse.warehouseId, label: warehouse.name }))
            .sort((left, right) => left.label.localeCompare(right.label, "es")),
        );
      });
    return () => {
      active = false;
    };
  }, []);

  const options = catalog.map((item) => ({
    value: item.type,
    label: ACTION_LABELS[item.type] ?? item.type,
  }));

  const move = (index: number, offset: number) => {
    const target = index + offset;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next.map((action, position) => ({ ...action, position })));
  };

  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-black/65">Acciones</div>
      {value.map((action, index) => (
        <div key={`${action.type}-${index}`} className="rounded-lg border border-black/10 p-2">
          <FloatingSelect
            label="Accion"
            name={`action-${index}`}
            value={action.type}
            options={options}
            onChange={(selected) => {
              const next = [...value];
              next[index] = {
                type: selected as WorkflowActionType,
                config:
                  selected === ACTIONS.ASSIGN_WAREHOUSE_BY_PROVINCE
                    ? { mode: "INCLUDE", provinceIds: [], warehouseId: "" }
                    : {},
                position: index,
              };
              onChange(next);
            }}
          />
          {action.type === ACTIONS.ASSIGN_WAREHOUSE_BY_PROVINCE ? (() => {
            const config = action.config as AssignWarehouseByProvinceConfig;
            const selectedProvinceIds = config.provinceIds ?? [];
            const selectedProvinceSet = new Set(selectedProvinceIds);
            const provinceIdsUsedBySiblingActions = new Set(
              value.flatMap((item, itemIndex) => {
                if (
                  itemIndex === index ||
                  item.type !== ACTIONS.ASSIGN_WAREHOUSE_BY_PROVINCE
                ) {
                  return [];
                }

                const siblingConfig = item.config as Partial<AssignWarehouseByProvinceConfig>;
                return siblingConfig.provinceIds ?? [];
              }),
            );
            const availableProvinceOptions = provinceOptions.filter(
              (province) =>
                selectedProvinceSet.has(province.value) ||
                !provinceIdsUsedBySiblingActions.has(province.value),
            );
            const provinceLabelById = new Map(
              provinceOptions.map((province) => [province.value, province.label]),
            );
            const updateConfig = (patch: Partial<AssignWarehouseByProvinceConfig>) => {
              const next = [...value];
              next[index] = {
                ...action,
                config: {
                  mode: config.mode ?? "INCLUDE",
                  provinceIds: config.provinceIds ?? [],
                  warehouseId: config.warehouseId ?? "",
                  ...patch,
                },
              };
              onChange(next);
            };

            return (
              <div className="mt-2 grid gap-2">
                <FloatingSelect
                  label="Modo"
                  name={`action-mode-${index}`}
                  value={config.mode ?? "INCLUDE"}
                  options={[
                    { value: "INCLUDE", label: "Incluir" },
                    { value: "EXCLUDE", label: "Excluir" },
                  ]}
                  onChange={(mode) => updateConfig({ mode: mode as AssignWarehouseByProvinceConfig["mode"] })}
                />
                <FloatingMultiSelect
                  label="Provincias"
                  name={`action-provinces-${index}`}
                  value={config.provinceIds ?? []}
                  options={availableProvinceOptions}
                  searchable
                  searchPlaceholder="Buscar provincia..."
                  onChange={(provinceIds) => updateConfig({ provinceIds })}
                />
                {selectedProvinceIds.length ? (
                  <div className="flex flex-wrap gap-1.5" aria-label="Provincias seleccionadas">
                    {selectedProvinceIds.map((provinceId) => {
                      const provinceLabel = provinceLabelById.get(provinceId) ?? provinceId;

                      return (
                        <span
                          key={provinceId}
                          className="inline-flex max-w-full items-center gap-1 rounded-md border border-black/10 bg-black/[0.03] py-1 pl-2 pr-1 text-[11px] leading-tight text-black/75"
                          title={provinceLabel}
                        >
                          <span className="truncate">{provinceLabel}</span>
                          <button
                            type="button"
                            aria-label={`Quitar ${provinceLabel}`}
                            className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded text-black/55 transition hover:bg-black/10 hover:text-black"
                            onClick={() =>
                              updateConfig({
                                provinceIds: selectedProvinceIds.filter((id) => id !== provinceId),
                              })
                            }
                          >
                            <X className="h-3 w-3" aria-hidden="true" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                ) : null}
                <FloatingSelect
                  label="Almacén"
                  name={`action-warehouse-${index}`}
                  value={config.warehouseId ?? ""}
                  options={warehouseOptions}
                  onChange={(warehouseId) => updateConfig({ warehouseId })}
                />
              </div>
            );
          })() : null}
          <div className="mt-2 flex gap-2">
            <SystemButton type="button" size="sm" variant="outline" disabled={index === 0} onClick={() => move(index, -1)}>
              Subir
            </SystemButton>
            <SystemButton type="button" size="sm" variant="outline" disabled={index === value.length - 1} onClick={() => move(index, 1)}>
              Bajar
            </SystemButton>
            <SystemButton
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onChange(value.filter((_, itemIndex) => itemIndex !== index))}
            >
              Quitar
            </SystemButton>
          </div>
        </div>
      ))}
      <SystemButton
        type="button"
        size="sm"
        variant="outline"
        disabled={!catalog.length}
        onClick={() => {
          const first = catalog[0];
          if (!first) return;
          onChange([...value, { type: first.type, config: {}, position: value.length }]);
        }}
      >
        Agregar accion
      </SystemButton>
    </div>
  );
}
