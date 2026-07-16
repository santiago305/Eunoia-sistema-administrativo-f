import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { CheckCircle2, Crown, Pencil, Plus, Power, Star, Trash2 } from "lucide-react";
import { isAxiosError } from "axios";
import { Modal } from "@/shared/components/modales/Modal";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { DataTable } from "@/shared/components/table/DataTable";
import type { DataTableColumn } from "@/shared/components/table/types";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { AlertModal } from "@/shared/components/components/AlertModal";
import { useFeedbackToast } from "@/shared/hooks/useFeedbackToast";
import { errorResponse, successResponse } from "@/shared/common/utils/response";
import type { Telephone } from "@/features/clients/types/telephone";
import {
  createClientTelephone,
  listClientTelephones,
  setTelephoneMain,
  updateTelephone,
  updateTelephoneActive,
} from "@/shared/services/clientService";

type Props = {
  clientId: string;
  close: () => void;
  className?: string;
};

type BackendErrorPayload = {
  message?: string | string[];
};

function extractErrorMessage(error: unknown, fallback: string) {
  if (!isAxiosError<BackendErrorPayload>(error)) return fallback;
  const message = error.response?.data?.message;
  if (Array.isArray(message)) return message.find(Boolean) ?? fallback;
  return message || fallback;
}

const PRIMARY = "hsl(var(--primary))";

