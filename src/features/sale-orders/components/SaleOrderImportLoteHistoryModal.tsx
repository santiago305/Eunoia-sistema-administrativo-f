import { useEffect, useMemo, useState } from "react";
import { History, LoaderCircle, RotateCcw } from "lucide-react";
import { Modal } from "@/shared/components/modales/Modal";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { DataTable } from "@/shared/components/table/DataTable";
import type { DataTableColumn } from "@/shared/components/table/types";
import { parseApiError } from "@/shared/common/utils/handleApiError";
import { listSaleOrderImportLoteAudit } from "@/shared/services/saleOrderService";
import type { SaleOrderImportLote, SaleOrderImportLoteAudit } from "@/features/sale-orders/types/saleOrder";

type Props = {
  open: boolean;
  lote: SaleOrderImportLote | null;
  onClose: () => void;
};

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
};

const ACTION_LABEL: Record<SaleOrderImportLoteAudit["actionExecution"], string> = {
  delete: "Eliminar",
  restore: "Restaurar",
};

export function SaleOrderImportLoteHistoryModal({ open, lote, onClose }: Props) {
  const [items, setItems] = useState<SaleOrderImportLoteAudit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  const columns = useMemo<DataTableColumn<SaleOrderImportLoteAudit>[]>(() => [
    {
      id: "createdAt",
      header: "Fecha",
      cell: (item) => formatDateTime(item.createdAt),
    },
    {
      id: "executedBy",
      copy:true,
      header: "Ejecutado por",
      cell: (item) => {
        const primary = item.executedBy.email ?? item.executedBy.name ?? "-";
        return (
          <div className="min-w-0">
            <p className="truncate font-medium text-zinc-900">{primary}</p>
          </div>
        );
      },
    },
    {
      id: "actionExecution",
      header: "Accion",
      className: "text-center",
      headerClassName: "text-center",
      cell: (item) => (
        <span className="rounded-sm bg-zinc-100 px-2 py-1 text-[11px] font-semibold text-zinc-700">
          {ACTION_LABEL[item.actionExecution]}
        </span>
      ),
      width: "104px",
    },
  ], []);

  useEffect(() => {
    if (!open || !lote?.id) {
      setItems([]);
      setError("");
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError("");
    setItems([]);

    void listSaleOrderImportLoteAudit(lote.id)
      .then((response) => {
        if (active) setItems(response ?? []);
      })
      .catch((requestError) => {
        if (active) setError(parseApiError(requestError, "No se pudo cargar el historial del lote."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [lote?.id, open, retryKey]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={lote ? `Historial lote ${lote.lote}` : "Historial de lote"}
      className="w-[min(520px,calc(100vw-2rem))]"
      bodyClassName="p-0"
    >
      {loading ? (
        <div className="grid min-h-48 place-items-center text-sm text-zinc-500">
          <span className="inline-flex items-center gap-2">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Cargando historial...
          </span>
        </div>
      ) : error ? (
        <div className="grid min-h-48 place-items-center px-6 text-center">
          <div>
            <p className="text-sm font-semibold text-rose-700">{error}</p>
            <SystemButton
              type="button"
              variant="outline"
              className="mt-4 rounded-md"
              leftIcon={<RotateCcw className="h-4 w-4" />}
              onClick={() => setRetryKey((current) => current + 1)}
            >
              Reintentar
            </SystemButton>
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="grid min-h-48 place-items-center px-6 text-center text-sm text-zinc-500">
          <div>
            <History className="mx-auto mb-3 h-7 w-7 text-zinc-400" />
            Este lote no tiene historial.
          </div>
        </div>
      ) : (
        <DataTable
          tableId="sale-order-import-lote-audit-table"
          data={items}
          columns={columns}
          rowKey="id"
          showSearch={false}
          selectableColumns={false}
          responsiveMode="table"
          animated={false}
          maxHeight="420px"
          emptyMessage="Este lote no tiene historial."
          className="p-2"
        />
      )}
    </Modal>
  );
}
