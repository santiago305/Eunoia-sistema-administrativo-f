import * as Tabs from "@radix-ui/react-tabs";
import { ArrowLeft, Edit3, FileText, History, Package, Receipt, RefreshCw, ShieldCheck, Truck } from "lucide-react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { PageShell } from "@/shared/layouts/PageShell";
import { RoutesPaths } from "@/routes/config/routesPaths";
import { usePurchaseDetail } from "@/features/purchases/hooks/usePurchaseDetail";
import { usePurchasePayments } from "@/features/purchases/hooks/usePurchasePayments";
import { usePurchaseTimeline } from "@/features/purchases/hooks/usePurchaseTimeline";
import { PurchaseSummaryTab } from "@/features/purchases/components/detail/PurchaseSummaryTab";
import { PurchaseItemsTab } from "@/features/purchases/components/detail/PurchaseItemsTab";
import { PurchasePaymentsTab } from "@/features/purchases/components/detail/PurchasePaymentsTab";
import { PurchaseDocumentsTab } from "@/features/purchases/components/detail/PurchaseDocumentsTab";
import { PurchaseTimelineTab } from "@/features/purchases/components/detail/PurchaseTimelineTab";
import { getVisiblePurchaseDetailTabs, resolvePurchaseDetailTabFromPath, type PurchaseDetailTab } from "./purchaseDetailTabs";
import { usePermissions } from "@/shared/hooks/usePermissions";

const tabIcons: Record<PurchaseDetailTab, typeof Package> = {
  summary: Receipt,
  items: Package,
  reception: Truck,
  payments: FileText,
  documents: FileText,
  timeline: History,
  approvals: ShieldCheck,
};

const buildPath = (purchaseId: string, tab: PurchaseDetailTab) => {
  if (tab === "payments") return `/compras/${purchaseId}/pagos`;
  if (tab === "documents") return `/compras/${purchaseId}/documentos`;
  if (tab === "timeline") return `/compras/${purchaseId}/historial`;
  return `/compras/${purchaseId}`;
};

export default function PurchaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { can } = usePermissions();
  const purchaseId = id ?? "";
  const currentTab = resolvePurchaseDetailTabFromPath(location.pathname);
  const canViewHistory = can("purchases.view_history");
  const visibleTabs = getVisiblePurchaseDetailTabs(can);
  const activeTab = currentTab === "timeline" && !canViewHistory ? "summary" : currentTab;
  const { detail, loading, reload } = usePurchaseDetail(purchaseId);
  const { payments, loading: paymentsLoading } = usePurchasePayments(purchaseId);
  const { events, loading: timelineLoading } = usePurchaseTimeline(canViewHistory ? purchaseId : undefined);

  const code = detail ? [detail.serie, detail.correlative].filter(Boolean).join("-") || detail.poId || purchaseId : purchaseId;

  return (
    <PageShell className="bg-white" contentClassName="max-w-none">
      <div className="space-y-4">
        <header className="flex flex-col gap-3 border-b border-black/10 pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link to={RoutesPaths.purchases} className="mb-2 inline-flex min-h-9 items-center gap-2 rounded-sm px-2 text-xs text-black/60 hover:bg-black/[0.04]">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Compras
            </Link>
            <h1 className="text-xl font-semibold text-black">Compra {code || "-"}</h1>
            <p className="mt-1 text-sm text-black/60">{detail?.status ?? (loading ? "Cargando..." : "Detalle de compra")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void reload()} className="inline-flex min-h-10 items-center gap-2 rounded-sm border border-black/10 px-3 text-sm font-medium text-black hover:bg-black/[0.03]">
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Actualizar
            </button>
            {purchaseId ? (
              <Link to={`/compras/${purchaseId}/editar`} className="inline-flex min-h-10 items-center gap-2 rounded-sm bg-black px-3 text-sm font-medium text-white hover:bg-black/85">
                <Edit3 className="h-4 w-4" aria-hidden="true" />
                Editar
              </Link>
            ) : null}
          </div>
        </header>

        {loading ? (
          <div className="rounded-sm border border-black/10 bg-white p-4 text-sm text-black/50">Cargando compra...</div>
        ) : detail ? (
          <Tabs.Root value={activeTab} onValueChange={(value) => navigate(buildPath(purchaseId, value as PurchaseDetailTab))} className="space-y-4">
            <Tabs.List className="flex gap-1 overflow-x-auto border-b border-black/10" aria-label="Secciones de compra">
              {visibleTabs.map(({ value, label }) => {
                const Icon = tabIcons[value];
                return (
                <Tabs.Trigger key={value} value={value} className="inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 border-transparent px-3 text-sm font-medium text-black/55 data-[state=active]:border-black data-[state=active]:text-black">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                </Tabs.Trigger>
                );
              })}
            </Tabs.List>

            <Tabs.Content value="summary"><PurchaseSummaryTab detail={detail} /></Tabs.Content>
            <Tabs.Content value="items"><PurchaseItemsTab detail={detail} /></Tabs.Content>
            <Tabs.Content value="reception">
              <div className="rounded-sm border border-black/10 bg-white p-4">
                <p className="text-sm font-semibold text-black">Recepción</p>
                <p className="mt-1 text-sm text-black/60">Estado: {detail.receptionStatus ?? "Pendiente"}</p>
                <Link to={`/compras/${purchaseId}/recepcion`} className="mt-3 inline-flex min-h-10 items-center rounded-sm border border-black/10 px-3 text-sm font-medium text-black hover:bg-black/[0.03]">Abrir recepción</Link>
              </div>
            </Tabs.Content>
            <Tabs.Content value="payments"><PurchasePaymentsTab payments={payments} loading={paymentsLoading} /></Tabs.Content>
            <Tabs.Content value="documents"><PurchaseDocumentsTab purchaseId={purchaseId} payments={payments} legacyImages={detail.imageProdution ?? []} /></Tabs.Content>
            {canViewHistory ? (
              <Tabs.Content value="timeline"><PurchaseTimelineTab events={events} loading={timelineLoading} /></Tabs.Content>
            ) : null}
            <Tabs.Content value="approvals">
              <div className="rounded-sm border border-black/10 bg-white p-4 text-sm text-black/70">
                <p>Creación con pago: {detail.status}</p>
                <p className="mt-1">Procesamiento: {detail.paymentStatus ?? "Sin estado"}</p>
              </div>
            </Tabs.Content>
          </Tabs.Root>
        ) : (
          <div className="rounded-sm border border-black/10 bg-white p-4 text-sm text-black/50">No se pudo cargar la compra.</div>
        )}
      </div>
    </PageShell>
  );
}
