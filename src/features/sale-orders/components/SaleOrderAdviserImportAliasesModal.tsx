import { useCallback, useEffect, useMemo, useState } from "react";
import { Edit3, LoaderCircle, Plus, Power, PowerOff, Save, Trash2, X } from "lucide-react";
import { AlertModal } from "@/shared/components/components/AlertModal";
import { DataTableActionsPopover } from "@/shared/components/components/DataTableActionsPopover";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { Modal } from "@/shared/components/modales/Modal";
import { DataTable } from "@/shared/components/table/DataTable";
import type { DataTableColumn } from "@/shared/components/table/types";
import { parseApiError } from "@/shared/common/utils/handleApiError";
import type { SaleOrderAdviserImportAlias } from "@/features/sale-orders/types/saleOrder";
import { listAdvisers, type AdviserOption } from "@/shared/services/adviserService";
import {
  createSaleOrderAdviserImportAlias,
  deleteSaleOrderAdviserImportAlias,
  listSaleOrderAdviserImportAliases,
  updateSaleOrderAdviserImportAlias,
} from "@/shared/services/saleOrderService";

type Props = {
  open: boolean;
  canManage: boolean;
  onClose: () => void;
  adviserUserId?: string;
  adviserName?: string;
};

const PAGE_SIZE = 25;

