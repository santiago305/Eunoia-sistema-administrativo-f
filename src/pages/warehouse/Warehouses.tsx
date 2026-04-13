import { useCallback, useEffect, useMemo, useState, type MouseEvent } from "react";
import { PageTitle } from "@/components/PageTitle";
import { Modal } from "@/components/modales/Modal";
import { motion, useReducedMotion } from "framer-motion";
import { Boxes, Menu, Pencil, Plus, Power } from "lucide-react";

import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useWarehouses } from "@/hooks/useWarehouse";
import type { Warehouse } from "@/pages/warehouse/types/warehouse";
import { WarehouseFormModal } from "@/pages/warehouse/components/WarehouseFormModal";
import { WarehouseLocationsModal } from "./components/LocationModal";
import { WarehouseStockModal } from "./components/WarehouseStockModal";
import { SystemButton } from "@/components/SystemButton";
import { ActionsPopover } from "@/components/ActionsPopover";
import { StatusPill } from "@/components/StatusTag";

import { DataTable } from "@/components/table/DataTable";
import type { DataTableColumn } from "@/components/table/types";
import { Headed } from "@/components/Headed";
import { PageShell } from "@/components/layout/PageShell";

const PRIMARY = "hsl(var(--primary))";
const PRIMARY_HOVER = "#1aa392";
const DEFAULT_LIMIT = 10;
const SEARCH_DEBOUNCE_MS = 500;

