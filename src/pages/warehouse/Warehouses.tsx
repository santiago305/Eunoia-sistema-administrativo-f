import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { PageTitle } from "@/components/PageTitle";
import { Modal } from "@/components/modales/Modal";
import { motion, useReducedMotion } from "framer-motion";
import { Boxes, Download, Filter, Menu, Pencil, Plus, Power } from "lucide-react";

import { useWarehouses } from "@/hooks/useWarehouse";
import { listWarehouses } from "@/services/warehouseServices";
import type { Warehouse } from "@/pages/warehouse/types/warehouse";
import { WarehouseFormModal } from "@/pages/warehouse/components/WarehouseFormModal";
import { WarehouseLocationsModal } from "./components/LocationModal";
import { FloatingInput } from "@/components/FloatingInput";
import { FloatingSelect } from "@/components/FloatingSelect";
import { SystemButton } from "@/components/SystemButton";
import { ActionsPopover } from "@/components/ActionsPopover";
import { StatusPill } from "@/components/StatusTag";
import { SectionHeaderForm } from "@/components/SectionHederForm";

import { DataTable } from "@/components/table/DataTable";
import type { DataTableColumn } from "@/components/table/types";
import { Headed } from "@/components/Headed";
import { PageShell } from "@/components/layout/PageShell";

const PRIMARY = "hsl(var(--primary))";
const PRIMARY_HOVER = "#1aa392";
const DEFAULT_LIMIT = 10;

const statusOptions = [
  { value: "active", label: "Activos" },
  { value: "inactive", label: "Eliminados" },
];

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

  const [paginationState, setPaginationState] = useState({
    pageIndex: 0,
    pageSize: DEFAULT_LIMIT,
  });
  const page = paginationState.pageIndex + 1;
  const limit = paginationState.pageSize;

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

  const effectiveLimit = apiLimit ?? limit;
  const safePage = apiPage ?? page;

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

  const columns = useMemo<DataTableColumn<Warehouse>[]>(
    () => [
      {
        id: "name",
        header: "Almacén",
        accessorKey: "name",
        className: "text-black/70",
        cardTitle: true,
      },
      {
        id: "department",
        header: "Departamento",
        accessorKey: "department",
        className: "text-black/70",
        sortable:false
      },
      {
        id: "province",
        header: "Provincia",
        accessorKey: "province",
        className: "text-black/70",
        sortable:false
      },
      {
        id: "district",
        header: "Distrito",
        accessorKey: "district",
        className: "text-black/70",
        sortable:false
      },
      {
        id: "address",
        header: "Dirección",
        cell: (row) => <span className="text-black/70">{row.address ?? "-"}</span>,
        className: "text-black/70",
        visible: false,
        hideable: true,
        sortable:false
      },
      {
        id: "status",
        header: "Estado",
        cell: (row) => <StatusPill active={row.isActive} PRIMARY={PRIMARY} />,
        headerClassName: "text-left",
        sortable:false
      },
      {
        id: "createdAt",
        header: "Creado",
        cell: (row) => <span className="text-black/60 text-xs">{formatDate(row.createdAt)}</span>,
        visible: false,
        hideable: true,
        sortable:false
      },
      {
        id: "actions",
        header: "ACCIONES",
        cell: (row) => (
          <div className="flex justify-center">
            <ActionsPopover
              actions={[
                {
                  id: "locations",
                  label: "Ver ubicaciones",
                  icon: <Boxes className="h-4 w-4 text-black/60" />,
                  onClick: () => openLocationsModal({ warehouseId: row.warehouseId, name: row.name }),
                },
                {
                  id: "edit",
                  label: "Editar",
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
              popoverClassName="min-w-52"
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
          </div>
        ),
        headerClassName: "text-center",
        hideable: false,
      },
    ],
    [formatDate, openLocationsModal, startEdit]
  );

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
    <PageShell>
      <PageTitle title="Almacenes" />

      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between my-4">
          <Headed
            title="Almacenes"
            size="lg"
          />

          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-lg border border-black/10 bg-black/[0.02] px-3 py-1 text-[10px]">
              Total: <span className="font-semibold text-black">{total}</span>
            </div>

            <SystemButton
              variant="outline"
              size="sm"
              leftIcon={<Download className="h-4 w-4" />}
              onClick={downloadCsv}
              disabled={exporting}
              title="Exportar CSV"
            >
              {exporting ? "Exportando..." : "Exportar CSV"}
            </SystemButton>

            <SystemButton
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={startCreate}
              title="Nuevo almacén"
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
              Nuevo almacén
            </SystemButton>
          </div>
        </div>

        <section className="rounded-2xl border border-black/10 bg-gray-50 p-4 shadow-sm space-y-4">
          <SectionHeaderForm icon={Filter} title="Filtros" />

          <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-[0.45fr_0.25fr_0.2fr]">
            <FloatingInput
              label="Buscar"
              name="warehouse-search"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              className="h-10 text-sm"
            />

            <FloatingSelect
              label="Estado"
              name="warehouse-status"
              value={statusFilter}
              options={statusOptions}
              onChange={(value) => {
                setStatusFilter(value);
                setPaginationState((prev) => ({ ...prev, pageIndex: 0 }));
              }}
              className="h-10 text-sm"
            />
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
          <DataTable
            tableId="warehouses-table"
            data={sortedWarehouses}
            columns={columns}
            rowKey="warehouseId"
            loading={loading}
            emptyMessage="No hay almacenes con los filtros actuales."
            hoverable={false}
            animated={false}
            selectableColumns
            pagination={{
              page: safePage,
              limit: effectiveLimit,
              total,
            }}
            onPageChange={(nextPage) => {
              setPaginationState((prev) => ({ ...prev, pageIndex: Math.max(0, nextPage - 1) }));
            }}
          />
          {error && <div className="px-4 py-3 text-sm text-rose-600">{String(error)}</div>}
        </section>
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
        entityLabel="almacén"
      />

      {deletingWarehouseId && (
        <Modal
          open={true}
          title="Confirmar acción"
          onClose={() => setDeletingWarehouseId(null)}
          className="w-[300px] max-h-[300px]"
        >
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.985, y: 6 }}
            animate={shouldReduceMotion ? false : { opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.16 }}
          >
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-[11px] text-rose-800">
              <span className="font-semibold">Ojo:</span> estás por cambiar el estado de un almacén. Hazlo solo si estás seguro.
            </div>

            <p className="mt-3 text-[11px] text-black/70">
              ¿Confirmas esta acción? Puede afectar disponibilidad, reportes y procesos internos.
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
        open={Boolean(openLocationsWarehouseId && warehouse)}
        warehouse={warehouse}
        onClose={closeLocationsModal}
        primaryColor={PRIMARY}
        primaryHover={PRIMARY_HOVER}
      />
    </PageShell>
  );
}

