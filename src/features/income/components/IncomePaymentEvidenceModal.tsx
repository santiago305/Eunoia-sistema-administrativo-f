import { useEffect, useRef, useState } from "react";
import { SaleIncomeModal } from "@/shared/components/payments/SaleIncomeModal";
import { useSaleOrderPaymentOptions, filterSaleOrderBankAccountOptions } from "@/features/sale-orders/components/useSaleOrderPaymentOptions";
import { errorResponse } from "@/shared/common/utils/response";
import { useFeedbackToast } from "@/shared/hooks/useFeedbackToast";
import {
  getIncomeEvidence,
  getIncomeEvidenceContent,
  getIncomeEvidenceQuarantine,
  getIncomeEvidenceRevisionContent,
  getIncomeEvidenceRevisions,
  recoverIncomeEvidenceQuarantine,
  type IncomeEvidenceRevision,
  type QuarantinedIncomeEvidence,
} from "@/shared/services/incomeService";
import type { Income } from "../types/income.types";

type Props = {
  open: boolean;
  income: Income | null;
  canViewEvidence: boolean;
  canViewRevisionHistory?: boolean;
  canManageEvidenceQuarantine?: boolean;
  onClose: () => void;
};

const formatSize = (bytes: number) =>
  new Intl.NumberFormat("es-PE", { maximumFractionDigits: 1 }).format(bytes >= 1024 * 1024 ? bytes / (1024 * 1024) : bytes / 1024) +
  (bytes >= 1024 * 1024 ? " MB" : " KB");

