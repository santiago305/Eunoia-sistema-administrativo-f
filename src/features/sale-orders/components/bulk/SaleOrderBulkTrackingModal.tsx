import { useEffect, useMemo, useState } from "react";
import { ListChecks } from "lucide-react";
import type { SaleOrder } from "@/features/sale-orders/types/saleOrder";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { Modal } from "@/shared/components/modales/Modal";

type TrackingExecutionMode = "preguide" | "prepared";
type PreguideFilter = "all" | "without" | "with";
type PreparedFilter = "all" | "pending" | "prepared";

export type SaleOrderBulkTrackingSelection = {
  saleOrderIds: string[];
  preguide?: boolean;
  prepared?: boolean;
};

type Props = {
  open: boolean;
  selectedOrders: SaleOrder[];
  loading?: boolean;
  canUpdatePreguide: boolean;
  canUpdatePrepared: boolean;
  onClose: () => void;
  onSubmit: (selection: SaleOrderBulkTrackingSelection) => Promise<void> | void;
};

const preguideFilterOptions = [
  { value: "all", label: "Todos" },
  { value: "without", label: "Sin preguía" },
  { value: "with", label: "Con preguía" },
];

const preparedFilterOptions = [
  { value: "all", label: "Todos" },
  { value: "pending", label: "Sin preparar" },
  { value: "prepared", label: "Preparados" },
];

const resultOptions: Record<TrackingExecutionMode, Array<{ value: string; label: string }>> = {
  preguide: [
    { value: "false", label: "Sin preguía" },
    { value: "true", label: "Con preguía" },
  ],
  prepared: [
    { value: "false", label: "Sin preparar" },
    { value: "true", label: "Preparado" },
  ],
};

function getOrderLabel(order: SaleOrder) {
  const number = [order.serie, order.correlative].filter(Boolean).join("-");
  return number || order.id.slice(0, 8);
}

