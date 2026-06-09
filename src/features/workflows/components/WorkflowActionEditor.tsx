import type {
  ActionCatalogItem,
  WorkflowAction,
  WorkflowActionType,
} from "@/features/workflows/types/workflow";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { SystemButton } from "@/shared/components/components/SystemButton";

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
};

export function WorkflowActionEditor({ catalog, value, onChange }: Props) {
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
                config: {},
                position: index,
              };
              onChange(next);
            }}
          />
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
