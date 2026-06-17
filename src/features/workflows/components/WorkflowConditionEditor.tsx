import type {
  ConditionCatalogItem,
  WorkflowCondition,
} from "@/features/workflows/types/workflow";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { FloatingDatePicker } from "@/shared/components/components/date-picker/FloatingDatePicker";
import { FloatingInput } from "@/shared/components/components/FloatingInput";

type Props = {
  catalog: ConditionCatalogItem[];
  value: WorkflowCondition[];
  onChange: (conditions: WorkflowCondition[]) => void;
};

export enum ConditionType {
  IS_PAID = "IS_PAID",
  HAS_STOCK = "HAS_STOCK",
  NOT_CANCELLED = "NOT_CANCELLED",
  DATE_AFTER = "DATE_AFTER",
  DATE_BEFORE = "DATE_BEFORE",
  SCHEDULE_DELIVERY_WINDOW = "SCHEDULE_DELIVERY_WINDOW",
  SALE_ORDER_FIELD_REQUIRED = "SALE_ORDER_FIELD_REQUIRED",
}

export const CONDITION_LABELS: Record<string, string> = {
  IS_PAID: "Pedido pagado",
  HAS_STOCK: "Tiene stock",
  NOT_CANCELLED: "No cancelado",
  DATE_AFTER: "Fecha después de",
  DATE_BEFORE: "Fecha antes de",
  SCHEDULE_DELIVERY_WINDOW: "Validar fecha de entrega",
  SALE_ORDER_FIELD_REQUIRED: "Campo obligatorio del pedido",
  INVOICE_SENT: "Comprobante enviado",
};

type SelectSchemaOption = {
  label: string;
  value: string;
};

function getSelectSchemaOptions(schema: unknown): SelectSchemaOption[] {
  if (!schema || typeof schema !== "object" || !("options" in schema)) {
    return [];
  }

  const options = (schema as { options?: unknown }).options;
  if (!Array.isArray(options)) return [];

  return options.filter((option): option is SelectSchemaOption => {
    if (!option || typeof option !== "object") return false;
    const candidate = option as Partial<SelectSchemaOption>;
    return typeof candidate.label === "string" && typeof candidate.value === "string";
  });
}

function getConditionFieldOptions(definition?: ConditionCatalogItem) {
  const fieldSchema =
    definition?.configSchema &&
    typeof definition.configSchema === "object" &&
    "field" in definition.configSchema
      ? definition.configSchema.field
      : undefined;

  return getSelectSchemaOptions(fieldSchema);
}

export function WorkflowConditionEditor({ catalog, value, onChange }: Props) {

  const conditionOptions = catalog.map((item) => ({
    value: item.type,
    label: CONDITION_LABELS[item.type] ?? item.type,
  }));

  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-black/65">Condiciones</div>

      {value.map((condition, index) => {
        const definition = catalog.find((item) => item.type === condition.type);

        const requiresDate =
          condition.type === ConditionType.DATE_AFTER ||
          condition.type === ConditionType.DATE_BEFORE ||
          JSON.stringify(definition?.configSchema ?? {}).includes("date");
        const isScheduleDeliveryWindow =
          condition.type === ConditionType.SCHEDULE_DELIVERY_WINDOW;
        const isSaleOrderFieldRequired =
          condition.type === ConditionType.SALE_ORDER_FIELD_REQUIRED;
        const fieldOptions = isSaleOrderFieldRequired
          ? getConditionFieldOptions(definition)
          : [];

        return (
          <div
            key={`${condition.type}-${index}`}
            className="rounded-lg border border-black/10 p-2 "
          >
            <div>

            </div>
            <FloatingSelect
              label="Condición"
              name={`condition-${index}`}
              value={condition.type}
              onChange={(selected) => {
                const next = [...value];

                next[index] = {
                  type: selected as WorkflowCondition["type"],
                  config:
                    selected === ConditionType.SCHEDULE_DELIVERY_WINDOW
                      ? { minDaysBefore: 0, maxDaysBefore: 1 }
                      : selected === ConditionType.SALE_ORDER_FIELD_REQUIRED
                        ? {
                            field:
                              getConditionFieldOptions(
                                catalog.find((item) => item.type === selected),
                              )[0]?.value ?? "",
                          }
                      : {},
                };

                onChange(next);
              }}
              options={conditionOptions}
              searchable
              searchPlaceholder="Buscar condición..."
              emptyMessage="Sin condiciones"
              className="h-9 text-xs text-black my-3"
            />

            {requiresDate ? (
              <FloatingDatePicker
                label="Fecha"
                name={`condition-date-${index}`}
                value={
                  typeof condition.config.date === "string" &&
                  condition.config.date
                    ? new Date(condition.config.date)
                    : undefined
                }
                onChange={(date) => {
                  const next = [...value];

                  next[index] = {
                    ...condition,
                    config: {
                      ...condition.config,
                      date: date ? date.toISOString() : undefined,
                    },
                  };

                  onChange(next);
                }}
                className="mt-2 h-9 text-xs"
              />
            ) : null}

            {isScheduleDeliveryWindow ? (
              <div className="mt-2 space-y-2">
                {/* <FloatingInput
                  label="Minimo de dias anteriores"
                  name={`condition-min-days-${index}`}
                  type="number"
                  min={0}
                  step={1}
                  value={String(condition.config.minDaysBefore ?? 0)}
                  onChange={(event) => {
                    const next = [...value];
                    next[index] = {
                      ...condition,
                      config: {
                        ...condition.config,
                        minDaysBefore: Math.max(0, Number(event.target.value)),
                      },
                    };
                    onChange(next);
                  }}
                /> */}
                <FloatingInput
                  label="desde cuantos días anteriores"
                  name={`condition-max-days-${index}`}
                  type="number"
                  min={0}
                  step={1}
                  value={String(condition.config.maxDaysBefore ?? 1)}
                  onChange={(event) => {
                    const next = [...value];
                    next[index] = {
                      ...condition,
                      config: {
                        ...condition.config,
                        maxDaysBefore: Math.max(0, Number(event.target.value)),
                      },
                    };
                    onChange(next);
                  }}
                />
              </div>
            ) : null}

            {isSaleOrderFieldRequired ? (
              <FloatingSelect
                label="Campo requerido"
                name={`condition-field-${index}`}
                value={
                  typeof condition.config.field === "string"
                    ? condition.config.field
                    : ""
                }
                onChange={(selected) => {
                  const next = [...value];
                  next[index] = {
                    ...condition,
                    config: {
                      ...condition.config,
                      field: selected,
                    },
                  };
                  onChange(next);
                }}
                options={fieldOptions}
                searchable
                searchPlaceholder="Buscar campo..."
                emptyMessage="Sin campos"
                className="mt-2 h-9 text-xs"
              />
            ) : null}

            <SystemButton
              type="button"
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={() =>
                onChange(value.filter((_, itemIndex) => itemIndex !== index))
              }
            >
              Quitar
            </SystemButton>
          </div>
        );
      })}

      <SystemButton
        type="button"
        size="sm"
        variant="outline"
        disabled={!catalog.length}
        onClick={() => {
          const first = catalog[0];

          if (first) {
            onChange([
              ...value,
              {
                type: first.type,
                config: {},
              },
            ]);
          }
        }}
      >
        Agregar condición
      </SystemButton>
    </div>
  );
}
