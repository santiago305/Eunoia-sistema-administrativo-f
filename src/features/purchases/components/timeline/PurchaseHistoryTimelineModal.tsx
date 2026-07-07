import { useCallback, useEffect, useMemo, useState } from "react";
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
      className="w-auto"
      bodyClassName="max-h-[70vh] px-3 py-3 sm:px-4 sm:py-4"
    >
      <div className="space-y-4">
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
