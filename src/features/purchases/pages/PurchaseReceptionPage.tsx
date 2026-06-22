import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, PackageCheck, RefreshCw } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { PageShell } from "@/shared/layouts/PageShell";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { parseApiError } from "@/shared/common/utils/handleApiError";
import { useFeedbackToast } from "@/shared/hooks/useFeedbackToast";
import { errorResponse, successResponse } from "@/shared/common/utils/response";
import { getById } from "@/shared/services/purchaseService";
import {
  createPurchaseReception,
  listPurchaseReceptions,
} from "@/shared/services/purchaseReceptionService";
import type { PurchaseOrderDetailOutput } from "@/features/purchases/types/itemPurchaseEdit";
import type { PurchaseReception } from "@/features/purchases/types/purchase-reception.types";
import { purchaseTypeLabels, ReceptionStatuses } from "@/features/purchases/types/purchase-classification.types";
import {
  PurchaseReceptionTable,
  type ReceptionLineState,
} from "@/features/purchases/components/reception/PurchaseReceptionTable";
import { PurchaseReceptionEvidenceUploader } from "@/features/purchases/components/reception/PurchaseReceptionEvidenceUploader";
import { RoutesPaths } from "@/routes/config/routesPaths";

const sumReceivedByItem = (receptions: PurchaseReception[]) => {
  const map = new Map<string, number>();
  receptions
    .filter((reception) => reception.status === "CONFIRMED")
    .flatMap((reception) => reception.items)
    .forEach((item) => {
      map.set(item.purchaseItemId, (map.get(item.purchaseItemId) ?? 0) + Number(item.receivedQuantity ?? 0));
    });
  return map;
};

