import { useMemo, useState } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  type VisibilityState,
  useReactTable,
} from "@tanstack/react-table";
import { Box, ChevronDown, ChevronRight, Menu, Search, Sparkles } from "lucide-react";
import { ActionsPopover } from "@/components/ActionsPopover";
import { Headed } from "@/components/Headed";
import { StatusPill } from "@/components/StatusTag";
import { SystemButton } from "@/components/SystemButton";
import { DataTable as ModernDataTable } from "@/components/table/DataTable";
import type { DataTableColumn } from "@/components/table/types";
import { DataTable as LegacyDataTable } from "@/components/data-table/DataTable";
import { DataTableColumnMenu } from "@/components/data-table/DataTableColumnMenu";
import { DataTablePagination } from "@/components/data-table/DataTablePagination";
import { ExpandedHiddenFields } from "@/components/data-table/expanded-hidden-fields/ExpandedHiddenFields";
import type { ExpandedFieldConfig } from "@/components/data-table/type";
import { money } from "@/utils/functionPurchases";

const PRIMARY = "hsl(var(--primary))";

type MockProductRow = {
  id: string;
  customSku: string;
  sku: string;
  displayName: string;
  name: string;
  sourceType: "PRODUCT" | "VARIANT";
  isActive: boolean;
  presentation: string;
  variant: string;
  color: string;
  unit: string;
  price: number;
  cost: number;
  minStock: number;
  description: string;
};

const mockRows: MockProductRow[] = [
  {
    id: "prod-001",
    customSku: "JABAZU-01",
    sku: "00001",
    displayName: "Jabon de azufre 120g",
    name: "Jabon de azufre",
    sourceType: "PRODUCT",
    isActive: true,
    presentation: "120g",
    variant: "Base",
    color: "Amarillo",
    unit: "UNIDADES (NIU)",
    price: 18.5,
    cost: 8.2,
    minStock: 12,
    description: "Producto padre comercial con salida principal.",
  },
  {
    id: "var-001",
    customSku: "JABCUR-01",
    sku: "00002",
    displayName: "Jabon de curcuma 120g",
    name: "Jabon de curcuma",
    sourceType: "VARIANT",
    isActive: true,
    presentation: "120g",
    variant: "Curcuma",
    color: "Naranja",
    unit: "UNIDADES (NIU)",
    price: 19.9,
    cost: 8.9,
    minStock: 8,
    description: "Variante visible del grupo azufre con nombre comercial propio.",
  },
  {
    id: "prod-002",
    customSku: "ARCROS-01",
    sku: "00003",
    displayName: "Arcilla rosa 200g",
    name: "Arcilla rosa",
    sourceType: "PRODUCT",
    isActive: false,
    presentation: "200g",
    variant: "Base",
    color: "Rosa",
    unit: "BOLSAS (BLS)",
    price: 24.4,
    cost: 11.1,
    minStock: 6,
    description: "Padre inactivo para probar estado y filtros visuales.",
  },
  {
    id: "var-002",
    customSku: "ARCVER-02",
    sku: "00004",
    displayName: "Arcilla verde 200g",
    name: "Arcilla verde",
    sourceType: "VARIANT",
    isActive: true,
    presentation: "200g",
    variant: "Detox",
    color: "Verde",
    unit: "BOLSAS (BLS)",
    price: 25.9,
    cost: 12.6,
    minStock: 10,
    description: "Variante operativa usada para probar menus y expansion.",
  },
  {
    id: "prod-003",
    customSku: "SHASOL-01",
    sku: "00005",
    displayName: "Shampoo solido menta 90g",
    name: "Shampoo solido",
    sourceType: "PRODUCT",
    isActive: true,
    presentation: "90g",
    variant: "Menta",
    color: "Verde claro",
    unit: "UNIDADES (NIU)",
    price: 22,
    cost: 10.5,
    minStock: 14,
    description: "Ejemplo para ver ordenamiento y paginacion local.",
  },
  {
    id: "var-003",
    customSku: "SHAEUC-02",
    sku: "00006",
    displayName: "Shampoo solido eucalipto 90g",
    name: "Shampoo solido",
    sourceType: "VARIANT",
    isActive: true,
    presentation: "90g",
    variant: "Eucalipto",
    color: "Verde oscuro",
    unit: "UNIDADES (NIU)",
    price: 22.9,
    cost: 10.7,
    minStock: 9,
    description: "Variante para la segunda pagina del ejemplo.",
  },
];

