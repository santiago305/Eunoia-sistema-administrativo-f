import { useCallback, useEffect, useMemo, useState } from "react";
import type { AxiosError } from "axios";
import { Edit3, LoaderCircle, Plus, Save, Trash2, X } from "lucide-react";
import { Modal } from "@/shared/components/modales/Modal";
import { AlertModal } from "@/shared/components/components/AlertModal";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { DataTable } from "@/shared/components/table/DataTable";
import type { DataTableColumn } from "@/shared/components/table/types";
import { parseApiError } from "@/shared/common/utils/handleApiError";
import {
  createSaleOrderSkuRecognitionCode,
  deleteSaleOrderSkuRecognitionCode,
  listSaleOrderSkuRecognitionCodes,
  updateSaleOrderSkuRecognitionCode,
} from "@/shared/services/saleOrderService";
import type {
  SaleOrderSkuRecognitionCode,
  SaveSaleOrderSkuRecognitionCodeInput,
} from "@/features/sale-orders/types/saleOrder";

type Props = {
  open: boolean;
  canManage: boolean;
  onClose: () => void;
};

type ConflictPayload = {
  item: SaleOrderSkuRecognitionCode;
  payload: SaveSaleOrderSkuRecognitionCodeInput;
};

type ConflictResponse = {
  details?: { code?: string };
};

const PAGE_SIZE = 25;

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
};

