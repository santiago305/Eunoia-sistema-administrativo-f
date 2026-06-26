import { Filter, RotateCcw, Search } from "lucide-react";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import type { UserApiListItem } from "@/shared/services/userService";
import { purchaseEventFilterOptions } from "@/features/purchases/utils/purchase-event-labels";

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
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
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
        <label className="flex flex-col gap-1 text-xs font-medium text-black/65">
          Desde
          <input
            type="date"
            value={value.from}
            onChange={(event) => onChange({ ...value, from: event.target.value })}
            className="min-h-10 rounded-sm border border-black/10 bg-white px-3 text-sm text-black outline-none focus:border-black"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-black/65">
          Hasta
          <input
            type="date"
            value={value.to}
            onChange={(event) => onChange({ ...value, to: event.target.value })}
            className="min-h-10 rounded-sm border border-black/10 bg-white px-3 text-sm text-black outline-none focus:border-black"
          />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="inline-flex min-h-10 items-center gap-2 rounded-sm bg-black px-3 text-sm font-medium text-white hover:bg-black/85"
          onClick={onApply}
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          Aplicar
        </button>
        <button
          type="button"
          className="inline-flex min-h-10 items-center gap-2 rounded-sm border border-black/10 px-3 text-sm font-medium text-black hover:bg-black/[0.03]"
          onClick={onReset}
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Limpiar
        </button>
      </div>
    </section>
  );
}