const mockActions = (row: MockProductRow) => [
  {
    id: "edit",
    label: "Editar demo",
    onClick: () => window.alert(`Editar ${row.displayName}`),
  },
  {
    id: "toggle",
    label: row.isActive ? "Desactivar demo" : "Activar demo",
    danger: row.isActive,
    onClick: () => window.alert(`${row.isActive ? "Desactivar" : "Activar"} ${row.displayName}`),
  },
];

const modernColumns: DataTableColumn<MockProductRow>[] = [
  {
    id: "customSku",
    header: "ID",
    accessorKey: "customSku",
    searchable: true,
    sortable: true,
    pinned: "left",
  },
  {
    id: "displayName",
    header: "Producto",
    cell: (row) => (
      <div className="min-w-0">
        <div className="font-medium text-black">{row.displayName}</div>
        <div className="text-[10px] text-black/50">{row.sku}</div>
      </div>
    ),
    searchValue: (row) => `${row.displayName} ${row.sku} ${row.customSku}`,
    sortable: true,
    sortAccessor: (row) => row.displayName,
    cardTitle: true,
  },
  {
    id: "sourceType",
    header: "Origen",
    cell: (row) => (row.sourceType === "VARIANT" ? "Variante" : "Producto"),
    sortable: true,
    sortAccessor: (row) => row.sourceType,
  },
  {
    id: "presentation",
    header: "Presentacion",
    accessorKey: "presentation",
  },
  {
    id: "color",
    header: "Color",
    accessorKey: "color",
    visible: false,
  },
  {
    id: "price",
    header: "Precio",
    cell: (row) => money(row.price, "PEN"),
    sortable: true,
    sortAccessor: (row) => row.price,
  },
  {
    id: "status",
    header: "Estado",
    cell: (row) => <StatusPill active={row.isActive} PRIMARY={PRIMARY} />,
    sortable: true,
    sortAccessor: (row) => row.isActive,
  },
  {
    id: "actions",
    header: "ACCIONES",
    headerClassName: "text-center",
    cell: (row) => (
      <div className="flex justify-center">
        <ActionsPopover actions={mockActions(row)} columns={1} compact showLabels triggerIcon={<Menu className="h-4 w-4" />} popoverClassName="min-w-40" />
      </div>
    ),
    hideable: false,
    searchable: false,
    sortable: false,
    pinned: "right",
  },
];

const columnHelper = createColumnHelper<MockProductRow>();

const expandedFields: ExpandedFieldConfig<MockProductRow>[] = [
  { key: "description", label: "Descripcion" },
  { key: "unit", label: "Unidad" },
  { key: "minStock", label: "Stock minimo" },
  { key: "variant", label: "Variante" },
  { key: "color", label: "Color" },
];

