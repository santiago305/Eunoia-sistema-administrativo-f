import { Filter, RotateCcw, Search } from "lucide-react";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { FloatingDateRangePicker } from "@/shared/components/components/date-picker/FloatingDateRangePicker";
import { SystemButton } from "@/shared/components/components/SystemButton";
import type { UserApiListItem } from "@/shared/services/userService";
import { purchaseEventFilterOptions } from "@/features/purchases/utils/purchase-event-labels";
import { parseDateInputValue, toLocalDateKey } from "@/shared/utils/functionPurchases";

export type PurchaseTimelineFilterState = {
  eventType: string;
  performedByUserId: string;
  from: string;
  to: string;
};

type Props = {
  value: PurchaseTimelineFilterState;
  users: UserApiListItem[];
  loadingUsers?: boolean;
  onChange: (next: PurchaseTimelineFilterState) => void;
  onApply: () => void;
  onReset: () => void;
};

const emptyOption = { value: "", label: "Todos" };

export function PurchaseTimelineFilters({
  value,
  users,
  loadingUsers = false,
  onChange,
  onApply,
  onReset,
}: Props) {
  const userOptions = [
    emptyOption,
    ...users.map((user) => ({
      value: user.id,
      label: user.name ? `${user.name} (${user.email})` : user.email,
    })),
  ];

  return (
    <section className="rounded-sm border border-black/10 bg-white p-3">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-black">
        <Filter className="h-4 w-4" aria-hidden="true" />
        Filtros
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <FloatingSelect
          label="Evento"
          name="purchase-history-event-type"
          value={value.eventType}
          options={[emptyOption, ...purchaseEventFilterOptions]}
          onChange={(eventType) => onChange({ ...value, eventType })}
          searchable
          placeholder="Todos"
          panelWidthMode="min-trigger"
        />
        <FloatingSelect
          label="Usuario"
          name="purchase-history-user"
          value={value.performedByUserId}
          options={userOptions}
          onChange={(performedByUserId) => onChange({ ...value, performedByUserId })}
          searchable
          placeholder={loadingUsers ? "Cargando..." : "Todos"}
          disabled={loadingUsers}
          panelWidthMode="min-trigger"
        />
        <FloatingDateRangePicker
          label="Rango de eventos"
          name="purchase-history-timeline-range"
          startDate={parseDateInputValue(value.from)}
          endDate={parseDateInputValue(value.to)}
          onChange={({ startDate, endDate }) =>
            onChange({
              ...value,
              from: startDate ? toLocalDateKey(startDate) : "",
              to: endDate ? toLocalDateKey(endDate) : "",
            })
          }
          placeholder="Todos"
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <SystemButton type="button" variant="secondary" size="sm" leftIcon={<Search className="h-4 w-4" />} onClick={onApply}>
          Aplicar
        </SystemButton>
        <SystemButton type="button" variant="outline" size="sm" leftIcon={<RotateCcw className="h-4 w-4" />} onClick={onReset}>
          Limpiar
        </SystemButton>
      </div>
    </section>
  );
}