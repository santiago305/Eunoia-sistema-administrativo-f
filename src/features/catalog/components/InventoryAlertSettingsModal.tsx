import { useEffect, useState } from "react";
import { Activity, Building2, Loader2, Save, ShieldAlert } from "lucide-react";
import { Modal } from "@/shared/components/modales/Modal";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { useFeedbackToast } from "@/shared/hooks/useFeedbackToast";
import { errorResponse, successResponse } from "@/shared/common/utils/response";
import { getInventoryAlertSetting, updateInventoryAlertSetting } from "@/shared/services/inventoryService";
import type { InventoryAlertEvaluation } from "@/features/catalog/types/inventoryAlertSettings";

type Props = { open: boolean; onClose: () => void; stockItemId: string | null; stockItemLabel: string;
  warehouseId?: string | null; warehouseLabel?: string | null; onSaved?: () => void; canConfigure: boolean };
type FormState = { alertEnabled: boolean; historyDays: string; coverageDays: string };
const DEFAULT_FORM: FormState = { alertEnabled: true, historyDays: "3", coverageDays: "3" };

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md bg-zinc-50 px-3 py-2"><p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{label}</p>
    <p className="mt-1 text-sm font-semibold tabular-nums text-zinc-900">{value}</p></div>;
}

const ALERT_COPY = {
  NORMAL: { label: "Stock suficiente", message: "El stock cubre el periodo configurado o aun no existe consumo.", className: "bg-emerald-50 text-emerald-700" },
  PREVENTIVE: { label: "Cobertura exacta", message: "El stock alcanza exactamente para el periodo configurado.", className: "bg-sky-50 text-sky-700" },
  WARNING: { label: "Reposicion necesaria", message: "El stock no cubre todos los dias configurados. Programa una reposicion.", className: "bg-amber-50 text-amber-800" },
  URGENT: { label: "Reposicion urgente", message: "Queda aproximadamente un dia o menos de cobertura.", className: "bg-orange-50 text-orange-800" },
  CRITICAL: { label: "Sin stock", message: "No existe stock disponible. Repone este item con urgencia.", className: "bg-red-50 text-red-700" },
} as const;

