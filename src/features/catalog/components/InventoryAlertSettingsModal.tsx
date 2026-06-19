import { useEffect, useMemo, useState } from "react";
import { Building2, Loader2, Save, ShieldAlert } from "lucide-react";
import { Modal } from "@/shared/components/modales/Modal";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { useFeedbackToast } from "@/shared/hooks/useFeedbackToast";
import { errorResponse, successResponse } from "@/shared/common/utils/response";
import {
  getInventoryAlertSetting,
  updateInventoryAlertSetting,
} from "@/shared/services/inventoryService";

type InventoryAlertSettingsModalProps = {
  open: boolean;
  onClose: () => void;
  stockItemId: string | null;
  stockItemLabel: string;
  warehouseId?: string | null;
  warehouseLabel?: string | null;
  onSaved?: () => void;
  canConfigure: boolean;
};

type FormState = {
  alertEnabled: boolean;
  minStockAlertQty: string;
  alertThresholdDays: string;
  useWarehouseScope: boolean;
};

const DEFAULT_FORM: FormState = {
  alertEnabled: true,
  minStockAlertQty: "",
  alertThresholdDays: "3",
  useWarehouseScope: true,
};

export function InventoryAlertSettingsModal({
  open,
  onClose,
  stockItemId,
  stockItemLabel,
  warehouseId,
  warehouseLabel,
  onSaved,
  canConfigure,
}: InventoryAlertSettingsModalProps) {
  const { showFeedback } = useFeedbackToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [serverScopeLabel, setServerScopeLabel] = useState<string>("global");

  const modalTitle = useMemo(() => "Configurar alertas de inventario", []);

  useEffect(() => {
    if (!open || !stockItemId) return;

    let active = true;
    setLoading(true);
    setSaving(false);
    setForm({
      ...DEFAULT_FORM,
      useWarehouseScope: Boolean(warehouseId),
    });

    void getInventoryAlertSetting(stockItemId, { warehouseId: warehouseId ?? undefined })
      .then((setting) => {
        if (!active) return;
        setForm({
          alertEnabled: Boolean(setting.alertEnabled),
          minStockAlertQty:
            setting.minStockAlertQty === null || setting.minStockAlertQty === undefined
              ? ""
              : String(setting.minStockAlertQty),
          alertThresholdDays: String(setting.alertThresholdDays ?? 3),
          useWarehouseScope: Boolean(warehouseId),
        });
        setServerScopeLabel(setting.warehouseId ? "almacén" : "global");
      })
      .catch(() => {
        if (!active) return;
        showFeedback(errorResponse("No se pudo cargar la configuracion de alertas"));
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open, showFeedback, stockItemId, warehouseId]);

  const close = () => {
    if (saving) return;
    onClose();
  };

  const save = async () => {
    if (!stockItemId) return;

    const threshold = Number(form.alertThresholdDays);
    if (!Number.isFinite(threshold) || threshold <= 0) {
      showFeedback(errorResponse("El umbral de dias debe ser mayor a 0"));
      return;
    }

    const minStockAlertQty =
      form.minStockAlertQty.trim() === ""
        ? null
        : Number(form.minStockAlertQty);

    if (minStockAlertQty !== null && (!Number.isFinite(minStockAlertQty) || minStockAlertQty < 0)) {
      showFeedback(errorResponse("El stock minimo debe ser 0 o mayor"));
      return;
    }

    setSaving(true);
    try {
      await updateInventoryAlertSetting(stockItemId, {
        warehouseId: form.useWarehouseScope ? (warehouseId ?? null) : null,
        minStockAlertQty,
        alertThresholdDays: threshold,
        alertEnabled: form.alertEnabled,
      });
      showFeedback(successResponse("Configuracion de alertas guardada"));
      onSaved?.();
      onClose();
    } catch {
      showFeedback(errorResponse("No se pudo guardar la configuracion de alertas"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={modalTitle}
      description="Define umbrales por stock item y, si lo necesitas, sobrescribe la configuración global para este almacén."
      className="w-[min(42rem,calc(100vw-2rem))]"
      bodyClassName="p-0"
      footer={
        <div className="flex items-center justify-end gap-2">
          <SystemButton variant="outline" size="sm" onClick={close} disabled={saving}>
            Cancelar
          </SystemButton>
          <SystemButton
            variant="primary"
            size="sm"
            loading={saving}
            onClick={save}
            disabled={!canConfigure || loading || !stockItemId}
            leftIcon={<Save className="h-4 w-4" />}
          >
            Guardar
          </SystemButton>
        </div>
      }
    >
      <div className="space-y-4 p-4">
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-full bg-amber-100 p-2 text-amber-700">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-900">{stockItemLabel}</p>
              <p className="mt-1 text-xs text-zinc-500">
                {warehouseLabel ? (
                  <span className="inline-flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5" />
                    {warehouseLabel}
                  </span>
                ) : (
                  "Configuración global"
                )}
              </p>
              <p className="mt-2 text-xs leading-5 text-zinc-500">
                La configuración guardada actualmente viene de la capa {serverScopeLabel}. Si activas el uso por almacén,
                esta regla sobrescribe la global para este stock item.
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center gap-2 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando configuracion...
          </div>
        ) : (
          <div className="space-y-4">
            <label className="flex items-start gap-3 rounded-lg border border-zinc-200 px-4 py-3">
              <input
                type="checkbox"
                checked={form.alertEnabled}
                onChange={(event) =>
                  setForm((current) => ({ ...current, alertEnabled: event.target.checked }))
                }
                className="mt-1 h-4 w-4 rounded border-zinc-300 text-primary focus:ring-primary"
                disabled={!canConfigure}
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-zinc-900">Alertas activas</span>
                <span className="mt-1 block text-xs leading-5 text-zinc-500">
                  Si está desactivado, la evaluación futura debe ignorar este stock item.
                </span>
              </span>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Stock minimo de alerta
                </span>
                <input
                  type="number"
                  min={0}
                  step="1"
                  value={form.minStockAlertQty}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, minStockAlertQty: event.target.value }))
                  }
                  placeholder="Opcional"
                  className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:bg-zinc-50"
                  disabled={!canConfigure}
                />
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Días de cobertura
                </span>
                <input
                  type="number"
                  min={1}
                  step="1"
                  value={form.alertThresholdDays}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, alertThresholdDays: event.target.value }))
                  }
                  className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:bg-zinc-50"
                  disabled={!canConfigure}
                />
              </label>
            </div>

            <label className="flex items-start gap-3 rounded-lg border border-zinc-200 px-4 py-3">
              <input
                type="checkbox"
                checked={form.useWarehouseScope}
                onChange={(event) =>
                  setForm((current) => ({ ...current, useWarehouseScope: event.target.checked }))
                }
                className="mt-1 h-4 w-4 rounded border-zinc-300 text-primary focus:ring-primary"
                disabled={!canConfigure || !warehouseId}
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-zinc-900">
                  Aplicar a este almacén
                </span>
                <span className="mt-1 block text-xs leading-5 text-zinc-500">
                  Si lo desactivas, la edición actualizará la regla global del stock item.
                </span>
              </span>
            </label>
          </div>
        )}
      </div>
    </Modal>
  );
}
