import { useCallback, useEffect, useMemo, useState } from "react";
import type { AxiosError } from "axios";
import { Edit3, LoaderCircle, Plus, Save, Search, Trash2, X } from "lucide-react";
import { AlertModal } from "@/shared/components/components/AlertModal";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { Modal } from "@/shared/components/modales/Modal";
import { parseApiError } from "@/shared/common/utils/handleApiError";
import type {
  SaveSourceRecognitionCodeInput,
  Source,
  SourceRecognitionCode,
} from "@/features/sources/types/source";
import {
  createSourceRecognitionCode,
  deleteSourceRecognitionCode,
  listSourceRecognitionCodes,
  updateSourceRecognitionCode,
} from "@/shared/services/sourceService";

type Props = {
  open: boolean;
  source: Source | null;
  canManage: boolean;
  onClose: () => void;
};

type ConflictPayload = {
  item: SourceRecognitionCode;
  payload: SaveSourceRecognitionCodeInput;
};

type ConflictResponse = {
  details?: { code?: string };
};

const PAGE_SIZE = 25;

const normalizeCodeInput = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .replace(/^ /, "");

export function SourceRecognitionCodesModal({ open, source, canManage, onClose }: Props) {
  const [items, setItems] = useState<SourceRecognitionCode[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SourceRecognitionCode | null>(null);
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<SourceRecognitionCode | null>(null);
  const [pendingConflict, setPendingConflict] = useState<ConflictPayload | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const resetForm = useCallback(() => {
    setFormOpen(false);
    setEditing(null);
    setCode("");
    setDescription("");
    setIsActive(true);
  }, []);

  const load = useCallback(async () => {
    if (!open || !source) return;
    setLoading(true);
    setError("");
    try {
      const response = await listSourceRecognitionCodes(source.id, {
        page,
        limit: PAGE_SIZE,
        q: query.trim() || undefined,
      });
      setItems(response.items ?? []);
      setTotal(response.total ?? 0);
    } catch (requestError) {
      setError(parseApiError(requestError, "No se pudieron cargar los códigos."));
    } finally {
      setLoading(false);
    }
  }, [open, page, query, source]);

  useEffect(() => {
    if (!open) {
      setItems([]);
      setPage(1);
      setTotal(0);
      setQuery("");
      setError("");
      resetForm();
      return;
    }

    const timeout = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timeout);
  }, [load, open, resetForm]);

  const startCreate = () => {
    resetForm();
    setFormOpen(true);
    setError("");
  };

  const startEdit = (item: SourceRecognitionCode) => {
    setEditing(item);
    setCode(item.code);
    setDescription(item.description ?? "");
    setIsActive(item.isActive);
    setFormOpen(true);
    setError("");
  };

  const persist = useCallback(
    async (
      item: SourceRecognitionCode | null,
      payload: SaveSourceRecognitionCodeInput,
    ) => {
      if (!source) throw new Error("Enganche no seleccionado");
      if (item) return updateSourceRecognitionCode(source.id, item.id, payload);
      return createSourceRecognitionCode(source.id, payload);
    },
    [source],
  );

  const save = useCallback(async (replaceDeleted = false) => {
    const normalizedCode = code.trim().replace(/\s+/g, " ");
    if (!normalizedCode) {
      setError("Ingresa un código de reconocimiento.");
      return;
    }

    const basePayload: SaveSourceRecognitionCodeInput = {
      code: normalizedCode,
      description: description.trim() || null,
    };
    const payload: SaveSourceRecognitionCodeInput = editing
      ? {
          ...basePayload,
          isActive,
          ...(replaceDeleted ? { replaceDeleted: true } : {}),
        }
      : basePayload;

    setSaving(true);
    setError("");
    try {
      await persist(editing, payload);
      setPendingConflict(null);
      resetForm();
      await load();
    } catch (requestError) {
      const axiosError = requestError as AxiosError<ConflictResponse>;
      if (
        editing &&
        axiosError.response?.status === 409 &&
        axiosError.response.data?.details?.code === "DELETED_RECOGNITION_CODE_CONFLICT"
      ) {
        setPendingConflict({ item: editing, payload });
      } else {
        setError(parseApiError(requestError, "No se pudo guardar el código."));
      }
    } finally {
      setSaving(false);
    }
  }, [code, description, editing, isActive, load, persist, resetForm]);

  const confirmConflict = useCallback(async () => {
    if (!pendingConflict || !source) return;
    setSaving(true);
    setError("");
    try {
      await updateSourceRecognitionCode(source.id, pendingConflict.item.id, {
        ...pendingConflict.payload,
        replaceDeleted: true,
      });
      setPendingConflict(null);
      resetForm();
      await load();
    } catch (requestError) {
      setError(parseApiError(requestError, "No se pudo restaurar el código."));
    } finally {
      setSaving(false);
    }
  }, [load, pendingConflict, resetForm, source]);

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete || !source) return;
    setSaving(true);
    setError("");
    try {
      await deleteSourceRecognitionCode(source.id, pendingDelete.id);
      setPendingDelete(null);
      if (items.length === 1 && page > 1) setPage((current) => current - 1);
      else await load();
    } catch (requestError) {
      setError(parseApiError(requestError, "No se pudo eliminar el código."));
    } finally {
      setSaving(false);
    }
  }, [items.length, load, page, pendingDelete, source]);

  const resultLabel = useMemo(() => {
    if (!total) return "Sin códigos configurados";
    return `${total} código${total === 1 ? "" : "s"}`;
  }, [total]);

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Códigos de reconocimiento"
        description={source ? `Enganche: ${source.name}` : undefined}
        className="w-auto max-w-[calc(100vw-2rem)]"
        bodyClassName="p-3"
      >
        <div className="w-[28rem] max-w-full space-y-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] leading-4 text-slate-600">
            El código debe estar al inicio de la nota. El texto restante se guardará como código publicitario.
          </div>

          {canManage && !formOpen ? (
            <SystemButton
              type="button"
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={startCreate}
            >
              Nuevo código
            </SystemButton>
          ) : null}

          {canManage && formOpen ? (
            <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/80 p-3">
              <FloatingInput
                label="Código"
                name="source-recognition-code"
                value={code}
                maxLength={80}
                onChange={(event) => setCode(normalizeCodeInput(event.target.value))}
              />
              <FloatingInput
                label="Descripción (opcional)"
                name="source-recognition-description"
                value={description}
                maxLength={180}
                onChange={(event) => setDescription(event.target.value)}
              />
              <div className="flex items-center justify-between gap-3">
                {editing ? (
                  <label className="inline-flex items-center gap-2 text-xs text-slate-700">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(event) => setIsActive(event.target.checked)}
                    />
                    Activo
                  </label>
                ) : <span />}
                <div className="flex gap-2">
                  <SystemButton
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    tooltip="Cancelar"
                    onClick={resetForm}
                    disabled={saving}
                  >
                    <X className="h-4 w-4" />
                  </SystemButton>
                  <SystemButton
                    type="button"
                    size="icon"
                    className="h-8 w-8"
                    tooltip="Guardar"
                    onClick={() => void save()}
                    loading={saving}
                  >
                    <Save className="h-4 w-4" />
                  </SystemButton>
                </div>
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Buscar código"
              className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>{resultLabel}</span>
            {totalPages > 1 ? <span>Página {page} de {totalPages}</span> : null}
          </div>

          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {loading && items.length === 0 ? (
              <div className="grid min-h-32 place-items-center text-xs text-slate-500">
                <span className="inline-flex items-center gap-2">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Cargando códigos...
                </span>
              </div>
            ) : null}

            {!loading && items.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-xs text-slate-500">
                No hay códigos de reconocimiento.
              </div>
            ) : null}

            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-slate-900 px-2 py-1 text-[11px] font-semibold tracking-wide text-white">
                      {item.code}
                    </span>
                    <span className={item.isActive ? "text-[10px] font-medium text-emerald-700" : "text-[10px] font-medium text-slate-400"}>
                      {item.isActive ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                  {item.description ? (
                    <p className="mt-1 truncate text-[11px] text-slate-500" title={item.description}>
                      {item.description}
                    </p>
                  ) : null}
                </div>

                {canManage ? (
                  <div className="flex shrink-0 gap-1.5">
                    <SystemButton
                      type="button"
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 rounded-md"
                      tooltip="Editar"
                      onClick={() => startEdit(item)}
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </SystemButton>
                    <SystemButton
                      type="button"
                      size="icon"
                      variant="danger"
                      className="h-8 w-8 rounded-md"
                      tooltip="Eliminar"
                      onClick={() => setPendingDelete(item)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </SystemButton>
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          {totalPages > 1 ? (
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <SystemButton
                type="button"
                size="sm"
                variant="outline"
                disabled={page <= 1 || loading}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Anterior
              </SystemButton>
              <SystemButton
                type="button"
                size="sm"
                variant="outline"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              >
                Siguiente
              </SystemButton>
            </div>
          ) : null}
        </div>
      </Modal>

      <AlertModal
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => void confirmDelete()}
        type="deleted"
        title="Eliminar código"
        message="¿Quieres eliminar este código de reconocimiento?"
        confirmText="Eliminar"
        loading={saving}
      />

      <AlertModal
        open={Boolean(pendingConflict)}
        onClose={() => setPendingConflict(null)}
        onConfirm={() => void confirmConflict()}
        type="warning"
        title="Restaurar código"
        message="Este código ya existía y fue eliminado. ¿Quieres restaurarlo para este enganche?"
        confirmText="Restaurar"
        loading={saving}
      />
    </>
  );
}