export function InventoryAlertSettingsModal({ open, onClose, stockItemId, stockItemLabel, warehouseId,
  warehouseLabel, onSaved, canConfigure }: Props) {
  const { showFeedback } = useFeedbackToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [evaluation, setEvaluation] = useState<InventoryAlertEvaluation>();

  useEffect(() => {
    if (!open || !stockItemId) return;
    let active = true;
    setLoading(true); setSaving(false); setForm(DEFAULT_FORM); setEvaluation(undefined);
    void getInventoryAlertSetting(stockItemId, { warehouseId: warehouseId ?? undefined })
      .then((setting) => { if (!active) return; setForm({ alertEnabled: setting.alertEnabled,
        historyDays: String(setting.historyDays), coverageDays: String(setting.coverageDays) }); setEvaluation(setting.evaluation); })
      .catch(() => active && showFeedback(errorResponse("No se pudo cargar la configuracion predictiva")))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [open, showFeedback, stockItemId, warehouseId]);

  const close = () => { if (!saving) onClose(); };
  const save = async () => {
    if (!stockItemId) return;
    const historyDays = Number(form.historyDays); const coverageDays = Number(form.coverageDays);
    if (!Number.isInteger(historyDays) || historyDays <= 0 || !Number.isInteger(coverageDays) || coverageDays <= 0) {
      showFeedback(errorResponse("Los dias historicos y de cobertura deben ser enteros mayores a 0")); return;
    }
    setSaving(true);
    try {
      await updateInventoryAlertSetting(stockItemId, { warehouseId: warehouseId ?? null, historyDays, coverageDays, alertEnabled: form.alertEnabled });
      showFeedback(successResponse("Configuracion predictiva guardada para todos los items de este tipo")); onSaved?.(); onClose();
    } catch { showFeedback(errorResponse("No se pudo guardar la configuracion predictiva")); } finally { setSaving(false); }
  };

  return <Modal open={open} onClose={close} title="Configurar alertas predictivas"
    description="Define el historial y la cobertura para todos los items del mismo tipo."
    className="w-[min(44rem,calc(100vw-2rem))]" bodyClassName="p-0"
    footer={<div className="flex items-center justify-end gap-2"><SystemButton variant="outline" size="sm" onClick={close} disabled={saving}>Cancelar</SystemButton>
      <SystemButton variant="primary" size="sm" loading={saving} onClick={save} disabled={!canConfigure || loading || !stockItemId}
        leftIcon={<Save className="h-4 w-4" />}>Guardar</SystemButton></div>}>
    <div className="space-y-4 p-4">
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4"><div className="flex items-start gap-3">
        <div className="rounded-full bg-amber-100 p-2 text-amber-700"><ShieldAlert className="h-4 w-4" /></div><div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-900">{stockItemLabel}</p><p className="mt-1 inline-flex items-center gap-1 text-xs text-zinc-500">
            <Building2 className="h-3.5 w-3.5" />{warehouseLabel ?? "Todos los almacenes"}</p>
          <p className="mt-2 text-xs leading-5 text-zinc-500">La regla es general para productos o materias primas. El domingo no cuenta como dia laborable.</p>
        </div></div></div>
      {loading ? <div className="flex h-56 items-center justify-center gap-2 text-sm text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" />Cargando configuracion...</div> :
        <div className="space-y-4">
          <label className="flex items-start gap-3 rounded-lg border border-zinc-200 px-4 py-3"><input type="checkbox" checked={form.alertEnabled}
            onChange={(event) => setForm((current) => ({ ...current, alertEnabled: event.target.checked }))}
            className="mt-1 h-4 w-4 rounded border-zinc-300 text-primary focus:ring-primary" disabled={!canConfigure} />
            <span><span className="block text-sm font-medium text-zinc-900">Alertas activas</span><span className="mt-1 block text-xs text-zinc-500">Activa la evaluacion predictiva para este tipo de inventario.</span></span></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5"><span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Dias historicos</span>
              <input type="number" min={1} step={1} value={form.historyDays} onChange={(event) => setForm((c) => ({ ...c, historyDays: event.target.value }))}
                className="h-11 w-full rounded-lg border border-zinc-200 px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" disabled={!canConfigure} />
              <span className="block text-xs text-zinc-500">Promedia los ultimos dias laborables; los dias sin consumo cuentan como cero.</span></label>
            <label className="space-y-1.5"><span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Dias de cobertura</span>
              <input type="number" min={1} step={1} value={form.coverageDays} onChange={(event) => setForm((c) => ({ ...c, coverageDays: event.target.value }))}
                className="h-11 w-full rounded-lg border border-zinc-200 px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" disabled={!canConfigure} />
              <span className="block text-xs text-zinc-500">Dias futuros que el stock disponible debe soportar.</span></label>
          </div>
          {evaluation ? <section className="rounded-lg border border-zinc-200 p-4" aria-live="polite">
            <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2 text-sm font-semibold text-zinc-900"><Activity className="h-4 w-4 text-primary" />Simulacion actual</div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ALERT_COPY[evaluation.level].className}`}>{ALERT_COPY[evaluation.level].label}</span></div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4"><Metric label="Promedio diario" value={evaluation.averageDailyConsumption.toFixed(2)} />
              <Metric label="Stock disponible" value={evaluation.availableStock.toFixed(2)} /><Metric label="Stock requerido" value={evaluation.requiredStock.toFixed(2)} />
              <Metric label="Cobertura" value={evaluation.coverageDays === null ? "Sin consumo" : `${evaluation.coverageDays.toFixed(1)} dias`} /></div>
            <p className="mt-3 text-xs leading-5 text-zinc-600">{ALERT_COPY[evaluation.level].message}{evaluation.shortage > 0 ? ` Faltan ${evaluation.shortage.toFixed(2)} unidades para completar la cobertura.` : ""}</p>
          </section> : null}
        </div>}
    </div>
  </Modal>;
}
