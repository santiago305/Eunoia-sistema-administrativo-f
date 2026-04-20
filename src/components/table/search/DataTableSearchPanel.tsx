import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  Search,
  Star,
  Trash2,
} from "lucide-react";
import type {
  DataTableRecentSearchItem,
  DataTableSavedSearchItem,
  DataTableSearchColumn,
  DataTableSearchSnapshot,
} from "./types";

type Props<
  TFilterKey extends string,
  TSnapshot extends DataTableSearchSnapshot<TFilterKey>,
> = {
  recent?: DataTableRecentSearchItem<TSnapshot>[];
  saved?: DataTableSavedSearchItem<TSnapshot>[];
  columns: DataTableSearchColumn<TFilterKey>[];
  snapshot: TSnapshot;
  onApplySnapshot: (snapshot: TSnapshot) => void;
  onToggleOption: (columnId: TFilterKey, optionId: string) => void;
  onDeleteMetric?: (metricId: string) => void;
};

const INITIAL_VISIBLE_COLUMNS = 4;

export function DataTableSearchPanel<
  TFilterKey extends string,
  TSnapshot extends DataTableSearchSnapshot<TFilterKey>,
>({
  recent = [],
  saved = [],
  columns,
  snapshot,
  onApplySnapshot,
  onToggleOption,
  onDeleteMetric,
}: Props<TFilterKey, TSnapshot>) {
  const [activeColumnId, setActiveColumnId] = useState<TFilterKey | null>(null);
  const [optionQuery, setOptionQuery] = useState("");
  const [showAllColumns, setShowAllColumns] = useState(false);

  useEffect(() => {
    setOptionQuery("");
  }, [activeColumnId]);

  const activeColumn = useMemo(
    () => columns.find((column) => column.id === activeColumnId) ?? null,
    [activeColumnId, columns],
  );

  const filteredOptions = useMemo(() => {
    if (!activeColumn) return [];

    const query = optionQuery.trim().toLowerCase();
    if (!query) return activeColumn.options;

    return activeColumn.options.filter((option) => {
      const haystack = [option.label, ...(option.keywords ?? [])]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [activeColumn, optionQuery]);

  const visibleColumns = showAllColumns
    ? columns
    : columns.slice(0, INITIAL_VISIBLE_COLUMNS);

  const hasMoreColumns = columns.length > INITIAL_VISIBLE_COLUMNS;

  // ======================
  // VIEW: OPTIONS
  // ======================
  if (activeColumn) {
    const selectedValues = snapshot.filters[activeColumn.id] ?? [];

    return (
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setActiveColumnId(null)}
          className="inline-flex items-center gap-2 text-[11px] font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver
        </button>

        <div className="rounded-2xl bg-slate-50/80 p-3">
          <div className="mb-2">
            <div className="text-sm font-semibold text-slate-900">
              {activeColumn.label}
            </div>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={optionQuery}
              onChange={(event) => setOptionQuery(event.target.value)}
              placeholder={`Buscar ${activeColumn.label.toLowerCase()}...`}
              className="h-9 w-full rounded-xl border-0 bg-white pl-9 pr-3 text-[13px] text-slate-700 outline-none ring-1 ring-slate-200 transition placeholder:text-slate-400 focus:ring-2 focus:ring-slate-300"
            />
          </div>
        </div>

        <div className="max-h-72 space-y-1 overflow-auto pr-1">
          {filteredOptions.length ? (
            filteredOptions.map((option) => {
              const selected = selectedValues.includes(option.id);

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() =>
                    onToggleOption(activeColumn.id, option.id)
                  }
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition ${
                    selected
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span className="truncate text-[13px] font-medium">
                    {option.label}
                  </span>

                  <span
                    className={`ml-3 inline-flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full ${
                      selected ? "bg-white/15" : "bg-slate-200/70"
                    }`}
                  >
                    {selected ? <Check className="h-3 w-3" /> : null}
                  </span>
                </button>
              );
            })
          ) : (
            <div className="rounded-xl bg-slate-50 px-4 py-5 text-center text-[11px] text-slate-500">
              No hay opciones que coincidan con la búsqueda actual.
            </div>
          )}
        </div>
      </div>
    );
  }

  // ======================
  // VIEW: MAIN PANEL
  // ======================
  return (
    <div className="space-y-4">
      {/* ================= RECENTES ================= */}
      {recent.length ? (
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <Star className="h-3.5 w-3.5 text-amber-500" />
            <h3 className="text-sm font-semibold text-slate-900">
              Recientes
            </h3>
          </div>

          <div className="space-y-1">
            {recent.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onApplySnapshot(item.snapshot)}
                className="flex w-full items-center rounded-xl px-3 py-2 text-left text-[13px] text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                title={item.label}
              >
                <span className="block min-w-0 flex-1 truncate">
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {/* ================= COLUMNAS ================= */}
      <section className="space-y-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Columnas
          </h3>
          <p className="text-[11px] text-slate-500">
            Selecciona una columna para filtrar rápidamente.
          </p>
        </div>

        <div className="space-y-1">
          {visibleColumns.map((column) => (
            <button
              key={column.id}
              type="button"
              onClick={() => setActiveColumnId(column.id)}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition hover:bg-slate-100"
            >
              <span className="truncate text-[13px] font-medium text-slate-800">
                {column.label}
              </span>

              <ChevronRight className="ml-3 h-4 w-4 shrink-0 text-slate-400" />
            </button>
          ))}
        </div>

        {hasMoreColumns && (
          <div className="flex justify-center pt-1">
            <button
              type="button"
              onClick={() => setShowAllColumns((prev) => !prev)}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            >
              <span>
                {showAllColumns ? "Ver menos" : "Ver más"}
              </span>
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${
                  showAllColumns ? "rotate-180" : ""
                }`}
              />
            </button>
          </div>
        )}
      </section>

      {/* ================= METRICAS ================= */}
      {saved.length ? (
        <section className="space-y-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Métricas
            </h3>
            <p className="text-[11px] text-slate-500">
              Reaplica filtros guardados para esta tabla.
            </p>
          </div>

          <div className="space-y-1">
            {saved.map((metric) => (
              <div
                key={metric.id}
                className="group flex items-center gap-2 rounded-xl px-3 py-2 transition hover:bg-slate-100"
              >
                <button
                  type="button"
                  onClick={() => onApplySnapshot(metric.snapshot)}
                  className="min-w-0 flex-1 text-left"
                  title={metric.name}
                >
                  <div className="truncate text-[13px] font-medium text-slate-800">
                    {metric.name}
                  </div>
                  <div className="truncate text-[11px] text-slate-500">
                    {metric.label}
                  </div>
                </button>

                {onDeleteMetric && (
                  <button
                    type="button"
                    onClick={() => onDeleteMetric(metric.id)}
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                    aria-label={`Eliminar ${metric.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}