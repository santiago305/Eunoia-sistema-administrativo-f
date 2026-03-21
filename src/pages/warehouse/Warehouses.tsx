import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { PageTitle } from "@/components/PageTitle";
import { Modal } from "@/components/settings/modal";
import { motion, useReducedMotion } from "framer-motion";
import { Download, Plus, Search, SlidersHorizontal } from "lucide-react";

import { useWarehouses } from "@/hooks/useWarehouse";
import { listWarehouses } from "@/services/warehouseServices";
import { WarehouseFormModal } from "@/pages/warehouse/components/WarehouseFormModal";
import { WarehouseLocationsModal } from "./components/LocationModal";
import { fadeUp } from "@/utils/animations";

import { DataTable } from "@/components/data-table/DataTable";
import { DataTableColumnMenu } from "@/components/data-table/DataTableColumnMenu";
import { DataTablePagination } from "@/components/data-table/DataTablePagination";
import {
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
  type ExpandedState,
  type PaginationState,
  type VisibilityState,
} from "@tanstack/react-table";
import { getWarehouseColumns } from "./components/data-table/Warehouse.columns";
import { WarehouseExpandedRow } from "./components/data-table/WarehouseExpandedRow";
import { hasHiddenExpandableFields } from "@/components/data-table/expanded-hidden-fields/hasHiddenExpandableFields";
import { warehouseExpandedFields } from "./components/data-table/warehouseExpandedFields";

const PRIMARY = "hsl(var(--primary))";
const PRIMARY_HOVER = "#1aa392";
const DEFAULT_LIMIT = 10;