export function SaleOrderBulkTrackingModal({
  open,
  selectedOrders,
  loading = false,
  canUpdatePreguide,
  canUpdatePrepared,
  onClose,
  onSubmit,
}: Props) {
  const executionOptions = useMemo(
    () => [
      ...(canUpdatePreguide ? [{ value: "preguide", label: "Preguía" }] : []),
      ...(canUpdatePrepared ? [{ value: "prepared", label: "Preparación" }] : []),
    ],
    [canUpdatePreguide, canUpdatePrepared],
  );
  const [preguideFilter, setPreguideFilter] = useState<PreguideFilter>("all");
  const [preparedFilter, setPreparedFilter] = useState<PreparedFilter>("all");
  const [executionMode, setExecutionMode] = useState<TrackingExecutionMode>(
    canUpdatePreguide ? "preguide" : "prepared",
  );
  const [result, setResult] = useState("");

  useEffect(() => {
    if (!open) {
      setPreguideFilter("all");
      setPreparedFilter("all");
      setResult("");
      return;
    }

    const isCurrentModeAllowed = executionOptions.some((option) => option.value === executionMode);
    if (!isCurrentModeAllowed && executionOptions[0]) {
      setExecutionMode(executionOptions[0].value as TrackingExecutionMode);
      setResult("");
    }
  }, [executionMode, executionOptions, open]);

  const visibleOrders = useMemo(
    () =>
      selectedOrders.filter((order) => {
        const hasPreguide = order.preguide === true;
        const isPrepared = order.prepared === true;
        const matchesPreguide =
          preguideFilter === "all" ||
          (preguideFilter === "with" ? hasPreguide : !hasPreguide);
        const matchesPrepared =
          preparedFilter === "all" ||
          (preparedFilter === "prepared" ? isPrepared : !isPrepared);
        return matchesPreguide && matchesPrepared;
      }),
    [preguideFilter, preparedFilter, selectedOrders],
  );

  const canSubmit = visibleOrders.length > 0 && result !== "" && !loading;

  const submit = () => {
    if (!canSubmit) return;
    const value = result === "true";
    void onSubmit({
      saleOrderIds: visibleOrders.map((order) => order.id),
      ...(executionMode === "preguide" ? { preguide: value } : { prepared: value }),
    });
  };

  return (
    <Modal
      open={open}
      title="Actualizar seguimiento"
      description={`Total: ${selectedOrders.length}. Visibles: ${visibleOrders.length}.`}
      onClose={() => {
        if (!loading) onClose();
      }}
      preventClose={loading}
      className="w-195"
      closeButtonClassName="rounded-sm"
      bodyClassName="px-4 py-4"
      footer={
        <div className="flex justify-end">
          <SystemButton
            variant="outline"
            size="sm"
            className="rounded-md"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </SystemButton>
        </div>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="overflow-hidden rounded-lg border border-border bg-muted/10">
          <div className="space-y-3 border-b border-border px-3 py-3">
            <p className="text-sm font-semibold text-foreground">Pedidos seleccionados</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <FloatingSelect
                label="Filtrar por preguía"
                name="bulk-tracking-preguide-filter"
                value={preguideFilter}
                options={preguideFilterOptions}
                onChange={(value) => setPreguideFilter(value as PreguideFilter)}
                disabled={loading}
                panelWidthMode="min-trigger"
              />
              <FloatingSelect
                label="Filtrar por preparación"
                name="bulk-tracking-prepared-filter"
                value={preparedFilter}
                options={preparedFilterOptions}
                onChange={(value) => setPreparedFilter(value as PreparedFilter)}
                disabled={loading}
                panelWidthMode="min-trigger"
              />
            </div>
          </div>

          <div className="scroll-area max-h-[420px] overflow-y-auto p-2">
            {visibleOrders.length ? (
              visibleOrders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-md px-2 py-2 text-xs transition-colors hover:bg-background"
                >
                  <p className="font-semibold text-foreground">{getOrderLabel(order)}</p>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {order.client?.fullName || "Sin cliente"}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    <span className={order.preguide === true ? "rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700" : "rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700"}>
                      {order.preguide === true ? "Con preguía" : "Sin preguía"}
                    </span>
                    <span className={order.prepared === true ? "rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700" : "rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700"}>
                      {order.prepared === true ? "Preparado" : "Sin preparar"}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="px-2 py-8 text-center text-xs text-muted-foreground">
                Ningún pedido coincide con los filtros.
              </p>
            )}
          </div>
        </aside>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FloatingSelect
              label="Ejecutar por"
              name="bulk-tracking-execution-mode"
              value={executionMode}
              options={executionOptions}
              onChange={(value) => {
                setExecutionMode(value as TrackingExecutionMode);
                setResult("");
              }}
              disabled={loading || executionOptions.length === 0}
              panelWidthMode="min-trigger"
            />
            <FloatingSelect
              label={executionMode === "preguide" ? "Resultado de preguía" : "Resultado de preparación"}
              name="bulk-tracking-result"
              value={result}
              options={resultOptions[executionMode]}
              onChange={setResult}
              disabled={loading || executionOptions.length === 0}
              panelWidthMode="min-trigger"
              placeholder="Selecciona el resultado"
            />
          </div>

          <div className="rounded-lg border border-border bg-muted/20 px-3 py-3 text-xs text-muted-foreground">
            Se actualizarán únicamente los {visibleOrders.length} pedido(s) visibles según los filtros.
          </div>

          <div className="flex justify-end">
            <SystemButton
              size="sm"
              className="rounded-md"
              leftIcon={<ListChecks className="h-4 w-4" />}
              disabled={!canSubmit}
              loading={loading}
              onClick={submit}
            >
              {loading ? "Ejecutando..." : "Ejecutar"}
            </SystemButton>
          </div>
        </div>
      </div>
    </Modal>
  );
}