export function SaleOrderSkuRecognitionCodesModal({ open, canManage, onClose }: Props) {
  const [items, setItems] = useState<SaleOrderSkuRecognitionCode[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<SaleOrderSkuRecognitionCode | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<SaleOrderSkuRecognitionCode | null>(null);
  const [pendingConflict, setPendingConflict] = useState<ConflictPayload | null>(null);

  const resetForm = useCallback(() => {
    setEditing(null);
    setFormOpen(false);
    setCode("");
    setDescription("");
    setIsActive(true);
  }, []);

  const load = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    setError("");
    try {
      const response = await listSaleOrderSkuRecognitionCodes({
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
  }, [open, page, query]);

  useEffect(() => {
    if (!open) {
      setItems([]);
      setPage(1);
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
    setDescription("");
    setIsActive(true);
    setFormOpen(true);
    setError("");
  };

  const startEdit = (item: SaleOrderSkuRecognitionCode) => {
    setEditing(item);
    setCode(item.code);
    setDescription(item.description ?? "");
    setIsActive(item.isActive);
    setFormOpen(true);
    setError("");
  };

  const persist = useCallback(async (
    item: SaleOrderSkuRecognitionCode | null,
    payload: SaveSaleOrderSkuRecognitionCodeInput,
  ) => {
    if (item) return updateSaleOrderSkuRecognitionCode(item.id, payload);
    return createSaleOrderSkuRecognitionCode(payload);
  }, []);

  const save = useCallback(async (replaceDeleted = false) => {
    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode) {
      setError("Ingresa un código de reconocimiento.");
      return;
    }

    const createPayload: SaveSaleOrderSkuRecognitionCodeInput = {
      code: normalizedCode,
      description: description.trim() || null,
    };
    const payload: SaveSaleOrderSkuRecognitionCodeInput = editing
      ? {
          ...createPayload,
          isActive,
          ...(replaceDeleted ? { replaceDeleted: true } : {}),
        }
      : createPayload;

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
    if (!pendingConflict) return;
    setSaving(true);
    setError("");
    try {
      await updateSaleOrderSkuRecognitionCode(pendingConflict.item.id, {
        ...pendingConflict.payload,
        replaceDeleted: true,
      });
      setPendingConflict(null);
      resetForm();
      await load();
    } catch (requestError) {
      setError(parseApiError(requestError, "No se pudo editar el código."));
    } finally {
      setSaving(false);
    }
  }, [load, pendingConflict, resetForm]);

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    setSaving(true);
    setError("");
    try {
      await deleteSaleOrderSkuRecognitionCode(pendingDelete.id);
      setPendingDelete(null);
      if (items.length === 1 && page > 1) setPage((current) => current - 1);
      else await load();
    } catch (requestError) {
      setError(parseApiError(requestError, "No se pudo eliminar el código."));
    } finally {
      setSaving(false);
    }
  }, [items.length, load, page, pendingDelete]);

  const columns = useMemo<DataTableColumn<SaleOrderSkuRecognitionCode>[]>(() => [
    {
      id: "code",
      header: "Código",
      width: "130px",
      className: "font-semibold text-zinc-900",
      cell: (item) => item.code,
    },
    {
      id: "description",
      header: "Descripción",
      cell: (item) => item.description || "—",
    },
    {
      id: "status",
      header: "Estado",
      width: "110px",
      className: "text-center",
      headerClassName: "text-center",
      cell: (item) => (
        <span className={item.isActive ? "text-emerald-700" : "text-zinc-500"}>
          {item.isActive ? "Activo" : "Inactivo"}
        </span>
      ),
    },
    {
      id: "createdAt",
      header: "Creado",
      width: "155px",
      cell: (item) => formatDateTime(item.createdAt),
    },
    {
      id: "actions",
      header: "Acciones",
      width: "110px",
      className: "text-center",
      headerClassName: "text-center",
      stopRowClick: true,
      visible: canManage,
      cell: (item) => (
        <div className="flex justify-center gap-2">
          <SystemButton
            type="button"
            size="icon"
            variant="outline"
            className="h-8 w-8 rounded-md"
            tooltip="Editar"
            onClick={() => startEdit(item)}
          >
            <Edit3 className="h-4 w-4" />
          </SystemButton>
          <SystemButton
            type="button"
            size="icon"
            variant="danger"
            className="h-8 w-8 rounded-md"
            tooltip="Eliminar"
            onClick={() => setPendingDelete(item)}
          >
            <Trash2 className="h-4 w-4" />
          </SystemButton>
        </div>
      ),
    },
  ], [canManage]);

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Códigos de reconocimiento"
        className="w-[min(900px,calc(100vw-2rem))]"
        bodyClassName="p-4"
      >
        {canManage ? (
          <div className="mb-4">
            {!formOpen ? (
              <SystemButton type="button" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={startCreate}>
                Nuevo código
              </SystemButton>
            ) : (
              <div className="grid gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-3 md:grid-cols-[180px_1fr_auto]">
                <FloatingInput
                  label="Código"
                  name="sku-recognition-code"
                  value={code}
                  maxLength={20}
                  onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                />
                <FloatingInput
                  label="Descripción"
                  name="sku-recognition-description"
                  value={description}
                  maxLength={180}
                  onChange={(event) => setDescription(event.target.value)}
                />
                <div className="flex items-center justify-end gap-2">
                  {editing ? (
                    <label className="mr-2 inline-flex items-center gap-2 text-xs text-zinc-700">
                      <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
                      Activo
                    </label>
                  ) : null}
                  <SystemButton type="button" size="icon" variant="outline" tooltip="Cancelar" onClick={resetForm} disabled={saving}>
                    <X className="h-4 w-4" />
                  </SystemButton>
                  <SystemButton type="button" size="icon" tooltip="Guardar" onClick={() => void save()} loading={saving}>
                    <Save className="h-4 w-4" />
                  </SystemButton>
                </div>
              </div>
            )}
          </div>
        ) : null}

        {error ? (
          <div className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
            {error}
          </div>
        ) : null}

        {loading && items.length === 0 ? (
          <div className="grid min-h-56 place-items-center text-sm text-zinc-500">
            <span className="inline-flex items-center gap-2">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Cargando códigos...
            </span>
          </div>
        ) : (
          <DataTable
            tableId="sale-order-sku-recognition-codes-table"
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
            maxHeight="500px"
            emptyMessage="No hay códigos de reconocimiento."
            animated={false}
            className="p-0"
          />
        )}
      </Modal>

      <AlertModal
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => void confirmDelete()}
        type="deleted"
        title="Eliminar código"
        message="¿Quieres eliminarlo?"
        confirmText="Eliminar"
        loading={saving}
      />

      <AlertModal
        open={Boolean(pendingConflict)}
        onClose={() => setPendingConflict(null)}
        onConfirm={() => void confirmConflict()}
        type="warning"
        title="Editar código"
        message="¿Quieres editarlo?"
        confirmText="Editar"
        loading={saving}
      />
    </>
  );
}