export function ClientTelephonesModal({ clientId, close, className }: Props) {
  const { showFeedback, clearFeedback } = useFeedbackToast();

  const [rows, setRows] = useState<Telephone[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [number, setNumber] = useState("");
  const [isMain, setIsMain] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [pendingToggleId, setPendingToggleId] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);

  const pendingTogglePhone = useMemo(
    () => (pendingToggleId ? rows.find((row) => row.id === pendingToggleId) ?? null : null),
    [pendingToggleId, rows],
  );

  const canSubmit = Boolean(number.trim()) && !saving;
  const canUnsetMain = rows.length > 1;

  const loadTelephones = useCallback(
    async (silent = false) => {
      if (!silent) clearFeedback();
      setLoading(true);

      try {
        const data = await listClientTelephones(clientId);
        setRows(data ?? []);
      } catch (error: unknown) {
        setRows([]);
        if (!silent) {
          showFeedback(errorResponse(extractErrorMessage(error, "No se pudieron cargar los teléfonos.")));
        }
      } finally {
        setLoading(false);
      }
    },
    [clearFeedback, clientId, showFeedback],
  );

  useEffect(() => {
    void loadTelephones();
  }, [loadTelephones]);

  const resetForm = () => {
    setNumber("");
    setIsMain(false);
    setEditingId(null);
  };

  const submit = useCallback(async () => {
    if (!canSubmit) return;

    clearFeedback();
    setSaving(true);

    try {
      if (editingId) {
        const response = await updateTelephone(editingId, { number: number.trim(), isMain });
        showFeedback(successResponse(response.message || "Teléfono actualizado"));
      } else {
        const response = await createClientTelephone(clientId, { number: number.trim(), isMain });
        showFeedback(successResponse(response.message || "Teléfono creado"));
      }

      resetForm();
      await loadTelephones(true);
    } catch (error: unknown) {
      showFeedback(errorResponse(extractErrorMessage(error, "No se pudo guardar el teléfono.")));
    } finally {
      setSaving(false);
    }
  }, [canSubmit, clearFeedback, clientId, editingId, isMain, loadTelephones, number, showFeedback]);

  const confirmToggle = useCallback(async () => {
    if (!pendingToggleId || toggling) return;

    clearFeedback();
    setToggling(true);

    try {
      const current = pendingTogglePhone;
      const nextActive = !current?.isActive;
      const response = await updateTelephoneActive(pendingToggleId, { isActive: nextActive });
      showFeedback(successResponse(response.message || "Estado actualizado"));
      setPendingToggleId(null);
      await loadTelephones(true);
    } catch (error: unknown) {
      showFeedback(errorResponse(extractErrorMessage(error, "No se pudo actualizar el estado.")));
    } finally {
      setToggling(false);
    }
  }, [clearFeedback, loadTelephones, pendingToggleId, pendingTogglePhone, showFeedback, toggling]);

  const handleSetMain = useCallback(
    async (telephoneId: string) => {
      clearFeedback();
      try {
        const response = await setTelephoneMain(telephoneId);
        showFeedback(successResponse(response.message || "Teléfono principal actualizado"));
        await loadTelephones(true);
      } catch (error: unknown) {
        showFeedback(errorResponse(extractErrorMessage(error, "No se pudo marcar como principal.")));
      }
    },
    [clearFeedback, loadTelephones, showFeedback],
  );

  const columns = useMemo<DataTableColumn<Telephone>[]>(
    () => [
      {
        id: "number",
        header: "Número",
        cell: (row) => <span className="text-black/70">{row.number}</span>,
        className: "text-black/70",
      },
      {
        id: "main",
        header: "Principal",
        cell: (row) =>
          row.isMain ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-amber-700">
              <Crown className="h-3.5 w-3.5" /> Sí
            </span>
          ) : (
            <span className="text-[11px] text-slate-500">-</span>
          ),
        className: "text-center",
        headerClassName: "text-center [&>div]:justify-center",
        sortAccessor: (row) => row.isMain,
      },
      {
        id: "active",
        header: "Estado",
        cell: (row) => (
          <span
            className={[
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset",
              row.isActive
                ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                : "bg-rose-50 text-rose-700 ring-rose-200",
            ].join(" ")}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {row.isActive ? "Activo" : "Inactivo"}
          </span>
        ),
        className: "text-center",
        headerClassName: "text-center [&>div]:justify-center",
        sortAccessor: (row) => row.isActive,
      },
      {
        id: "actions",
        header: "Acciones",
        stopRowClick: true,
        cell: (row) => (
          <div className="flex justify-end gap-1">
            <SystemButton
              variant="outline"
              size="icon"
              className="h-9 w-9"
              title="Editar"
              onClick={() => {
                setEditingId(row.id);
                setNumber(row.number);
                setIsMain(row.isMain);
              }}
            >
              <Pencil className="h-4 w-4" />
            </SystemButton>

            <SystemButton
              variant="outline"
              size="icon"
              className="h-9 w-9"
              title="Hacer principal"
              onClick={() => void handleSetMain(row.id)}
              disabled={!row.isActive}
            >
              <Star className="h-4 w-4" />
            </SystemButton>

            <SystemButton
              variant="outline"
              size="icon"
              className="h-9 w-9"
              title={row.isActive ? "Desactivar" : "Reactivar"}
              onClick={() => setPendingToggleId(row.id)}
            >
              {row.isActive ? <Trash2 className="h-4 w-4" /> : <Power className="h-4 w-4" />}
            </SystemButton>
          </div>
        ),
        className: "text-right",
        headerClassName: "text-right [&>div]:justify-end",
        hideable: false,
        sortable: false,
      },
    ],
    [handleSetMain],
  );

  const primaryRing: CSSProperties = {
    "--tw-ring-color": `color-mix(in srgb, ${PRIMARY} 20%, transparent)`,
  } as CSSProperties;

  return (
    <Modal open={true} onClose={close} title="Teléfonos del cliente" className={className ?? "w-[640px] max-h-[640px]"}>
      <div className="space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[240px]">
            <FloatingInput
              label="Número"
              name="client-phone-number"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              className="h-10 text-xs"
              disabled={saving}
              style={primaryRing}
            />
          </div>

          <label className="inline-flex items-center gap-2 text-xs text-slate-700 select-none">
            <Checkbox
              checked={isMain}
              onCheckedChange={(checked) => setIsMain(Boolean(checked))}
              disabled={saving || (Boolean(editingId) && isMain && !canUnsetMain)}
            />
            Principal
          </label>

          <SystemButton
            size="sm"
            className="h-10"
            leftIcon={editingId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            disabled={!canSubmit}
            onClick={() => void submit()}
            style={{
              backgroundColor: PRIMARY,
              borderColor: `color-mix(in srgb, ${PRIMARY} 20%, transparent)`,
            }}
          >
            {saving ? "Guardando..." : editingId ? "Actualizar" : "Agregar"}
          </SystemButton>

          {editingId ? (
            <SystemButton
              variant="outline"
              size="sm"
              className="h-10"
              onClick={resetForm}
              disabled={saving}
            >
              Cancelar
            </SystemButton>
          ) : null}
        </div>

        <DataTable
          tableId="client-telephones-table"
          data={rows}
          columns={columns}
          rowKey="id"
          loading={loading}
          emptyMessage="No hay teléfonos registrados."
          hoverable={false}
          animated={false}
          tableClassName="text-[10px]"
        />
      </div>

      <AlertModal
        open={Boolean(pendingToggleId)}
        type={pendingTogglePhone?.isActive ? "warning" : "restore"}
        title={pendingTogglePhone?.isActive ? "Desactivar teléfono" : "Reactivar teléfono"}
        message={
          pendingTogglePhone?.isActive
            ? "Estas por desactivar este teléfono. Hazlo solo si estas seguro."
            : "Estas por reactivar este teléfono. Hazlo solo si estas seguro."
        }
        confirmText={pendingTogglePhone?.isActive ? "Desactivar" : "Reactivar"}
        loading={toggling}
        onClose={() => {
          if (toggling) return;
          setPendingToggleId(null);
        }}
        onConfirm={() => {
          void confirmToggle();
        }}
      />
    </Modal>
  );
}