export function SaleOrderAdviserImportAliasesModal({ open, canManage, onClose, adviserUserId: adviserFilterUserId, adviserName }: Props) {
  const [items, setItems] = useState<SaleOrderAdviserImportAlias[]>([]);
  const [advisers, setAdvisers] = useState<AdviserOption[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SaleOrderAdviserImportAlias | null>(null);
  const [externalName, setExternalName] = useState("");
  const [adviserUserId, setAdviserUserId] = useState("");
  const [pendingDelete, setPendingDelete] = useState<SaleOrderAdviserImportAlias | null>(null);

  const resetForm = useCallback(() => {
    setFormOpen(false);
    setEditing(null);
    setExternalName("");
    setAdviserUserId("");
  }, []);

  const load = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    setError("");
    try {
      const [aliasesResponse, adviserResponse] = await Promise.all([
        listSaleOrderAdviserImportAliases({
          page,
          limit: PAGE_SIZE,
          q: query.trim() || undefined,
          adviserUserId: adviserFilterUserId,
        }),
        adviserFilterUserId ? Promise.resolve([]) : listAdvisers(),
      ]);
      setItems(aliasesResponse.items ?? []);
      setTotal(aliasesResponse.total ?? 0);
      setAdvisers(adviserResponse ?? []);
    } catch (requestError) {
      setError(parseApiError(requestError, "No se pudieron cargar las equivalencias de asesores."));
    } finally {
      setLoading(false);
    }
  }, [adviserFilterUserId, open, page, query]);

  useEffect(() => {
    if (!open) {
      setItems([]);
      setAdvisers([]);
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
    setExternalName("");
    setAdviserUserId(adviserFilterUserId ?? "");
    setError("");
    setFormOpen(true);
  };

  const startEdit = useCallback((item: SaleOrderAdviserImportAlias) => {
    setEditing(item);
    setExternalName(item.externalName);
    setAdviserUserId(item.adviserUserId);
    setError("");
    setFormOpen(true);
  }, []);

  const save = useCallback(async () => {
    const name = externalName.trim().replace(/\s+/g, " ");
    if (!name || !adviserUserId) {
      setError("Ingresa el nombre recibido del Excel y selecciona un asesor.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const payload = { externalName: name, adviserUserId };
      if (editing) await updateSaleOrderAdviserImportAlias(editing.id, payload);
      else await createSaleOrderAdviserImportAlias(payload);
      resetForm();
      await load();
    } catch (requestError) {
      setError(parseApiError(requestError, "No se pudo guardar la equivalencia."));
    } finally {
      setSaving(false);
    }
  }, [adviserUserId, editing, externalName, load, resetForm]);

  const toggleActive = useCallback(async (item: SaleOrderAdviserImportAlias) => {
    setSaving(true);
    setError("");
    try {
      await updateSaleOrderAdviserImportAlias(item.id, {
        externalName: item.externalName,
        adviserUserId: item.adviserUserId,
        isActive: !item.isActive,
      });
      await load();
    } catch (requestError) {
      setError(parseApiError(requestError, "No se pudo actualizar el estado de la equivalencia."));
    } finally {
      setSaving(false);
    }
  }, [load]);

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    setSaving(true);
    setError("");
    try {
      await deleteSaleOrderAdviserImportAlias(pendingDelete.id);
      setPendingDelete(null);
      if (items.length === 1 && page > 1) setPage((current) => current - 1);
      else await load();
    } catch (requestError) {
      setError(parseApiError(requestError, "No se pudo eliminar la equivalencia."));
    } finally {
      setSaving(false);
    }
  }, [items.length, load, page, pendingDelete]);

  const adviserOptions = useMemo(
    () => advisers.map((adviser) => ({
      value: adviser.id,
      label: `${adviser.name} (${adviser.email})`,
    })),
    [advisers],
  );

  const columns = useMemo<DataTableColumn<SaleOrderAdviserImportAlias>[]>(() => [
    {
      id: "externalName",
      header: "Nombre recibido del Excel",
      width: "260px",
      className: "font-semibold text-zinc-900",
      cell: (item) => item.externalName,
    },
    {
      id: "adviser",
      header: "Asesor del sistema",
      width: "260px",
      cell: (item) => item.adviser
        ? `${item.adviser.name} (${item.adviser.email})`
        : "Asesor no disponible",
    },
    {
      id: "status",
      header: "Estado",
      width: "100px",
      cell: (item) => (
        <span className={item.isActive
          ? "rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700"
          : "rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600"}
        >
          {item.isActive ? "Activo" : "Inactivo"}
        </span>
      ),
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
          <DataTableActionsPopover
            actions={[
              {
                id: "edit",
                label: "Editar",
                icon: <Edit3 className="h-4 w-4 text-black/60" />,
                onClick: () => startEdit(item),
              },
              {
                id: "toggle",
                label: item.isActive ? "Desactivar" : "Activar",
                icon: item.isActive
                  ? <PowerOff className="h-4 w-4 text-black/60" />
                  : <Power className="h-4 w-4 text-black/60" />,
                onClick: () => void toggleActive(item),
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
            triggerLabel={`Acciones de ${item.externalName}`}
          />
        </div>
      ),
    },
  ], [canManage, startEdit, toggleActive]);

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={adviserName ? `Códigos de ${adviserName}` : "Asesores código"}
        description="Relaciona los nombres recibidos en Confirmado por con usuarios asesores del sistema."
        className="w-auto max-w-[calc(100vw-2rem)]"
        bodyClassName="p-3"
      >
        <div className="w-[48rem] max-w-full space-y-3">
          {canManage ? (
            !formOpen ? (
              <SystemButton type="button" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={startCreate}>
                Nueva equivalencia
              </SystemButton>
            ) : (
              <div className="grid gap-2 rounded-md border border-zinc-200 bg-zinc-50 p-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
                <FloatingInput
                  label="Nombre recibido del Excel"
                  name="adviser-import-external-name"
                  value={externalName}
                  maxLength={160}
                  onChange={(event) => setExternalName(event.target.value)}
                />
                {!adviserFilterUserId ? <FloatingSelect
                  label="Asesor del sistema"
                  name="adviser-import-user"
                  value={adviserUserId}
                  options={adviserOptions}
                  onChange={setAdviserUserId}
                  searchable
                  panelWidthMode="min-trigger"
                  emptyMessage="Sin asesores disponibles"
                /> : null}
                <SystemButton type="button" size="icon" variant="outline" className="h-10 w-10" tooltip="Cancelar" onClick={resetForm} disabled={saving}>
                  <X className="h-4 w-4" />
                </SystemButton>
                <SystemButton type="button" size="icon" className="h-10 w-10" tooltip="Guardar" onClick={() => void save()} loading={saving}>
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
              <span className="inline-flex items-center gap-2"><LoaderCircle className="h-4 w-4 animate-spin" />Cargando equivalencias...</span>
            </div>
          ) : (
            <DataTable
              tableId="sale-order-adviser-import-aliases-table"
              data={items}
              columns={columns}
              rowKey="id"
              responsiveMode="table"
              selectableColumns={false}
              searchMode="server"
              searchPlaceholder="Buscar nombre o asesor..."
              searchValue={query}
              onSearchChange={(value) => { setQuery(value); setPage(1); }}
              pagination={{ page, limit: PAGE_SIZE, total }}
              onPageChange={setPage}
              maxHeight="420px"
              emptyMessage="No hay equivalencias de asesores."
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
        title="Eliminar equivalencia"
        message="¿Quieres eliminar esta equivalencia de asesor?"
        confirmText="Eliminar"
        loading={saving}
      />
    </>
  );
}