export default function PurchaseReceptionPage() {
  const { poId } = useParams<{ poId: string }>();
  const navigate = useNavigate();
  const { showFeedback } = useFeedbackToast();
  const [detail, setDetail] = useState<PurchaseOrderDetailOutput | null>(null);
  const [receptions, setReceptions] = useState<PurchaseReception[]>([]);
  const [lines, setLines] = useState<ReceptionLineState[]>([]);
  const [note, setNote] = useState("");
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!poId) return;
    setLoading(true);
    try {
      const [purchaseDetail, purchaseReceptions] = await Promise.all([
        getById(poId),
        listPurchaseReceptions(poId),
      ]);
      setDetail(purchaseDetail);
      setReceptions(purchaseReceptions);

      const receivedMap = sumReceivedByItem(purchaseReceptions);
      setLines(
        (purchaseDetail.items ?? [])
          .filter((item) => item.poItemId)
          .map((item) => {
            const ordered = Number(item.quantity ?? 0);
            const alreadyReceived = receivedMap.get(item.poItemId!) ?? 0;
            const pendingQuantity = Math.max(0, ordered - alreadyReceived);
            return {
              purchaseItemId: item.poItemId!,
              pendingQuantity,
              receivedQuantity: pendingQuantity,
              acceptedQuantity: pendingQuantity,
              rejectedQuantity: 0,
              note: "",
            };
          }),
      );
    } catch (error) {
      showFeedback(errorResponse(parseApiError(error, "No se pudo cargar la recepción de compra.")));
    } finally {
      setLoading(false);
    }
  }, [poId, showFeedback]);

  useEffect(() => {
    void load();
  }, [load]);

  const headerCode = useMemo(() => {
    if (!detail) return "Compra";
    return [detail.serie, detail.correlative].filter(Boolean).join("-") || detail.poId?.slice(0, 8) || "Compra";
  }, [detail]);

  const pendingLines = useMemo(
    () => lines.filter((line) => line.pendingQuantity > 0 && line.receivedQuantity > 0),
    [lines],
  );

  const updateLine = useCallback((purchaseItemId: string, patch: Partial<ReceptionLineState>) => {
    setLines((current) =>
      current.map((line) => {
        if (line.purchaseItemId !== purchaseItemId) return line;
        const receivedQuantity = Math.min(patch.receivedQuantity ?? line.receivedQuantity, line.pendingQuantity);
        const acceptedQuantity = Math.min(patch.acceptedQuantity ?? line.acceptedQuantity, receivedQuantity);
        return {
          ...line,
          ...patch,
          receivedQuantity,
          acceptedQuantity,
          rejectedQuantity: Math.max(0, receivedQuantity - acceptedQuantity),
        };
      }),
    );
  }, []);

  const submit = useCallback(async () => {
    if (!detail?.poId) return;
    if (!pendingLines.length) {
      showFeedback(errorResponse("No hay cantidades pendientes para recibir."));
      return;
    }
    setSaving(true);
    try {
      const response = await createPurchaseReception({
        purchaseId: detail.poId,
        warehouseId: detail.warehouseId,
        note,
        evidenceUrls,
        confirmNow: true,
        items: pendingLines.map((line) => ({
          purchaseItemId: line.purchaseItemId,
          receivedQuantity: line.receivedQuantity,
          acceptedQuantity: line.acceptedQuantity,
          rejectedQuantity: Math.max(0, line.receivedQuantity - line.acceptedQuantity),
          note: line.note || undefined,
        })),
      });
      if (response.type === "success") {
        showFeedback(successResponse(response.message));
        setNote("");
        setEvidenceUrls([]);
        await load();
        return;
      }
      showFeedback(errorResponse(response.message));
    } catch (error) {
      showFeedback(errorResponse(parseApiError(error, "No se pudo confirmar la recepción.")));
    } finally {
      setSaving(false);
    }
  }, [detail, evidenceUrls, load, note, pendingLines, showFeedback]);

  const statusLabel = detail?.receptionStatus === ReceptionStatuses.RECEIVED
    ? "Recibida"
    : detail?.receptionStatus === ReceptionStatuses.PARTIALLY_RECEIVED
      ? "Recepción parcial"
      : "Pendiente";

  return (
    <PageShell className="bg-white">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 border-b border-black/10 pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <button
              type="button"
              onClick={() => navigate(RoutesPaths.purchases)}
              className="mb-2 inline-flex h-9 items-center gap-2 rounded-sm px-2 text-xs text-black/60 hover:bg-black/[0.04]"
            >
              <ArrowLeft className="h-4 w-4" />
              Compras
            </button>
            <h1 className="text-xl font-semibold text-black">Recepción {headerCode}</h1>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-black/60">
              <span>{detail?.purchaseType ? purchaseTypeLabels[detail.purchaseType] : "Compra"}</span>
              <span>{statusLabel}</span>
              <span>{detail?.warehouseId ? "Almacén asignado" : "Sin almacén"}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <SystemButton variant="outline" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={load} disabled={loading}>
              Actualizar
            </SystemButton>
            <SystemButton leftIcon={<CheckCircle2 className="h-4 w-4" />} onClick={submit} disabled={saving || loading}>
              {saving ? "Confirmando..." : "Confirmar"}
            </SystemButton>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <div className="rounded-sm border border-black/10 bg-black/[0.02] p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-black">
                <PackageCheck className="h-4 w-4 text-black/60" />
                Items a recibir
              </div>
              <p className="mt-1 text-xs text-black/55">
                Registra cantidades parciales o totales. Los items sin stock se confirmarán sin movimiento de inventario.
              </p>
            </div>
            <PurchaseReceptionTable
              items={detail?.items ?? []}
              lines={lines}
              onLineChange={updateLine}
            />
          </div>

          <aside className="space-y-4">
            <div className="rounded-sm border border-black/10 bg-white p-3">
              <label className="text-xs font-semibold text-black">Nota de recepción</label>
              <textarea
                className="mt-2 min-h-24 w-full rounded-sm border border-black/10 px-3 py-2 text-xs outline-none focus:border-black/30"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Observación general"
              />
            </div>
            <PurchaseReceptionEvidenceUploader value={evidenceUrls} onChange={setEvidenceUrls} />
            <div className="rounded-sm border border-black/10 bg-white p-3">
              <p className="text-xs font-semibold text-black">Recepciones previas</p>
              <div className="mt-2 space-y-2">
                {receptions.length ? receptions.map((reception) => (
                  <div key={reception.receptionId} className="rounded-sm bg-black/[0.02] p-2 text-[11px] text-black/65">
                    <div className="flex items-center justify-between">
                      <span>{reception.status}</span>
                      <span>{reception.receivedAt ? new Date(reception.receivedAt).toLocaleDateString() : "Sin confirmar"}</span>
                    </div>
                    <p className="mt-1">{reception.items.length} items</p>
                  </div>
                )) : (
                  <p className="text-xs text-black/50">Sin recepciones registradas.</p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </PageShell>
  );
}
