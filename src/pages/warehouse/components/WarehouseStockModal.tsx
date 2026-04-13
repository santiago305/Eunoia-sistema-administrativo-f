import { useCallback, useEffect, useState } from "react";
import { Modal } from "@/components/modales/Modal";
import { errorResponse } from "@/common/utils/response";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { getWarehouseStockById } from "@/services/warehouseServices";
import type { WarehouseStockResponse } from "@/pages/warehouse/types/warehouse";
import { WarehouseStockChart } from "./WarehouseStockChart";

type WarehouseRef = {
  warehouseId: string;
  name: string;
} | null;

type Props = {
  open: boolean;
  warehouse: WarehouseRef;
  onClose: () => void;
};

export function WarehouseStockModal({ open, warehouse, onClose }: Props) {
  const { showFlash } = useFlashMessage();
  const [cache, setCache] = useState<Record<string, WarehouseStockResponse>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const warehouseId = warehouse?.warehouseId ?? "";
  const stockData = warehouseId ? cache[warehouseId] ?? null : null;

  const loadStock = useCallback(
    async (force = false) => {
      if (!warehouseId) return;
      if (!force && cache[warehouseId]) {
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await getWarehouseStockById(warehouseId);
        setCache((previous) => ({
          ...previous,
          [warehouseId]: response,
        }));
      } catch {
        const message = "No se pudo cargar el detalle de stock del almacén.";
        setError(message);
        showFlash(errorResponse(message));
      } finally {
        setLoading(false);
      }
    },
    [cache, showFlash, warehouseId],
  );

  useEffect(() => {
    if (!open || !warehouseId) return;
    void loadStock(false);
  }, [loadStock, open, warehouseId]);

  if (!open || !warehouse) return null;

  return (
    <Modal
      open={open}
      title={`Detalle de stock - ${warehouse.name}`}
      onClose={onClose}
      className="w-[350px] max-h-[78vh]"
      bodyClassName="py-5"
    >
      {loading && !stockData ? (
        <div className="flex h-[300px] items-center justify-center rounded-2xl border border-black/10 bg-white text-sm text-black/60">
          Cargando detalle del almacén...
        </div>
      ) : error && !stockData ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : stockData ? (
        <WarehouseStockChart items={stockData.items} />
      ) : (
        <div className="flex h-[240px] items-center justify-center rounded-2xl border border-dashed border-black/10 bg-white text-sm text-black/60">
          No hay información de stock disponible para este almacén.
        </div>
      )}
    </Modal>
  );
}
