import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, CalendarDays, Loader2, PackageCheck, RefreshCw } from "lucide-react";
import { Modal } from "@/shared/components/modales/Modal";
import { getApiErrorMessage } from "@/shared/common/utils/apiError";
import { getInventoryReservationDetails } from "@/shared/services/inventoryService";
import type { ProductCatalogProductType } from "@/features/catalog/types/product";
import type {
  InventoryReservationDetail,
  InventoryReservationDetailsResponse,
} from "@/features/catalog/types/inventory";

export type InventoryReservationTarget = {
  stockItemId: string;
  warehouseId: string;
  warehouseName: string;
  itemName: string;
  unitCode?: string | null;
  reserved: number;
};

type Props = {
  open: boolean;
  productType: ProductCatalogProductType;
  target: InventoryReservationTarget | null;
  onClose: () => void;
};

const formatQuantity = (value: number, unitCode?: string | null) => {
  const quantity = new Intl.NumberFormat("es-PE", {
    maximumFractionDigits: 3,
  }).format(Number(value ?? 0));
  return unitCode?.trim() ? `${quantity} ${unitCode.trim()}` : quantity;
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const sourceLabel = (item: InventoryReservationDetail) =>
  item.sourceType === "PRODUCTION_ORDER" ? "Produccion" : "Pedido";

export function InventoryReservationsModal({
  open,
  productType,
  target,
  onClose,
}: Props) {
  const [data, setData] = useState<InventoryReservationDetailsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);

  const loadReservations = useCallback(async () => {
    if (!target) return;
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setLoading(true);
    setError(null);

    try {
      const response = await getInventoryReservationDetails({
        stockItemId: target.stockItemId,
        warehouseId: target.warehouseId,
        productType,
      });
      if (requestRef.current !== requestId) return;
      setData(response);
    } catch (requestError) {
      if (requestRef.current !== requestId) return;
      setData(null);
      setError(
        getApiErrorMessage(
          requestError,
          "No se pudo cargar el detalle de las reservas.",
        ),
      );
    } finally {
      if (requestRef.current === requestId) setLoading(false);
    }
  }, [productType, target]);

  useEffect(() => {
    if (!open || !target) return;
    void loadReservations();
  }, [loadReservations, open, target]);

  const close = () => {
    requestRef.current += 1;
    setData(null);
    setError(null);
    setLoading(false);
    onClose();
  };

  const inventoryReserved = data?.inventoryReserved ?? target?.reserved ?? 0;
  const attributedReserved = data?.attributedReserved ?? 0;
  const difference = data?.difference ?? 0;
  const sourceDescription =
    productType === "MATERIAL"
      ? "Ordenes de produccion que mantienen reservada esta materia prima."
      : "Pedidos que mantienen reservada esta existencia.";

  return (
    <Modal
      open={open}
      onClose={close}
      title="Detalle de reservas"
      description={
        target
          ? `${target.itemName} · ${target.warehouseName}. ${sourceDescription}`
          : sourceDescription
      }
      className="w-[920px]"
      bodyClassName="p-0"
      footer={
        <div className="flex justify-end">
          <button
            type="button"
            onClick={close}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Cerrar
          </button>
        </div>
      }
    >
      <div className="space-y-4 p-4 sm:p-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-xs font-medium text-muted-foreground">Reservado en inventario</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
              {formatQuantity(inventoryReserved, target?.unitCode)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-xs font-medium text-muted-foreground">Identificado en el detalle</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
              {formatQuantity(attributedReserved, target?.unitCode)}
            </p>
          </div>
        </div>

        {loading ? (
          <div
            className="flex min-h-52 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border text-sm text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
            Cargando reservas...
          </div>
        ) : null}

        {!loading && error ? (
          <div
            className="flex min-h-52 flex-col items-center justify-center gap-3 rounded-xl border border-red-200 bg-red-50 p-5 text-center"
            role="alert"
          >
            <AlertTriangle className="h-6 w-6 text-red-700" aria-hidden="true" />
            <p className="max-w-md text-sm text-red-800">{error}</p>
            <button
              type="button"
              onClick={() => void loadReservations()}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-red-300 bg-white px-4 text-sm font-medium text-red-800 transition-colors hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Reintentar
            </button>
          </div>
        ) : null}

        {!loading && !error && data && data.items.length === 0 ? (
          <div className="flex min-h-52 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border p-5 text-center">
            <PackageCheck className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm font-medium text-foreground">No se encontraron reservas activas.</p>
            <p className="max-w-md text-xs text-muted-foreground">
              El saldo puede corresponder a información anterior o a una reserva pendiente de sincronizar.
            </p>
          </div>
        ) : null}

        {!loading && !error && data && data.items.length > 0 ? (
          <>
            <div className="hidden overflow-hidden rounded-xl border border-border md:block">
              <div className="max-h-[430px] overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-muted text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-3 font-medium">Origen</th>
                      <th className="px-3 py-3 font-medium">Documento</th>
                      <th className="px-3 py-3 font-medium">Cliente / referencia</th>
                      <th className="px-3 py-3 font-medium">Estado</th>
                      <th className="px-3 py-3 font-medium">Fecha prevista</th>
                      <th className="px-3 py-3 text-right font-medium">Cantidad</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.items.map((item) => (
                      <tr key={`${item.sourceType}:${item.sourceId}`} className="bg-background">
                        <td className="px-3 py-3 text-muted-foreground">{sourceLabel(item)}</td>
                        <td className="px-3 py-3 font-semibold text-foreground">{item.documentNumber}</td>
                        <td className="max-w-64 px-3 py-3 text-foreground">
                          <span className="line-clamp-2">{item.subjectName ?? "-"}</span>
                        </td>
                        <td className="px-3 py-3">
                          <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900">
                            {item.statusName}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">{formatDate(item.plannedDate)}</td>
                        <td className="px-3 py-3 text-right font-semibold tabular-nums text-foreground">
                          {formatQuantity(item.quantity, target?.unitCode)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-3 md:hidden">
              {data.items.map((item) => (
                <article
                  key={`${item.sourceType}:${item.sourceId}`}
                  className="rounded-xl border border-border bg-background p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">{sourceLabel(item)}</p>
                      <p className="mt-1 font-semibold text-foreground">{item.documentNumber}</p>
                    </div>
                    <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900">
                      {item.statusName}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-foreground">{item.subjectName ?? "Sin referencia"}</p>
                  <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarDays className="h-4 w-4" aria-hidden="true" />
                      {formatDate(item.plannedDate)}
                    </span>
                    <span className="font-semibold tabular-nums text-foreground">
                      {formatQuantity(item.quantity, target?.unitCode)}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : null}

        {!loading && !error && data && difference !== 0 ? (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" role="status">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>
              {difference > 0
                ? `${formatQuantity(difference, target?.unitCode)} del saldo reservado no pudo asociarse a un origen activo.`
                : `El detalle supera el saldo de inventario por ${formatQuantity(Math.abs(difference), target?.unitCode)}.`}
            </p>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