const formatRevisionDate = (value: string) =>
  new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export function IncomePaymentEvidenceModal({
  open,
  income,
  canViewEvidence,
  canViewRevisionHistory = false,
  canManageEvidenceQuarantine = false,
  onClose,
}: Props) {
  const { methodOptions, bankAccountOptions } = useSaleOrderPaymentOptions({ enabled: open });
  const [evidenceUrl, setEvidenceUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [revisions, setRevisions] = useState<IncomeEvidenceRevision[]>([]);
  const [revisionsOpen, setRevisionsOpen] = useState(false);
  const [revisionsLoading, setRevisionsLoading] = useState(false);
  const [revisionsError, setRevisionsError] = useState(false);
  const [revisionLoadingId, setRevisionLoadingId] = useState<string | null>(null);
  const [selectedRevisionId, setSelectedRevisionId] = useState<string | null>(null);
  const [selectedRevisionUrl, setSelectedRevisionUrl] = useState<string | null>(null);
  const [refreshRevisions, setRefreshRevisions] = useState(0);
  const [refreshEvidence, setRefreshEvidence] = useState(0);
  const [quarantinedEvidence, setQuarantinedEvidence] = useState<QuarantinedIncomeEvidence[]>([]);
  const [quarantineOpen, setQuarantineOpen] = useState(false);
  const [quarantineLoading, setQuarantineLoading] = useState(false);
  const [quarantineError, setQuarantineError] = useState(false);
  const [quarantineRefresh, setQuarantineRefresh] = useState(0);
  const [recoveryReasons, setRecoveryReasons] = useState<Record<string, string>>({});
  const [recoveringOperationId, setRecoveringOperationId] = useState<string | null>(null);
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null);
  const objectUrls = useRef(new Set<string>());
  const { showFeedback } = useFeedbackToast();
  const incomeId = income?.incomeId;

  useEffect(() => {
    if (!open || !incomeId || !canViewEvidence) {
      setEvidenceUrl(null);
      setLoading(false);
      setSelectedRevisionId(null);
      setSelectedRevisionUrl(null);
      return;
    }
    let active = true;
    setEvidenceUrl(null);
    setSelectedRevisionId(null);
    setSelectedRevisionUrl(null);
    setLoading(true);
    void getIncomeEvidence(incomeId)
      .then((summary) => summary.available || summary.url ? getIncomeEvidenceContent(incomeId) : null)
      .then((url) => {
        if (active) {
          if (url) objectUrls.current.add(url);
          setEvidenceUrl(url);
        } else if (url && typeof URL.revokeObjectURL === "function") URL.revokeObjectURL(url);
      })
      .catch(() => { if (active) showFeedback(errorResponse("No se pudo cargar la evidencia del ingreso.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [canViewEvidence, incomeId, open, refreshEvidence, showFeedback]);

  useEffect(() => {
    if (!open || !incomeId || !canViewRevisionHistory) {
      setRevisions([]);
      setRevisionsLoading(false);
      setRevisionsError(false);
      setRevisionsOpen(false);
      setSelectedRevisionId(null);
      setSelectedRevisionUrl(null);
      return;
    }
    let active = true;
    setRevisionsLoading(true);
    setRevisionsError(false);
    void getIncomeEvidenceRevisions(incomeId, 50)
      .then((items) => { if (active) setRevisions(items); })
      .catch(() => { if (active) { setRevisionsError(true); showFeedback(errorResponse("No se pudo cargar el historial de evidencias.")); } })
      .finally(() => { if (active) setRevisionsLoading(false); });
    return () => { active = false; };
  }, [canViewRevisionHistory, incomeId, open, refreshRevisions, showFeedback]);

  useEffect(() => {
    if (!open || !incomeId || !canManageEvidenceQuarantine) {
      setQuarantinedEvidence([]);
      setQuarantineLoading(false);
      setQuarantineError(false);
      setQuarantineOpen(false);
      setRecoveryReasons({});
      setRecoveryMessage(null);
      return;
    }
    let active = true;
    setQuarantinedEvidence([]);
    setRecoveryReasons({});
    setRecoveryMessage(null);
    setQuarantineLoading(true);
    setQuarantineError(false);
    void getIncomeEvidenceQuarantine(incomeId)
      .then((items) => { if (active) setQuarantinedEvidence(items); })
      .catch(() => { if (active) setQuarantineError(true); })
      .finally(() => { if (active) setQuarantineLoading(false); });
    return () => { active = false; };
  }, [canManageEvidenceQuarantine, incomeId, open, quarantineRefresh]);

  useEffect(() => () => {
    if (typeof URL.revokeObjectURL === "function") {
      for (const url of objectUrls.current) URL.revokeObjectURL(url);
    }
    objectUrls.current.clear();
  }, [open, income?.incomeId]);

  const showRevision = async (revision: IncomeEvidenceRevision) => {
    if (!income || revisionLoadingId) return;
    setRevisionLoadingId(revision.attachmentId);
    try {
      const url = await getIncomeEvidenceRevisionContent(income.incomeId, revision.attachmentId);
      if (selectedRevisionUrl) {
        if (typeof URL.revokeObjectURL === "function") URL.revokeObjectURL(selectedRevisionUrl);
        objectUrls.current.delete(selectedRevisionUrl);
      }
      objectUrls.current.add(url);
      setSelectedRevisionUrl(url);
      setSelectedRevisionId(revision.attachmentId);
    } catch {
      showFeedback(errorResponse("No se pudo abrir esta revisión. Inténtalo nuevamente."));
    } finally {
      setRevisionLoadingId(null);
    }
  };

  const recoverEvidence = async (operation: QuarantinedIncomeEvidence) => {
    if (!incomeId || recoveringOperationId) return;
    const reason = recoveryReasons[operation.id]?.trim() ?? "";
    if (reason.length < 5 || reason.length > 500) {
      setRecoveryMessage("Escribe un motivo de entre 5 y 500 caracteres para recuperar la evidencia.");
      return;
    }
    setRecoveringOperationId(operation.id);
    setRecoveryMessage(null);
    try {
      await recoverIncomeEvidenceQuarantine(incomeId, operation.id, reason);
      setQuarantinedEvidence((items) => items.filter(({ id }) => id !== operation.id));
      setRecoveryReasons((reasons) => { const next = { ...reasons }; delete next[operation.id]; return next; });
      setRecoveryMessage("Evidencia recuperada y registrada en la auditoría.");
      setRefreshRevisions((value) => value + 1);
      setRefreshEvidence((value) => value + 1);
    } catch {
      setRecoveryMessage("No se pudo recuperar. El archivo permanece en cuarentena; revisa el motivo y reintenta o solicita una revisión técnica.");
    } finally {
      setRecoveringOperationId(null);
    }
  };

  const mode = income?.status === "CANCELLED" ? "view-cancelled"
    : income?.status === "REVERSED" ? "view-reversed"
      : income?.status === "POSTED" || income?.status === "PENDING_CONFIRMATION"
        ? "view-posted" : "view-unknown";

  const revisionHistory = canViewRevisionHistory ? (
    <section className="mt-4 space-y-3 border-t border-border pt-4" aria-labelledby="income-evidence-history-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="income-evidence-history-title" className="text-sm font-semibold">Historial de evidencias</h2>
          <p className="text-xs text-muted-foreground">Las revisiones anteriores se conservan y se pueden consultar.</p>
        </div>
        <button
          type="button"
          className="min-h-11 rounded-md border border-border px-3 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-expanded={revisionsOpen}
          aria-controls="income-evidence-revision-list"
          onClick={() => setRevisionsOpen((value) => !value)}
        >
          {revisionsOpen ? "Ocultar historial" : `Ver historial${revisions.length ? ` (${revisions.length})` : ""}`}
        </button>
      </div>
      {revisionsOpen ? <div id="income-evidence-revision-list" className="space-y-2" aria-live="polite">
        {revisionsLoading ? <p className="rounded-md bg-muted/30 p-3 text-sm text-muted-foreground" role="status">Cargando revisiones…</p> : null}
        {revisionsError ? <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-destructive/30 p-3 text-sm" role="alert">
          <span>No se pudo cargar el historial.</span>
          <button type="button" className="min-h-11 rounded-md px-3 font-medium underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50" onClick={() => setRefreshRevisions((value) => value + 1)}>Reintentar</button>
        </div> : null}
        {!revisionsLoading && !revisionsError && !revisions.length ? <p className="rounded-md bg-muted/30 p-3 text-sm text-muted-foreground">Este ingreso todavía no tiene revisiones de evidencia.</p> : null}
        {revisions.length ? <ul className="max-h-56 space-y-2 overflow-y-auto pr-1" aria-label="Revisiones de evidencia del ingreso">
          {revisions.map((revision) => <li key={revision.attachmentId} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3">
            <div className="min-w-0 flex-1">
              <p className="break-all text-sm font-medium">{revision.originalName}</p>
              <p className="text-xs text-muted-foreground">
                {revision.isCurrent ? "Vigente" : "Anterior"} · {formatRevisionDate(revision.createdAt)} · {formatSize(revision.sizeBytes)}
              </p>
            </div>
            <button
              type="button"
              className="min-h-11 shrink-0 rounded-md border border-border px-3 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-wait disabled:opacity-60"
              aria-pressed={selectedRevisionId === revision.attachmentId}
              disabled={Boolean(revisionLoadingId)}
              onClick={() => void showRevision(revision)}
            >
              {revisionLoadingId === revision.attachmentId ? "Abriendo…" : selectedRevisionId === revision.attachmentId ? "Mostrando" : "Ver evidencia"}
            </button>
          </li>)}
        </ul> : null}
      </div> : null}
    </section>
  ) : undefined;

  const quarantinePanel = canManageEvidenceQuarantine ? (
    <section className="mt-4 space-y-3 border-t border-border pt-4" aria-labelledby="income-evidence-quarantine-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="income-evidence-quarantine-title" className="text-sm font-semibold">Evidencias en revisión</h2>
          <p className="text-xs text-muted-foreground">Los archivos no afectan el ingreso hasta que se validen y recuperen.</p>
        </div>
        <button type="button" className="min-h-11 rounded-md border border-border px-3 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-expanded={quarantineOpen} aria-controls="income-evidence-quarantine-list" onClick={() => setQuarantineOpen((value) => !value)}>
          {quarantineOpen ? "Ocultar revisión" : `Ver revisión${quarantinedEvidence.length ? ` (${quarantinedEvidence.length})` : ""}`}
        </button>
      </div>
      {quarantineOpen ? <div id="income-evidence-quarantine-list" className="space-y-2" aria-live="polite">
        {quarantineLoading ? <p className="rounded-md bg-muted/30 p-3 text-sm text-muted-foreground" role="status">Cargando archivos en revisión…</p> : null}
        {quarantineError ? <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-destructive/30 p-3 text-sm" role="alert">
          <span>No se pudo consultar la cuarentena.</span>
          <button type="button" className="min-h-11 rounded-md px-3 font-medium underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50" onClick={() => setQuarantineRefresh((value) => value + 1)}>Reintentar</button>
        </div> : null}
        {!quarantineLoading && !quarantineError && !quarantinedEvidence.length ? <p className="rounded-md bg-muted/30 p-3 text-sm text-muted-foreground">No hay evidencias pendientes de revisión para este ingreso.</p> : null}
        {quarantinedEvidence.length ? <ul className="max-h-72 space-y-3 overflow-y-auto pr-1" aria-label="Evidencias de pago en cuarentena">
          {quarantinedEvidence.map((operation) => <li key={operation.id} className="space-y-3 rounded-md border border-border p-3">
            <div>
              <p className="break-all text-sm font-medium">{operation.originalName}</p>
              <p className="text-xs text-muted-foreground">{operation.fileAvailable ? "Archivo disponible para validación" : "Archivo no disponible"} · {formatSize(operation.sizeBytes)}</p>
              {operation.errorCode ? <p className="mt-1 break-all text-xs text-muted-foreground">Código: {operation.errorCode}</p> : null}
            </div>
            <label htmlFor={`quarantine-reason-${operation.id}`} className="block text-sm font-medium">Motivo de recuperación</label>
            <textarea id={`quarantine-reason-${operation.id}`} className="min-h-20 w-full rounded-md border border-border bg-background p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              minLength={5} maxLength={500} value={recoveryReasons[operation.id] ?? ""}
              onChange={(event) => setRecoveryReasons((reasons) => ({ ...reasons, [operation.id]: event.target.value }))}
              aria-describedby={`quarantine-help-${operation.id}`} />
            <p id={`quarantine-help-${operation.id}`} className="text-xs text-muted-foreground">La recuperación vuelve a validar integridad y estado del ingreso. No elimina el original en cuarentena.</p>
            <button type="button" className="min-h-11 rounded-md border border-primary px-3 text-sm font-medium text-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!operation.fileAvailable || Boolean(recoveringOperationId)} onClick={() => void recoverEvidence(operation)}>
              {recoveringOperationId === operation.id ? "Validando y recuperando…" : "Validar y recuperar evidencia"}
            </button>
          </li>)}
        </ul> : null}
        {recoveryMessage ? <p className="text-sm" role="status" aria-live="polite">{recoveryMessage}</p> : null}
      </div> : null}
    </section>
  ) : undefined;

  return <SaleIncomeModal open={open} mode={mode}
    values={income ? {
      id: income.incomeId, version: income.version, amount: income.amount, date: (income.paymentDate ?? income.date).slice(0, 10),
      paymentMethodId: income.paymentMethodId ?? "", companyPaymentAccountId: income.companyPaymentAccountId ?? "",
      operationNumber: income.operationNumber ?? "", note: income.detail ?? "", reason: "", status: income.status,
      currency: income.currency, postedAt: income.postedAt, postedByUserId: income.postedByUserId,
      accountingDate: income.accountingDate, voidedAt: income.voidedAt, voidedByUserId: income.voidedByUserId, voidReason: income.voidReason,
    } : null}
    description={income ? `${income.saleOrderNumber} · ${income.clientName}` : undefined}
    evidenceUrl={selectedRevisionUrl ?? evidenceUrl} evidenceLoading={loading} canViewEvidence={canViewEvidence} canUploadEvidence={false}
    methodOptions={methodOptions} bankAccountOptions={bankAccountOptions} getCompatibleAccounts={filterSaleOrderBankAccountOptions} extraContent={<>{revisionHistory}{quarantinePanel}</>} onClose={onClose} />;
}
