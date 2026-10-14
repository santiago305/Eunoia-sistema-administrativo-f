import { useEffect, useRef, useState } from "react";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { OperationImageGallery } from "@/shared/components/components/OperationImageGallery";
import {
  getIncomeEvidenceRevisionContent,
  getIncomeEvidenceRevisions,
  type IncomeEvidenceRevision,
} from "@/shared/services/incomeService";

type Props = { incomeId: string };

const formatDate = (value: string) => new Intl.DateTimeFormat("es-PE", {
  dateStyle: "medium",
  timeStyle: "short",
}).format(new Date(value));

const formatSize = (value: number) => value < 1024 * 1024
  ? `${Math.max(1, Math.round(value / 1024))} KB`
  : `${(value / (1024 * 1024)).toFixed(1)} MB`;

export function SaleOrderPaymentEvidenceHistory({ incomeId }: Props) {
  const [open, setOpen] = useState(false);
  const [revisions, setRevisions] = useState<IncomeEvidenceRevision[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<{ id: string; url: string } | null>(null);
  const objectUrls = useRef(new Set<string>());
  const active = useRef(true);
  const requestVersion = useRef(0);

  useEffect(() => {
    let active = true;
    setRevisions([]);
    setSelected(null);
    setLoadingId(null);
    setOpen(false);
    setError(false);
    setLoading(true);
    void getIncomeEvidenceRevisions(incomeId, 50)
      .then((items) => { if (active) setRevisions(items); })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [incomeId]);

  useEffect(() => {
    active.current = true;
    const urls = objectUrls.current;
    return () => {
      active.current = false;
      requestVersion.current += 1;
      if (typeof URL.revokeObjectURL === "function") {
        for (const url of urls) URL.revokeObjectURL(url);
      }
      urls.clear();
    };
  }, [incomeId]);

  const openRevision = async (revision: IncomeEvidenceRevision) => {
    if (loadingId) return;
    const request = ++requestVersion.current;
    setLoadingId(revision.attachmentId);
    try {
      if (selected) {
        if (typeof URL.revokeObjectURL === "function") URL.revokeObjectURL(selected.url);
        objectUrls.current.delete(selected.url);
        setSelected(null);
      }
      const url = await getIncomeEvidenceRevisionContent(incomeId, revision.attachmentId);
      if (!active.current || request !== requestVersion.current) {
        if (typeof URL.revokeObjectURL === "function") URL.revokeObjectURL(url);
        return;
      }
      objectUrls.current.add(url);
      setSelected({ id: revision.attachmentId, url });
    } catch {
      setError(true);
    } finally {
      setLoadingId(null);
    }
  };

  return <section className="mt-4 space-y-3 border-t border-border pt-4" aria-labelledby={`payment-evidence-history-${incomeId}`}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h2 id={`payment-evidence-history-${incomeId}`} className="text-sm font-semibold">Historial de evidencias</h2>
        <p className="text-xs text-muted-foreground">Consulta las versiones anteriores del comprobante.</p>
      </div>
      <button type="button" className="min-h-11 rounded-md border border-border px-3 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        {open ? "Ocultar historial" : `Ver historial${revisions.length ? ` (${revisions.length})` : ""}`}
      </button>
    </div>
    {open ? <div className="space-y-3" aria-live="polite">
      {loading ? <p className="rounded-md bg-muted/30 p-3 text-sm text-muted-foreground" role="status">Cargando revisiones…</p> : null}
      {error ? <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-destructive/30 p-3 text-sm" role="alert">
        <span>No se pudo cargar o abrir la evidencia. Verifica el acceso e inténtalo otra vez.</span>
        <SystemButton type="button" variant="ghost" onClick={() => {
          setError(false);
          setLoading(true);
          void getIncomeEvidenceRevisions(incomeId, 50).then(setRevisions).catch(() => setError(true)).finally(() => setLoading(false));
        }}>Reintentar</SystemButton>
      </div> : null}
      {!loading && !error && !revisions.length ? <p className="rounded-md bg-muted/30 p-3 text-sm text-muted-foreground">Este pago todavía no tiene historial de evidencias.</p> : null}
      {revisions.length ? <ul className="max-h-56 space-y-2 overflow-y-auto pr-1" aria-label="Versiones de evidencia del pago">
        {revisions.map((revision) => <li key={revision.attachmentId} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3">
          <div className="min-w-0 flex-1">
            <p className="break-all text-sm font-medium">{revision.originalName}</p>
            <p className="text-xs text-muted-foreground">{revision.isCurrent ? "Vigente" : "Anterior"} · {formatDate(revision.createdAt)} · {formatSize(revision.sizeBytes)}</p>
          </div>
          <SystemButton type="button" variant="outline" disabled={Boolean(loadingId)} aria-pressed={selected?.id === revision.attachmentId} onClick={() => void openRevision(revision)}>
            {loadingId === revision.attachmentId ? "Abriendo…" : selected?.id === revision.attachmentId ? "Mostrando" : "Ver evidencia"}
          </SystemButton>
        </li>)}
      </ul> : null}
      {selected ? <OperationImageGallery images={[selected.url]} altPrefix="Versión de evidencia del pago" emptyMessage="No se pudo mostrar esta versión." /> : null}
    </div> : null}
  </section>;
}
