import { useCallback, useEffect, useMemo, useState } from "react";
import { History, LoaderCircle, PackageOpen, RotateCcw, Trash2 } from "lucide-react";
import { Modal } from "@/shared/components/modales/Modal";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { AlertModal } from "@/shared/components/components/AlertModal";
import { DataTable } from "@/shared/components/table/DataTable";
import type { DataTableColumn } from "@/shared/components/table/types";
import { parseApiError } from "@/shared/common/utils/handleApiError";
import {
  listSaleOrderImportLotes,
  setSaleOrderImportLoteActive,
} from "@/shared/services/saleOrderService";
import type { SaleOrderImportLote } from "@/features/sale-orders/types/saleOrder";
import { SaleOrderImportLoteHistoryModal } from "./SaleOrderImportLoteHistoryModal";

type Props = {
  open: boolean;
  refreshKey?: number;
  onClose: () => void;
  onChanged?: (lote: SaleOrderImportLote) => void;
};

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
};

export function SaleOrderImportLotesModal({ open, refreshKey = 0, onClose, onChanged }: Props) {
  const [items, setItems] = useState<SaleOrderImportLote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [historyLote, setHistoryLote] = useState<SaleOrderImportLote | null>(null);
  const [pendingLoteToggle, setPendingLoteToggle] = useState<SaleOrderImportLote | null>(null);
  const orderedItems = useMemo(() => [...items].sort((a, b) => b.lote - a.lote), [items]);

  useEffect(() => {
    if (!open) {
      setItems([]);
      setError("");
      setSavingId(null);
      setPendingLoteToggle(null);
      return;
    }

    let active = true;
    setLoading(true);
    setError("");

    void listSaleOrderImportLotes()
      .then((response) => {
        if (active) setItems(response ?? []);
      })
      .catch((requestError) => {
        if (active) setError(parseApiError(requestError, "No se pudo cargar los lotes importados."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open, refreshKey]);

  const toggleActive = useCallback(async (lote: SaleOrderImportLote) => {
    setSavingId(lote.id);
    setError("");
    try {
      const updated = await setSaleOrderImportLoteActive(lote.id, !lote.isActive);
      setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      onChanged?.(updated);
    } catch (requestError) {
      setError(parseApiError(requestError, "No se pudo actualizar el lote."));
    } finally {
      setSavingId(null);
    }
  }, [onChanged]);

  const confirmPendingLoteToggle = useCallback(() => {
    if (!pendingLoteToggle) return;
    void toggleActive(pendingLoteToggle).finally(() => setPendingLoteToggle(null));
  }, [pendingLoteToggle, toggleActive]);

  const columns = useMemo<DataTableColumn<SaleOrderImportLote>[]>(() => [
    {
      id: "lote",
      header: "Lote",
      className: "text-center font-semibold tabular-nums text-zinc-900",
      cell: (item) => item.lote,
      headerClassName: "text-center",
      width: "88px",
    },
    {
      id: "createdAt",
      header: "Creado",
      cell: (item) => formatDateTime(item.createdAt),
    },
    {
      id: "createdBy",
      header: "Usuario",
      copy:true,
      cell: (item) => {
        const primary = item.createdBy.email ?? item.createdBy.name ?? "-";
        return (
          <div className="min-w-0">
            <p className="truncate font-medium text-zinc-900">{primary}</p>
          </div>
        );
      }
    },
    {
      id: "actions",
      header: "Acciones",
      className: "text-center",
      headerClassName: "text-center",
      stopRowClick: true,
      width: "120px",
      cell: (item) => (
        <div className="flex justify-center gap-2">
          <SystemButton
            type="button"
            size="icon"
            variant={item.isActive ? "danger" : "success"}
            className="h-8 w-8 rounded-md"
            tooltip={item.isActive ? "Eliminar lote" : "Restaurar lote"}
            disabled={savingId === item.id}
            onClick={() => setPendingLoteToggle(item)}
          >
            {item.isActive ? <Trash2 className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
          </SystemButton>
          <SystemButton
            type="button"
            size="icon"
            variant="outline"
            className="h-8 w-8 rounded-md"
            tooltip="Historial"
            onClick={() => setHistoryLote(item)}
          >
            <History className="h-4 w-4" />
          </SystemButton>
        </div>
      ),
    },
  ], [savingId, toggleActive]);

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Lotes importados"
        className="w-[min(760px,calc(100vw-2rem))]"
        bodyClassName="p-0"
      >
        {loading ? (
          <div className="grid min-h-56 place-items-center text-sm text-zinc-500">
            <span className="inline-flex items-center gap-2">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Cargando lotes...
            </span>
          </div>
        ) : error && orderedItems.length === 0 ? (
          <div className="grid min-h-56 place-items-center px-6 text-center">
            <p className="text-sm font-semibold text-rose-700">{error}</p>
          </div>
        ) : orderedItems.length === 0 ? (
          <div className="grid min-h-56 place-items-center px-6 text-center text-sm text-zinc-500">
            <div>
              <PackageOpen className="mx-auto mb-3 h-8 w-8 text-zinc-400" />
              No hay lotes importados.
            </div>
          </div>
        ) : (
          <div className="p-4">
            {error ? (
              <div className="border-b border-rose-100 bg-rose-50 px-4 py-2 text-xs font-medium text-rose-700">
                {error}
              </div>
            ) : null}
            <DataTable
              tableId="sale-order-import-lotes-table"
              data={orderedItems}
              columns={columns}
              rowKey="id"
              showSearch={false}
              selectableColumns={false}
              responsiveMode="table"
              animated={false}
              maxHeight="520px"
              emptyMessage="No hay lotes importados."
              className="p-0"
            />
          </div>
        )}
      </Modal>
      <SaleOrderImportLoteHistoryModal
        open={Boolean(historyLote)}
        lote={historyLote}
        onClose={() => setHistoryLote(null)}
      />
      <AlertModal
        open={Boolean(pendingLoteToggle)}
        onClose={() => setPendingLoteToggle(null)}
        onConfirm={confirmPendingLoteToggle}
        type={pendingLoteToggle?.isActive ? "warning" : "restore"}
        title={pendingLoteToggle?.isActive ? "Eliminar lote" : "Restaurar lote"}
        message={
          pendingLoteToggle?.isActive
            ? `Se eliminaran los pedidos del lote, esta seguro?`
            : `Se restauraran los pedidos del lote ${pendingLoteToggle?.lote}.`
        }
        confirmText={pendingLoteToggle?.isActive ? "Eliminar" : "Restaurar"}
        loading={Boolean(savingId)}
      />
    </>
  );
}
