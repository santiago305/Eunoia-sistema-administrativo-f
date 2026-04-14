import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { Modal } from "@/components/modales/Modal";
import { useReducedMotion } from "framer-motion";
import { MapPin, Pencil, Trash2 } from "lucide-react";
import {
  createLocation,
  getLocationById,
  listLocations,
  updateLocation,
  updateLocationActive,
} from "@/services/locationServices";
import type { Location, LocationForm } from "@/pages/warehouse/types/location";
import { errorResponse, successResponse } from "@/common/utils/response";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { IconButton } from "@/components/IconBoton";
import { FloatingInput } from "@/components/FloatingInput";
import { SectionHeaderForm } from "@/components/SectionHederForm";
import { SystemButton } from "@/components/SystemButton";
import { DataTable } from "@/components/table/DataTable";
import type { DataTableColumn } from "@/components/table/types";
import { AlertModal } from "@/components/AlertModal";

type WarehouseRef = { warehouseId: string; name: string } | null;

const PRIMARY = "hsl(var(--primary))";
const PRIMARY_HOVER = "#1aa392";

function buildEmptyLocationForm(warehouseId = ""): LocationForm {
  return {
    warehouseId,
    code: "",
    description: "",
    isActive: true,
  };
}

export type WarehouseLocationsModalProps = {
  open: boolean;
  warehouse: WarehouseRef;
  onClose: () => void;
  primaryColor: string;
  primaryHover: string;
};