export function ProductTablesPreview() {
  const [modernPage, setModernPage] = useState(1);
  const modernLimit = 4;
  const [selectedModernRows, setSelectedModernRows] = useState<string[]>([]);
  const modernSlice = useMemo(() => {
    const start = (modernPage - 1) * modernLimit;
    return mockRows.slice(start, start + modernLimit);
  }, [modernPage]);

  const [legacySearch, setLegacySearch] = useState("");
  const [legacySorting, setLegacySorting] = useState<SortingState>([]);
  const [legacyVisibility, setLegacyVisibility] = useState<VisibilityState>({
    description: false,
    unit: false,
    minStock: false,
    variant: false,
    color: false,
  });
  const [legacyColumnMenuOpen, setLegacyColumnMenuOpen] = useState(false);
  const [legacyPageSize, setLegacyPageSize] = useState(3);

  const legacyColumns = useMemo(
    () => [
      columnHelper.display({
        id: "expander",
        header: "",
        cell: ({ row }) => (
          <button
            type="button"
            onClick={row.getToggleExpandedHandler()}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-black/10 hover:bg-black/[0.03]"
          >
            {row.getIsExpanded() ? <ChevronDown className="h-4 w-4 text-black/60" /> : <ChevronRight className="h-4 w-4 text-black/60" />}
          </button>
        ),
      }),
      columnHelper.accessor("customSku", {
        id: "customSku",
        header: "ID",
        cell: (info) => <span className="font-medium text-black/80">{info.getValue()}</span>,
      }),
      columnHelper.accessor("displayName", {
        id: "displayName",
        header: "Nombre visible",
        cell: (info) => <div className="text-black/70">{info.getValue()}</div>,
      }),
      columnHelper.accessor("sourceType", {
        id: "sourceType",
        header: "Origen",
        cell: (info) => <div className="text-black/70">{info.getValue() === "VARIANT" ? "Variante" : "Producto"}</div>,
      }),
      columnHelper.accessor("price", {
        id: "price",
        header: "Precio",
        cell: (info) => <div className="text-black/70">{money(info.getValue(), "PEN")}</div>,
      }),
      columnHelper.accessor("description", {
        id: "description",
        header: "Descripcion",
        cell: (info) => <div className="text-black/70">{info.getValue()}</div>,
      }),
      columnHelper.accessor("unit", {
        id: "unit",
        header: "Unidad",
        cell: (info) => <div className="text-black/70">{info.getValue()}</div>,
      }),
      columnHelper.accessor("minStock", {
        id: "minStock",
        header: "Stock minimo",
        cell: (info) => <div className="text-black/70">{info.getValue()}</div>,
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end">
            <ActionsPopover
              actions={mockActions(row.original)}
              columns={1}
              compact
              showLabels
              triggerIcon={<Menu className="h-4 w-4" />}
              popoverClassName="min-w-40 p-2"
              itemClassName="justify-start px-3 py-2 text-[11px]"
            />
          </div>
        ),
      }),
    ],
    [],
  );

  const legacyTable = useReactTable({
    data: mockRows,
    columns: legacyColumns,
    state: {
      globalFilter: legacySearch,
      sorting: legacySorting,
      columnVisibility: legacyVisibility,
    },
    onGlobalFilterChange: setLegacySearch,
    onSortingChange: setLegacySorting,
    onColumnVisibilityChange: setLegacyVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: () => true,
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: legacyPageSize,
      },
    },
    globalFilterFn: (row, _columnId, value) => {
      const query = String(value ?? "").trim().toLowerCase();
      if (!query) return true;
      const record = row.original;
      return `${record.displayName} ${record.customSku} ${record.sku} ${record.description}`.toLowerCase().includes(query);
    },
  });

  const legacyRows = legacyTable.getRowModel().rows;
  const legacyPage = legacyTable.getState().pagination.pageIndex + 1;
  const legacyTotal = legacyTable.getFilteredRowModel().rows.length;
  const legacyTotalPages = legacyTable.getPageCount();
  const legacyStart = legacyTotal === 0 ? 0 : legacyTable.getState().pagination.pageIndex * legacyPageSize + 1;
  const legacyEnd = Math.min(legacyTable.getState().pagination.pageIndex * legacyPageSize + legacyRows.length, legacyTotal);

  return (
    <section className="space-y-5 rounded-2xl border border-dashed border-black/15 bg-black/[0.015] p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Headed title="Prueba De Tablas" size="md" />
          <p className="mt-1 text-xs text-black/55">
            Demo temporal para comparar `components/table` vs `components/data-table` con datos locales.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-medium text-amber-800">
          <Sparkles className="h-3.5 w-3.5" />
          Temporal
        </span>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <article className="space-y-3 rounded-2xl border border-black/10 bg-white p-4">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-black">`components/table/DataTable`</h3>
            <p className="text-xs text-black/55">
              Componente mas completo y opinionado. Ya trae busqueda, orden, columnas, cards responsive y seleccion.
            </p>
          </div>

          <div className="rounded-xl border border-black/10">
            <ModernDataTable
              tableId="products-preview-modern"
              data={modernSlice}
              columns={modernColumns}
              rowKey="id"
              showSearch
              searchPlaceholder="Buscar en demo..."
              selectableColumns
              selectableRows
              selectedRowKeys={selectedModernRows}
              onSelectedRowKeysChange={(keys) => setSelectedModernRows(keys)}
              initialSort={{ columnId: "displayName", direction: "asc" }}
              pagination={{
                page: modernPage,
                limit: modernLimit,
                total: mockRows.length,
              }}
              onPageChange={setModernPage}
              emptyMessage="Sin datos de prueba."
              tableClassName="text-[11px]"
            />
          </div>

          <div className="text-[11px] text-black/55">
            Seleccionadas: <span className="font-medium text-black">{selectedModernRows.length}</span>
          </div>
        </article>

        <article className="space-y-3 rounded-2xl border border-black/10 bg-white p-4">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-black">`components/data-table/DataTable`</h3>
            <p className="text-xs text-black/55">
              Version mas baja y manual. Requiere armar TanStack Table, menu de columnas, filtros y paginacion por fuera.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="relative block w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" />
              <input
                value={legacySearch}
                onChange={(event) => legacyTable.setGlobalFilter(event.target.value)}
                placeholder="Buscar en demo legacy..."
                className="h-10 w-full rounded-lg border border-black/10 bg-white pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-black/10"
              />
            </label>

            <div className="flex items-center gap-2">
              <DataTableColumnMenu
                table={legacyTable}
                open={legacyColumnMenuOpen}
                onToggleOpen={() => setLegacyColumnMenuOpen((prev) => !prev)}
                className="h-10"
              />
              <SystemButton
                variant="outline"
                size="sm"
                className="h-10"
                leftIcon={<Box className="h-4 w-4" />}
                onClick={() => {
                  legacyTable.resetColumnVisibility();
                  legacyTable.resetSorting();
                  legacyTable.resetExpanded();
                  legacyTable.setGlobalFilter("");
                }}
              >
                Reset
              </SystemButton>
            </div>
          </div>

          <div className="rounded-xl border border-black/10">
            <LegacyDataTable
              table={legacyTable}
              emptyMessage="Sin datos de prueba."
              renderExpandedRow={(row) => (
                <ExpandedHiddenFields
                  row={row.original}
                  fields={expandedFields}
                  columnVisibility={legacyVisibility}
                />
              )}
              headerCellClassName={(header) =>
                header.id === "actions" ? "px-5 py-3 text-right" : "px-5 py-3 text-left"
              }
              bodyCellClassName={(cell) =>
                cell.column.id === "actions" ? "px-5 py-3 text-right align-middle" : "px-5 py-3 align-middle"
              }
              containerClassName="overflow-auto"
              tableClassName="w-full table-fixed text-[11px]"
            />
            <DataTablePagination
              total={legacyTotal}
              page={legacyPage}
              totalPages={legacyTotalPages}
              startIndex={legacyStart}
              endIndex={legacyEnd}
              pageSize={legacyPageSize}
              hasPrev={legacyTable.getCanPreviousPage()}
              hasNext={legacyTable.getCanNextPage()}
              onPageSizeChange={(value) => {
                setLegacyPageSize(value);
                legacyTable.setPageSize(value);
              }}
              onPrevious={() => legacyTable.previousPage()}
              onNext={() => legacyTable.nextPage()}
            />
          </div>
        </article>
      </div>

      <div className="rounded-xl border border-black/10 bg-white p-4 text-xs text-black/60">
        <div className="font-medium text-black">Diferencia practica</div>
        <ul className="mt-2 list-disc space-y-1 pl-4">
          <li>`components/table` ya resuelve casi todo solo con columnas y props.</li>
          <li>`components/data-table` da mas control fino, pero obliga a montar TanStack Table manualmente.</li>
          <li>Para pantallas nuevas del backoffice, hoy conviene mucho mas `components/table/DataTable`.</li>
        </ul>
      </div>
    </section>
  );
}
