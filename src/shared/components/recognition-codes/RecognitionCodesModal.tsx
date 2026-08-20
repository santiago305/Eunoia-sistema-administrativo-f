import { useCallback, useEffect, useMemo, useState } from "react";
import type { AxiosError } from "axios";
import { Edit3, LoaderCircle, Menu, Plus, Save, Trash2, X } from "lucide-react";
import { AlertModal } from "@/shared/components/components/AlertModal";
import { ActionsPopover } from "@/shared/components/components/ActionsPopover";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { DataTable } from "@/shared/components/table/DataTable";
import type { DataTableColumn } from "@/shared/components/table/types";
import { Modal } from "@/shared/components/modales/Modal";
import { parseApiError } from "@/shared/common/utils/handleApiError";

export type RecognitionCodeItem = {
  id: string;
  code: string;
};

export type RecognitionCodePayload = {
  code: string;
  replaceDeleted?: boolean;
};

type ListResponse<TItem extends RecognitionCodeItem> = {
  items: TItem[];
  total: number;
};

type Props<TItem extends RecognitionCodeItem> = {
  open: boolean;
  title: string;
  tableId: string;
  canManage: boolean;
  onClose: () => void;
  listCodes: (params: { page: number; limit: number; q?: string }) => Promise<ListResponse<TItem>>;
  createCode: (payload: RecognitionCodePayload) => Promise<unknown>;
  updateCode: (id: string, payload: RecognitionCodePayload) => Promise<unknown>;
  deleteCode: (id: string) => Promise<unknown>;
};

type ConflictPayload<TItem extends RecognitionCodeItem> = {
  item: TItem;
  payload: RecognitionCodePayload;
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

export function RecognitionCodesModal<TItem extends RecognitionCodeItem>({
  open,
  title,
  tableId,
  canManage,
  onClose,
  listCodes,
  createCode,
  updateCode,
  deleteCode,
}: Props<TItem>) {
  const [items, setItems] = useState<TItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<TItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [code, setCode] = useState("");
  const [pendingDelete, setPendingDelete] = useState<TItem | null>(null);
  const [pendingConflict, setPendingConflict] = useState<ConflictPayload<TItem> | null>(null);

  const resetForm = useCallback(() => {
    setEditing(null);
    setFormOpen(false);
    setCode("");
  }, []);

  const load = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    setError("");
    try {
      const response = await listCodes({
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
  }, [listCodes, open, page, query]);

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
    setEditing(null);
    setCode("");
    setFormOpen(true);
    setError("");
  };

  const startEdit = useCallback((item: TItem) => {
    setEditing(item);
    setCode(item.code);
    setFormOpen(true);
    setError("");
  }, []);

  const save = useCallback(async (replaceDeleted = false) => {
    const normalizedCode = code.trim().replace(/\s+/g, " ");
    if (!normalizedCode) {
      setError("Ingresa un código de reconocimiento.");
      return;
    }

    const payload: RecognitionCodePayload = {
      code: normalizedCode,
      ...(replaceDeleted ? { replaceDeleted: true } : {}),
    };

    setSaving(true);
    setError("");
    try {
      if (editing) await updateCode(editing.id, payload);
      else await createCode(payload);
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
  }, [code, createCode, editing, load, resetForm, updateCode]);

  const confirmConflict = useCallback(async () => {
    if (!pendingConflict) return;
    setSaving(true);
    setError("");
    try {
      await updateCode(pendingConflict.item.id, {
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
  }, [load, pendingConflict, resetForm, updateCode]);

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    setSaving(true);
    setError("");
    try {
      await deleteCode(pendingDelete.id);
      setPendingDelete(null);
      if (items.length === 1 && page > 1) setPage((current) => current - 1);
      else await load();
    } catch (requestError) {
      setError(parseApiError(requestError, "No se pudo eliminar el código."));
    } finally {
      setSaving(false);
    }
  }, [deleteCode, items.length, load, page, pendingDelete]);

  const columns = useMemo<DataTableColumn<TItem>[]>(() => [
    {
      id: "code",
      header: "Código",
      width: "220px",
      className: "font-semibold text-zinc-900",
      cell: (item) => item.code,
    },
    {
      id: "actions",
      header: "Acciones",
      width: "90px",
      className: "text-center",
      headerClassName: "text-center [&>div]:justify-center",
      stopRowClick: true,
      visible: canManage,
      cell: (item) => (
        <div className="flex justify-center">
          <ActionsPopover
            actions={[
              {
                id: "edit",
                label: "Editar",
                icon: <Edit3 className="h-4 w-4 text-black/60" />,
                onClick: () => startEdit(item),
              },
              {
                id: "delete",
                label: "Eliminar",
                icon: <Trash2 className="h-4 w-4" />,
                danger: true,
                className: "text-rose-700 hover:bg-rose-50",
                onClick: () => setPendingDelete(item),
              },
            ]}
            columns={1}
            compact
            showLabels
            triggerIcon={<Menu className="h-4 w-4" />}
            popoverClassName="min-w-32"
            popoverBodyClassName="p-2"
          />
        </div>
      ),
    },
  ], [canManage, startEdit]);

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={title}
        className="w-auto max-w-[calc(100vw-2rem)]"
        bodyClassName="p-3"
      >
        <div className="w-[24rem] max-w-full space-y-3">
          {canManage ? (
            !formOpen ? (
              <SystemButton
                type="button"
                size="sm"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={startCreate}
              >
                Nuevo código
              </SystemButton>
            ) : (
              <div className="flex items-end gap-2 rounded-md border border-zinc-200 bg-zinc-50 p-3">
                <div className="min-w-0 flex-1">
                  <FloatingInput
                    label="Código"
                    name={`${tableId}-code`}
                    value={code}
                    maxLength={80}
                    onChange={(event) => setCode(normalizeCodeInput(event.target.value))}
                  />
                </div>
                <SystemButton
                  type="button"
                  size="icon"
                  variant="outline"
                  className="h-9 w-9 shrink-0"
                  tooltip="Cancelar"
                  onClick={resetForm}
                  disabled={saving}
                >
                  <X className="h-4 w-4" />
                </SystemButton>
                <SystemButton
                  type="button"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  tooltip="Guardar"
                  onClick={() => void save()}
                  loading={saving}
                >
                  <Save className="h-4 w-4" />
                </SystemButton>
              </div>
            )
          ) : null}

          {error ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
              {error}
            </div>
          ) : null}

          {loading && items.length === 0 ? (
            <div className="grid min-h-40 place-items-center text-xs text-zinc-500">
              <span className="inline-flex items-center gap-2">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Cargando códigos...
              </span>
            </div>
          ) : (
            <DataTable
              tableId={tableId}
              data={items}
              columns={columns}
              rowKey="id"
              responsiveMode="table"
              selectableColumns={false}
              searchMode="server"
              searchPlaceholder="Buscar código..."
              searchValue={query}
              onSearchChange={(value) => {
                setQuery(value);
                setPage(1);
              }}
              pagination={{ page, limit: PAGE_SIZE, total }}
              onPageChange={setPage}
              maxHeight="360px"
              emptyMessage="No hay códigos de reconocimiento."
              animated={false}
              className="p-0"
            />
          )}
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
        message="Este código ya existía y fue eliminado. ¿Quieres restaurarlo?"
        confirmText="Restaurar"
        loading={saving}
      />
    </>
  );
}