export function WarehouseLocationsModal({
  open,
  warehouse,
  onClose,
  primaryColor,
  primaryHover,
}: WarehouseLocationsModalProps) {
  const shouldReduceMotion = useReducedMotion();
  const { showFlash, clearFlash } = useFlashMessage();
  const [page, setPage] = useState(1);
  const limit = 10;

  const [locations, setLocations] = useState<Location[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit,
    totalPages: 1,
    hasPrev: false,
    hasNext: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState<LocationForm>(buildEmptyLocationForm());
  const [editForm, setEditForm] = useState<LocationForm>(buildEmptyLocationForm());
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [deletingLocationId, setDeletingLocationId] = useState<string | null>(null);
  const [nextActiveState, setNextActiveState] = useState<boolean>(false);

  const loadLocations = useCallback(async () => {
    if (!warehouse?.warehouseId) return;

    clearFlash();
    setLoading(true);
    setError(null);

    try {
      const res = await listLocations({
        page,
        limit,
        warehouseId: warehouse.warehouseId,
      });

      setLocations(res.items ?? []);
      const nextTotal = res.total ?? 0;
      const nextPage = res.page ?? page;
      const nextLimit = res.limit ?? limit;
      const nextTotalPages = Math.max(1, Math.ceil(nextTotal / (nextLimit || limit)));

      setPagination({
        total: nextTotal,
        page: nextPage,
        limit: nextLimit,
        totalPages: nextTotalPages,
        hasPrev: nextPage > 1,
        hasNext: nextPage < nextTotalPages,
      });
    } catch {
      setLocations([]);
      setPagination((prev) => ({
        ...prev,
        total: 0,
        totalPages: 1,
        hasPrev: false,
        hasNext: false,
      }));
      setError("Error al listar ubicaciones");
      showFlash(errorResponse("Error al listar ubicaciones"));
    } finally {
      setLoading(false);
    }
  }, [clearFlash, page, showFlash, warehouse?.warehouseId]);

  useEffect(() => {
    if (!open) return;

    setPage(1);
    setCreateForm(buildEmptyLocationForm(warehouse?.warehouseId ?? ""));
  }, [open, warehouse?.warehouseId]);

  useEffect(() => {
    if (!open) return;
    void loadLocations();
  }, [loadLocations, open]);

  const openEdit = async (id: string) => {
    try {
      const row = await getLocationById(id);
      setEditForm({
        warehouseId: row.warehouseId,
        code: row.code ?? "",
        description: row.description ?? "",
        isActive: row.isActive,
      });
      setEditingLocationId(id);
    } catch {
      showFlash(errorResponse("No se pudo cargar la ubicacion"));
    }
  };

  const saveCreate = async () => {
    if (!createForm.warehouseId || !createForm.code.trim()) return;

    try {
      await createLocation({
        warehouseId: createForm.warehouseId,
        code: createForm.code.trim(),
        description: createForm.description.trim() || undefined,
      });

      setCreateForm(buildEmptyLocationForm(createForm.warehouseId));
      await loadLocations();
      showFlash(successResponse("Ubicacion creada"));
    } catch {
      showFlash(errorResponse("Error al crear ubicacion"));
    }
  };

  const saveEdit = async () => {
    if (!editingLocationId) return;

    try {
      await updateLocation(editingLocationId, {
        warehouseId: editForm.warehouseId || undefined,
        code: editForm.code.trim() || undefined,
        description: editForm.description.trim() || undefined,
      });

      await updateLocationActive(editingLocationId, { isActive: editForm.isActive });
      setEditingLocationId(null);
      await loadLocations();
      showFlash(successResponse("Ubicacion actualizada"));
    } catch {
      showFlash(errorResponse("Error al editar ubicacion"));
    }
  };

  const confirmToggleActive = async () => {
    if (!deletingLocationId) return;

    try {
      await updateLocationActive(deletingLocationId, { isActive: nextActiveState });
      setDeletingLocationId(null);
      await loadLocations();
      showFlash(
        successResponse(nextActiveState ? "Ubicacion restaurada" : "Ubicacion desactivada"),
      );
    } catch {
      showFlash(errorResponse("Error al cambiar estado"));
    }
  };

  const columns = useMemo<DataTableColumn<Location>[]>(
    () => [
      {
        id: "code",
        header: "Codigo",
        accessorKey: "code",
        className: "font-medium",
        cardTitle: true,
      },
      {
        id: "description",
        header: "Descripcion",
        cell: (row) => <span className="text-black/70">{row.description ?? "-"}</span>,
      },
      {
        id: "status",
        header: "Estado",
        cell: (row) => (
          <span
            className={[
              "inline-flex rounded-full px-2 py-1 text-[11px] font-medium",
              row.isActive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700",
            ].join(" ")}
          >
            {row.isActive ? "Activo" : "Inactivo"}
          </span>
        ),
        headerClassName: "text-center [&>div]:justify-center",
        className: "text-center",
        sortAccessor: (row) => Number(row.isActive),
      },
      {
        id: "actions",
        header: "Acciones",
        stopRowClick: true,
        cell: (row) => (
          <div className="flex items-center justify-end gap-2">
            <IconButton
              title="Editar"
              onClick={() => void openEdit(row.locationId)}
              PRIMARY={PRIMARY}
              PRIMARY_HOVER={PRIMARY_HOVER}
            >
              <Pencil className="h-4 w-4" />
            </IconButton>
            <IconButton
              title={row.isActive ? "Eliminar" : "Activar"}
              onClick={() => {
                setDeletingLocationId(row.locationId);
                setNextActiveState(!row.isActive);
              }}
              tone={row.isActive ? "danger" : "primary"}
              PRIMARY={PRIMARY}
              PRIMARY_HOVER={PRIMARY_HOVER}
            >
              <Trash2 className="h-4 w-4" />
            </IconButton>
          </div>
        ),
        className: "text-right",
        headerClassName: "text-right [&>div]:justify-end",
        hideable: false,
        sortable: false,
      },
    ],
    [],
  );

  const safePage = Math.max(1, pagination.page || page);
  const canCreate = Boolean(createForm.warehouseId && createForm.code.trim());

  if (!open || !warehouse) return null;

  return (
    <>
      <Modal
        open={open}
        title={`Ubicaciones del almacen - ${warehouse.name}`}
        onClose={onClose}
      >
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[180px_minmax(0,1fr)_120px]">
            <FloatingInput
              label="Codigo"
              name="location-create-code"
              value={createForm.code}
              onChange={(e) =>
                setCreateForm((prev) => ({
                  ...prev,
                  code: e.target.value,
                }))
              }
            />

            <FloatingInput
              label="Descripcion"
              name="location-create-description"
              value={createForm.description}
              onChange={(e) =>
                setCreateForm((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
            />

            <div className="flex items-end">
              <SystemButton
                size="sm"
                className="h-10 w-full text-sm"
                style={{
                  backgroundColor: primaryColor,
                  borderColor: `color-mix(in srgb, ${primaryColor} 20%, transparent)`,
                }}
                onClick={() => void saveCreate()}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = primaryHover;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = primaryColor;
                }}
                disabled={!canCreate}
              >
                Crear
              </SystemButton>
            </div>
          </div>

          <DataTable
            tableId={`warehouse-locations-${warehouse.warehouseId}`}
            data={locations}
            columns={columns}
            rowKey="locationId"
            loading={loading}
            emptyMessage="No hay ubicaciones registradas."
            animated={!shouldReduceMotion}
            tableClassName="text-sm"
            pagination={{
              page: safePage,
              limit: pagination.limit || limit,
              total: pagination.total,
            }}
            onPageChange={(nextPage) => setPage(Math.max(1, nextPage))}
          />

          {error ? <div className="px-2 text-sm text-rose-600">{error}</div> : null}
        </div>
      </Modal>

      {editingLocationId ? (
        <Modal
          open={Boolean(editingLocationId)}
          title="Editar ubicacion"
          onClose={() => setEditingLocationId(null)}
          className="w-[320px] max-h-[320px]"
        >
          <LocationFormFields form={editForm} setForm={setEditForm} />
          <div className="mt-4 flex justify-end gap-2">
            <SystemButton
              variant="outline"
              size="md"
              className="rounded-2xl"
              onClick={() => setEditingLocationId(null)}
            >
              Cancelar
            </SystemButton>
            <SystemButton
              size="md"
              className="rounded-2xl"
              style={{
                backgroundColor: primaryColor,
                borderColor: `color-mix(in srgb, ${primaryColor} 20%, transparent)`,
              }}
              onClick={() => void saveEdit()}
            >
              Guardar cambios
            </SystemButton>
          </div>
        </Modal>
      ) : null}

      <AlertModal
        open={Boolean(deletingLocationId)}
        type={nextActiveState ? "restore" : "warning"}
        title={nextActiveState ? "Restaurar ubicacion" : "Desactivar ubicacion"}
        message={
          nextActiveState
            ? "Se activara la ubicacion nuevamente."
            : "Se desactivara la ubicacion seleccionada."
        }
        confirmText={nextActiveState ? "Activar" : "Desactivar"}
        onClose={() => setDeletingLocationId(null)}
        onConfirm={() => {
          void confirmToggleActive();
        }}
      />
    </>
  );
}

function LocationFormFields({
  form,
  setForm,
}: {
  form: LocationForm;
  setForm: Dispatch<SetStateAction<LocationForm>>;
}) {
  return (
    <div className="space-y-4">
      <SectionHeaderForm icon={MapPin} title="Datos de ubicacion" />
      <FloatingInput
        label="Codigo"
        name="location-code"
        value={form.code}
        onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
      />

      <FloatingInput
        label="Descripcion"
        name="location-description"
        value={form.description}
        onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
      />
    </div>
  );
}

export default function Locations() {
  return null;
}