export default function Warehouses() {
  const shouldReduceMotion = useReducedMotion();
  const [openCreate, setOpenCreate] = useState(false);
  const [editingWarehouseId, setEditingWarehouseId] = useState<string | null>(null);
  const [deletingWarehouseId, setDeletingWarehouseId] = useState<string | null>(null);
  const [openLocationsWarehouseId, setOpenLocationsWarehouseId] = useState<string | null>(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState<{
    warehouseId: string;
    name: string;
  } | null>(null);
  const [stockWarehouse, setStockWarehouse] = useState<{
    warehouseId: string;
    name: string;
  } | null>(null);

  const [paginationState, setPaginationState] = useState({
    pageIndex: 0,
    pageSize: DEFAULT_LIMIT,
  });
  const [searchText, setSearchText] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  const page = paginationState.pageIndex + 1;
  const limit = paginationState.pageSize;
  const debouncedSearch = useDebouncedValue(searchText.trim(), SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    if (debouncedSearch === appliedSearch) return;

    if (paginationState.pageIndex !== 0) {
      setPaginationState((prev) => ({
        ...prev,
        pageIndex: 0,
      }));
      return;
    }

    setAppliedSearch(debouncedSearch);
  }, [appliedSearch, debouncedSearch, paginationState.pageIndex]);

  const queryParams = useMemo(
    () => ({
      page,
      limit,
      q: appliedSearch || undefined,
    }),
    [appliedSearch, page, limit]
  );

  const {
    items: warehouses,
    total,
    page: apiPage,
    limit: apiLimit,
    loading,
    setActive,
    refetch,
  } = useWarehouses(queryParams);

  useEffect(() => {
    setPaginationState((prev) => {
      const nextPageIndex = apiPage ? apiPage - 1 : prev.pageIndex;
      const nextPageSize = apiLimit ?? prev.pageSize;

      if (nextPageIndex === prev.pageIndex && nextPageSize === prev.pageSize) {
        return prev;
      }

      return {
        ...prev,
        pageIndex: nextPageIndex,
        pageSize: nextPageSize,
      };
    });
  }, [apiLimit, apiPage]);

  const effectiveLimit = apiLimit ?? limit;
  const safePage = apiPage ?? page;

  const sortedWarehouses = useMemo(
    () =>
      [...warehouses].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      ),
    [warehouses]
  );

  const startCreate = useCallback(() => {
    setEditingWarehouseId(null);
    setOpenCreate(true);
  }, []);

  const openLocationsModal = useCallback((warehouse: { warehouseId: string; name: string }) => {
    setSelectedWarehouse(warehouse);
    setOpenLocationsWarehouseId(warehouse.warehouseId);
  }, []);

  const closeLocationsModal = useCallback(() => {
    setOpenLocationsWarehouseId(null);
    setSelectedWarehouse(null);
  }, []);

  const openStockModal = useCallback((warehouse: { warehouseId: string; name: string }) => {
    setStockWarehouse(warehouse);
  }, []);

  const closeStockModal = useCallback(() => {
    setStockWarehouse(null);
  }, []);

  const startEdit = useCallback((warehouseId: string) => {
    setOpenCreate(false);
    setEditingWarehouseId(warehouseId);
  }, []);

  const closeFormModal = useCallback(() => {
    setOpenCreate(false);
    setEditingWarehouseId(null);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deletingWarehouseId) return;

    const warehouseToToggle = warehouses.find(
      ({ warehouseId }) => warehouseId === deletingWarehouseId
    );

    if (!warehouseToToggle) {
      setDeletingWarehouseId(null);
      return;
    }

    await setActive(deletingWarehouseId, !warehouseToToggle.isActive);
    setDeletingWarehouseId(null);
  }, [deletingWarehouseId, setActive, warehouses]);

  const formatDate = useCallback((value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleString("es-PE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }, []);

  const columns = useMemo<DataTableColumn<Warehouse>[]>(
    () => [
      {
        id: "name",
        header: "Almacen",
        accessorKey: "name",
        cell: (row) => <span className="font-medium text-black">{row.name}</span>,
        className: "text-black/70",
        cardTitle: true,
      },
      {
        id: "department",
        header: "Departamento",
        accessorKey: "department",
        className: "text-black/70",
        sortable: false,
      },
      {
        id: "province",
        header: "Provincia",
        accessorKey: "province",
        className: "text-black/70",
        sortable: false,
      },
      {
        id: "district",
        header: "Distrito",
        accessorKey: "district",
        className: "text-black/70",
        sortable: false,
      },
      {
        id: "address",
        header: "Direccion",
        cell: (row) => <span className="text-black/70">{row.address ?? "-"}</span>,
        className: "text-black/70",
        visible: false,
        hideable: true,
        sortable: false,
      },
      {
        id: "status",
        header: "Estado",
        cell: (row) => <StatusPill active={row.isActive} PRIMARY={PRIMARY} />,
        sortAccessor: (row) => row.isActive,
      },
      {
        id: "createdAt",
        header: "Creado",
        cell: (row) => <span className="text-black/60 text-xs">{formatDate(row.createdAt)}</span>,
        visible: false,
        hideable: true,
        sortable: false,
      },
      {
        id: "actions",
        header: "ACCIONES",
        stopRowClick: true,
        cell: (row) => (
          <ActionsPopover
            actions={[
              {
                id: "locations",
                label: "Ver ubicaciones",
                icon: <Boxes className="h-4 w-4 text-black/60" />,
                onClick: () =>
                  openLocationsModal({
                    warehouseId: row.warehouseId,
                    name: row.name,
                  }),
              },
              {
                id: "edit",
                label: "Detalles",
                icon: <Pencil className="h-4 w-4 text-black/60" />,
                onClick: () => startEdit(row.warehouseId),
              },
              {
                id: "toggle",
                label: row.isActive ? "Eliminar" : "Restaurar",
                icon: <Power className="h-4 w-4" />,
                danger: row.isActive,
                className: row.isActive
                  ? "text-rose-700 hover:bg-rose-50"
                  : "text-cyan-700 hover:bg-cyan-50",
                onClick: () => setDeletingWarehouseId(row.warehouseId),
              },
            ]}
            columns={1}
            compact
            showLabels
            triggerIcon={<Menu className="h-4 w-4" />}
            popoverClassName="min-w-35"
            popoverBodyClassName="p-2"
            renderAction={(action, helpers) => (
              <button
                key={action.id}
                type="button"
                onClick={(e: MouseEvent<HTMLButtonElement>) => {
                  e.stopPropagation();
                  helpers.onAction(action);
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[11px] text-black/80 hover:bg-black/[0.03] ${action.className ?? ""}`}
                disabled={action.disabled}
              >
                {action.icon}
                {action.label}
              </button>
            )}
          />
        ),
        className: "text-center",
        headerClassName: "text-center [&>div]:justify-center",
        hideable: false,
        sortable: false,
      },
    ],
    [formatDate, openLocationsModal, openStockModal, startEdit]
  );

  return (
    <PageShell>
      <PageTitle title="Almacenes" />
      <div className="flex items-center justify-between">
        <Headed title="Almacenes" size="lg" />
        <SystemButton
          size="sm"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={startCreate}
          title="Nuevo almacen"
          style={{
            backgroundColor: PRIMARY,
            borderColor: `color-mix(in srgb, ${PRIMARY} 20%, transparent)`,
            boxShadow: "0 10px 25px -15px rgba(0,0,0,0.4)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = PRIMARY_HOVER;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = PRIMARY;
          }}
        >
          Crear almacen
        </SystemButton>
      </div>

      <DataTable
        tableId="warehouses-table"
        data={sortedWarehouses}
        columns={columns}
        rowKey="warehouseId"
        loading={loading}
        emptyMessage="No hay almacenes con los filtros actuales."
        showSearch
        searchPlaceholder="Buscar almacenes..."
        searchValue={searchText}
        onSearchChange={setSearchText}
        searchMode="server"
        selectableColumns
        hoverable={false}
        animated={false}
        pagination={{
          page: safePage,
          limit: effectiveLimit,
          total,
        }}
        onRowClick={(row) =>
          openStockModal({
            warehouseId: row.warehouseId,
            name: row.name,
          })
        }
        onPageChange={(nextPage) => {
          setPaginationState((prev) => ({ ...prev, pageIndex: Math.max(0, nextPage - 1) }));
        }}
      />

      <WarehouseFormModal
        open={openCreate || Boolean(editingWarehouseId)}
        mode={editingWarehouseId ? "edit" : "create"}
        warehouseId={editingWarehouseId}
        onClose={closeFormModal}
        onSaved={() => {
          void refetch();
        }}
        primaryColor={PRIMARY}
        entityLabel="almacen"
      />

      {deletingWarehouseId && (
        <Modal
          open={true}
          title="Confirmar accion"
          onClose={() => setDeletingWarehouseId(null)}
          className="w-[300px] max-h-[300px]"
        >
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.985, y: 6 }}
            animate={shouldReduceMotion ? false : { opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.16 }}
          >
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-[11px] text-rose-800">
              <span className="font-semibold">Ojo:</span> estas por cambiar el estado de un almacen.
              Hazlo solo si estas seguro.
            </div>

            <p className="mt-3 text-[11px] text-black/70">
              Confirmas esta accion? Puede afectar disponibilidad, reportes y procesos internos.
            </p>

            <div className="mt-4 flex justify-end gap-2">
              <SystemButton variant="outline" size="sm" onClick={() => setDeletingWarehouseId(null)}>
                Cancelar
              </SystemButton>
              <SystemButton variant="danger" size="sm" onClick={confirmDelete}>
                Confirmar
              </SystemButton>
            </div>
          </motion.div>
        </Modal>
      )}

      <WarehouseLocationsModal
        open={Boolean(openLocationsWarehouseId && selectedWarehouse)}
        warehouse={selectedWarehouse}
        onClose={closeLocationsModal}
        primaryColor={PRIMARY}
        primaryHover={PRIMARY_HOVER}
      />

      <WarehouseStockModal
        open={Boolean(stockWarehouse)}
        warehouse={stockWarehouse}
        onClose={closeStockModal}
      />
    </PageShell>
  );
}
