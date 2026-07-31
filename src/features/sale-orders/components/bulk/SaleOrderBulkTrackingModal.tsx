import { useState } from "react";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { SystemButton } from "@/shared/components/components/SystemButton";

type Props = { open: boolean; selectedCount: number; canUpdatePreguide: boolean; canUpdatePrepared: boolean; onClose: () => void; onSubmit: (payload: { preguide?: boolean; prepared?: boolean }) => Promise<void> };
export function SaleOrderBulkTrackingModal({ open, selectedCount, canUpdatePreguide, canUpdatePrepared, onClose, onSubmit }: Props) {
  const [applyPreguide, setApplyPreguide] = useState(false); const [preguide, setPreguide] = useState(false);
  const [applyPrepared, setApplyPrepared] = useState(false); const [prepared, setPrepared] = useState(false); const [loading, setLoading] = useState(false);
  if (!open) return null;
  const submit = async () => { const payload = { ...(applyPreguide ? { preguide } : {}), ...(applyPrepared ? { prepared } : {}) }; if (!Object.keys(payload).length) return; setLoading(true); try { await onSubmit(payload); onClose(); } finally { setLoading(false); } };
  return <div role="dialog" aria-label="Actualizar seguimiento" className="fixed inset-0 z-50 grid place-items-center bg-black/30"><div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl"><h2 className="text-base font-semibold">Actualizar seguimiento</h2><p className="mt-1 text-sm text-zinc-600">Se modificarán {selectedCount} pedido(s).</p>{canUpdatePreguide ? <label className="mt-4 flex items-center gap-2 text-sm"><Checkbox checked={applyPreguide} onCheckedChange={(v) => setApplyPreguide(v === true)} />Aplicar cambio de preguía <Checkbox checked={preguide} disabled={!applyPreguide} onCheckedChange={(v) => setPreguide(v === true)} />Tiene preguía</label> : null}{canUpdatePrepared ? <label className="mt-3 flex items-center gap-2 text-sm"><Checkbox checked={applyPrepared} onCheckedChange={(v) => setApplyPrepared(v === true)} />Aplicar cambio de preparación <Checkbox checked={prepared} disabled={!applyPrepared} onCheckedChange={(v) => setPrepared(v === true)} />Está preparado</label> : null}<div className="mt-5 flex justify-end gap-2"><SystemButton variant="ghost" onClick={onClose}>Cancelar</SystemButton><SystemButton disabled={loading || (!applyPreguide && !applyPrepared)} onClick={() => void submit()}>Confirmar</SystemButton></div></div></div>;
}
