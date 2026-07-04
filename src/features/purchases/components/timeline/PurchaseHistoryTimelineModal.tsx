import { useCallback, useEffect, useMemo, useState } from "react";
import { Clock3 } from "lucide-react";
import { PurchaseTimeline, type PurchaseTimelineEvent } from "./PurchaseTimeline";
import { Modal } from "@/shared/components/modales/Modal";
import { DataTablePagination } from "@/shared/components/table/DataTablePagination";
import { getPurchaseTimeline } from "@/shared/services/purchaseService";

type PurchaseHistoryTimelineModalProps = {
  open: boolean;
  purchase: {
    poId?: string | null;
    serie?: string | null;
    correlative?: string | number | null;
    supplierName?: string | null;
  } | null;
  onClose: () => void;
};

const TIMELINE_LIMIT = 10;

function getPurchaseNumber(purchase: PurchaseHistoryTimelineModalProps["purchase"]) {
  if (!purchase) return "";
  return [purchase.serie, purchase.correlative].filter(Boolean).join("-") || purchase.poId || "";
}

export function PurchaseHistoryTimelineModal({
  open,
  purchase,
  onClose,
}: PurchaseHistoryTimelineModalProps) {
  const [events, setEvents] = useState<PurchaseTimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const purchaseId = purchase?.poId ?? "";
  const purchaseNumber = useMemo(() => getPurchaseNumber(purchase), [purchase]);

  const loadTimeline = useCallback(
    async (nextPage = 1) => {
      if (!purchaseId) return;
      setLoading(true);
      setError(null);

      try {
        const response = await getPurchaseTimeline(purchaseId, {
          page: nextPage,
          limit: TIMELINE_LIMIT,
        });
        setEvents((response.events ?? []) as PurchaseTimelineEvent[]);
        setTotal(response.total ?? response.events?.length ?? 0);
        setPage(response.page ?? nextPage);
      } catch {
        setEvents([]);
        setTotal(0);
        setError("No se pudo cargar la linea de tiempo de la compra.");
      } finally {
        setLoading(false);
      }
    },
    [purchaseId],
  );

  useEffect(() => {
    if (!open || !purchaseId) return;
    void loadTimeline(1);
  }, [loadTimeline, open, purchaseId]);

  const handleClose = () => {
    setEvents([]);
    setTotal(0);
    setPage(1);
    setError(null);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Historial"
      description={
        purchaseNumber
          ? `Linea de tiempo de la compra ${purchaseNumber}`
          : "Linea de tiempo de la compra"
      }
      className="w-[min(920px,calc(100vw-2rem))]"
      bodyClassName="max-h-[70vh] px-4 py-4"
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-2 rounded-sm border border-black/10 bg-black/[0.02] px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold text-black">
              <Clock3 className="h-4 w-4 text-black/60" aria-hidden="true" />
              <span className="truncate">{purchaseNumber || "Compra"}</span>
            </div>
            {purchase?.supplierName ? (
              <p className="mt-1 truncate text-xs text-black/55">{purchase.supplierName}</p>
            ) : null}
          </div>
          <span className="shrink-0 rounded-sm border border-black/10 bg-white px-2 py-1 text-xs text-black/60">
            {total} eventos
          </span>
        </div>

        {error ? (
          <div className="rounded-sm border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <PurchaseTimeline
          events={events}
          loading={loading}
          emptyMessage="Esta compra aun no tiene eventos registrados."
        />

        {total > TIMELINE_LIMIT ? (
          <DataTablePagination
            page={page}
            limit={TIMELINE_LIMIT}
            total={total}
            onPageChange={(nextPage) => {
              void loadTimeline(nextPage);
            }}
          />
        ) : null}
      </div>
    </Modal>
  );
}