export default function Warehouses() {
  const shouldReduceMotion = useReducedMotion();
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [openCreate, setOpenCreate] = useState(false);
  const [editingWarehouseId, setEditingWarehouseId] = useState<string | null>(null);
  const [deletingWarehouseId, setDeletingWarehouseId] = useState<string | null>(null);
  const [openLocationsWarehouseId, setOpenLocationsWarehouseId] = useState<string | null>(null);
  const [warehouse, setWarehouse] = useState<{ warehouseId: string; name: string } | null>(null);

  const [debouncedQ, setDebouncedQ] = useState("");
  const [exporting, setExporting] = useState(false);

  const [paginationState, setPaginationState] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: DEFAULT_LIMIT,
  });
  const page = paginationState.pageIndex + 1;
  const limit = paginationState.pageSize;

  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    createdAt: false,
    updatedAt: false,
  });
  const [showColumnMenu, setShowColumnMenu] = useState(false);

  const queryParams = useMemo(
    () => ({
      page,
      limit,
      isActive: statusFilter === "active" ? ("true" as const) : ("false" as const),
      q: debouncedQ.trim() || undefined,
    }),
    [page, limit, statusFilter, debouncedQ]
  );

  const {
    items: warehouses,
    total,
    page: apiPage,
    limit: apiLimit,
    loading,
    error,
    setActive,
    refetch,
  } = useWarehouses(queryParams);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQ(searchText.trim());
      setPaginationState((prev) => ({ ...prev, pageIndex: 0 }));
      setExpanded({});
    }, 450);
    return () => clearTimeout(handler);
  }, [searchText]);

  useEffect(() => {
    if (apiPage && apiPage - 1 !== paginationState.pageIndex) {
      setPaginationState((prev) => ({ ...prev, pageIndex: apiPage - 1 }));
    }
    if (apiLimit && apiLimit !== paginationState.pageSize) {
      setPaginationState((prev) => ({ ...prev, pageSize: apiLimit }));
    }
  }, [apiPage, apiLimit, paginationState.pageIndex, paginationState.pageSize]);

  useEffect(() => {
    setExpanded({});
  }, [columnVisibility, statusFilter]);

  const effectiveLimit = apiLimit ?? limit;
  const safePage = apiPage ?? page;
  const totalPages = Math.max(1, Math.ceil(total / effectiveLimit));
  const hasPrev = safePage > 1;
  const hasNext = safePage < totalPages;
  const startIndex = total === 0 ? 0 : (safePage - 1) * effectiveLimit + 1;
  const endIndex = Math.min(safePage * effectiveLimit, total);

  const sortedWarehouses = useMemo(() => {
    return [...warehouses].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [warehouses]);

  const startCreate = () => {
    setEditingWarehouseId(null);
    setOpenCreate(true);
  };

  const openLocationsModal = (currentWarehouse: { warehouseId: string; name: string }) => {
    setWarehouse(currentWarehouse);
    setOpenLocationsWarehouseId(currentWarehouse.warehouseId);
  };

  const closeLocationsModal = () => {
    setOpenLocationsWarehouseId(null);
    setWarehouse(null);
  };

  const startEdit = (warehouseId: string) => {
    setOpenCreate(false);
    setEditingWarehouseId(warehouseId);
  };

  const closeFormModal = () => {
    setOpenCreate(false);
    setEditingWarehouseId(null);
  };

  const confirmDelete = async () => {
    if (!deletingWarehouseId) return;
    const w = warehouses.find((x) => x.warehouseId === deletingWarehouseId);
    if (w) await setActive(deletingWarehouseId, !w.isActive);
    setDeletingWarehouseId(null);
  };

  const formatDate = (value: string) => {
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
  };

  const columns = useMemo(
    () =>
      getWarehouseColumns({
        primaryColor: PRIMARY,
        columnVisibility,
        formatDate,
        onEdit: startEdit,
        onOpenLocations: openLocationsModal,
        onToggleActive: setDeletingWarehouseId,
      }),
    [columnVisibility]
  );

  const canExpandRows = useMemo(
    () => hasHiddenExpandableFields(warehouseExpandedFields, columnVisibility),
    [columnVisibility]
  );

  const table = useReactTable({
    data: sortedWarehouses,
    columns,
    state: {
      pagination: paginationState,
      expanded,
      columnVisibility,
    },
    onPaginationChange: setPaginationState,
    onExpandedChange: setExpanded,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: () => canExpandRows,
    getRowId: (row) => row.warehouseId,
    manualPagination: true,
    pageCount: totalPages,
  });

  const buildCsv = (
    rows: Array<{
      warehouseId: string;
      name: string;
      department: string;
      province: string;
      district: string;
      address: string | null;
      isActive: boolean;
      createdAt: string;
      updatedAt: string;
    }>
  ) => {
    const header = [
      "id",
      "name",
      "department",
      "province",
      "district",
      "address",
      "isActive",
      "createdAt",
      "updatedAt",
    ];
    const escape = (value: string) => {
      if (value.includes('"') || value.includes(",") || value.includes("\n")) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    const lines = rows.map((row, index) => {
      const csvId = String(index + 1).padStart(5, "0");
      return [
        csvId,
        row.name,
        row.department,
        row.province,
        row.district,
        row.address ?? "",
        String(row.isActive),
        formatDate(row.createdAt),
        formatDate(row.updatedAt),
      ]
        .map((v) => escape(String(v)))
        .join(",");
    });

    return [header.join(","), ...lines].join("\n");
  };

  const downloadCsv = async () => {
    if (exporting) return;
    setExporting(true);

    try {
      const pageSize = 100;
      const first = await listWarehouses({ ...queryParams, page: 1, limit: pageSize });
      const allItems = [...(first.items ?? [])];
      const pages = Math.max(1, Math.ceil((first.total ?? allItems.length) / pageSize));

      for (let p = 2; p <= pages; p += 1) {
        const res = await listWarehouses({ ...queryParams, page: p, limit: pageSize });
        if (res.items?.length) allItems.push(...res.items);
      }

      const sorted = [...allItems].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      const csv = `\uFEFF${buildCsv(sorted)}`;

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "almacenes.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-white text-black">
      <PageTitle title="Almacenes" />

      <div className="mx-auto w-full max-w-[1500px] space-y-4  px-4 py-4 sm:px-6 lg:px-8 
      2xl:max-w-[1700px] 3xl:max-w-[1900px]">
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
          animate={shouldReduceMotion ? false : { opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"
        >
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">Almacenes</h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-lg border border-black/10 bg-black/[0.02] px-3 py-2 text-xs">
              Total: <span className="font-semibold text-black">{total}</span>
            </div>

            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-2 text-xs hover:bg-black/[0.03] disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-black/10"
              onClick={downloadCsv}
              disabled={exporting}
              title="Exportar CSV"
            >
              <Download className="h-4 w-4" />
              {exporting ? "Exportando..." : "Exportar CSV"}
            </button>

            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs text-white focus:outline-none focus:ring-2"
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
              <Plus className="h-4 w-4" />
              Nuevo almacen
            </button>
          </div>
        </motion.div>

        <motion.section
          initial={shouldReduceMotion ? false : "hidden"}
          animate={shouldReduceMotion ? false : "show"}
          variants={fadeUp}
          className="bg-gray-50 p-4 shadow-sm sm:p-5"
        >
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(220px,1fr)_240px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" />
              <input
                className="h-10 w-full rounded-lg border border-black/10 bg-white pl-10 pr-3 text-sm outline-none focus:ring-2"
                style={{ "--tw-ring-color": `color-mix(in srgb, ${PRIMARY} 20%, transparent)` } as CSSProperties}
                placeholder="Buscar (nombre / depto / provincia / distrito)"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
              />
            </div>

            <div className="relative">
              <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 
              text-black/40" />
              <select
                className="h-10 w-full appearance-none rounded-lg border border-black/10 bg-white pl-10 pr-9
                 text-sm outline-none focus:ring-2"
                style={{ "--tw-ring-color": `color-mix(in srgb, ${PRIMARY} 20%, transparent)` } as CSSProperties}
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setPaginationState((prev) => ({ ...prev, pageIndex: 0 }));
                  setExpanded({});
                }}
              >
                <option value="active">Activos</option>
                <option value="inactive">Eliminados</option>
              </select>
            </div>

            <DataTableColumnMenu
              table={table}
              open={showColumnMenu}
              onToggleOpen={() => setShowColumnMenu((prev) => !prev)}
              hiddenColumnIds={["expander", "actions"]}
            />
          </div>
        </motion.section>

        <motion.section
          initial={shouldReduceMotion ? false : "hidden"}
          animate={shouldReduceMotion ? false : "show"}
          variants={fadeUp}
          className="overflow-hidden bg-white shadow-sm"
        >
          <DataTable
            table={table}
            loading={loading}
            error={error ? String(error) : null}
            emptyMessage="No hay almacenes con los filtros actuales."
            renderExpandedRow={(row) => (
              <WarehouseExpandedRow warehouse={row.original} columnVisibility={columnVisibility} />
            )}
            headerCellClassName={(header) => {
              if (header.column.id === "actions") return "px-5 py-3 text-right";
              if (header.column.id === "expander") return "px-5 py-3 text-center";
              return "px-5 py-3 text-left";
            }}
            bodyCellClassName={(cell) => {
              if (cell.column.id === "actions") return "px-5 py-3 align-middle text-right";
              if (cell.column.id === "expander") return "px-5 py-3 align-middle text-center";
              return "px-5 py-3 align-middle";
            }}
          />

          <DataTablePagination
            loading={loading}
            total={total}
            page={safePage}
            totalPages={totalPages}
            startIndex={startIndex}
            endIndex={endIndex}
            pageSize={paginationState.pageSize}
            hasPrev={hasPrev}
            hasNext={hasNext}
            onPageSizeChange={(value) => {
              setPaginationState({ pageIndex: 0, pageSize: value });
              setExpanded({});
            }}
            onPrevious={() => table.previousPage()}
            onNext={() => table.nextPage()}
          />
        </motion.section>
      </div>

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
        <Modal title="Confirmar accion" onClose={() => setDeletingWarehouseId(null)} className="max-w-md">
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.985, y: 6 }}
            animate={shouldReduceMotion ? false : { opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.16 }}
          >
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-[11px] text-rose-800">
              <span className="font-semibold">Ojo:</span> estas por cambiar el estado de un almacen. Hazlo solo si estas seguro.
            </div>

            <p className="mt-3 text-[11px] text-black/70">
              Confirmas esta accion? Puede afectar disponibilidad, reportes y procesos internos.
            </p>

            <div className="mt-4 flex justify-end gap-2">
              <button
                className="rounded-lg border border-black/10 bg-white px-4 py-2 text-[11px] hover:bg-black/[0.03] focus:outline-none focus:ring-2 focus:ring-black/10"
                onClick={() => setDeletingWarehouseId(null)}
              >
                Cancelar
              </button>
              <button
                className="rounded-lg border border-rose-600/20 bg-rose-600 px-4 py-2 text-[11px] text-white hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-600/25"
                onClick={confirmDelete}
              >
                Confirmar
              </button>
            </div>
          </motion.div>
        </Modal>
      )}

      <WarehouseLocationsModal
        open={Boolean(openLocationsWarehouseId && warehouse)}
        warehouse={warehouse}
        onClose={closeLocationsModal}
        primaryColor={PRIMARY}
        primaryHover={PRIMARY_HOVER}
      />
    </div>
  );
}
