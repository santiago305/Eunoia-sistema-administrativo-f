import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { Modal } from "@/components/modales/Modal";
import { motion, useReducedMotion } from "framer-motion";
import { MapPin, Pencil, Plus, Power } from "lucide-react";

import { createLocation, getLocationById, listLocations, updateLocation, updateLocationActive } from "@/services/locationServices";
import type { Location, LocationForm } from "@/pages/warehouse/types/location";
import { errorResponse, successResponse } from "@/common/utils/response";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { IconButton } from "@/components/IconBoton";
import { FloatingInput } from "@/components/FloatingInput";
import { FloatingSelect } from "@/components/FloatingSelect";
import { SectionHeaderForm } from "@/components/SectionHederForm";
import { SystemButton } from "@/components/SystemButton";
import { DataTable } from "@/components/table/DataTable";
import type { DataTableColumn } from "@/components/table/types";

type WarehouseRef = { warehouseId: string; name: string } | null;

const PRIMARY = "hsl(var(--primary))";
const PRIMARY_HOVER = "#1aa392";

const statusFilterOptions = [
    { value: "all", label: "Todos" },
    { value: "active", label: "Activos" },
    { value: "inactive", label: "Eliminados" },
];

export type WarehouseLocationsModalProps = {
    open: boolean;
    warehouse: WarehouseRef;
    onClose: () => void;
    primaryColor: string;
    primaryHover: string;
};

export function WarehouseLocationsModal({ open, warehouse, onClose, primaryColor, primaryHover }: WarehouseLocationsModalProps) {
    const shouldReduceMotion = useReducedMotion();
    const { showFlash, clearFlash } = useFlashMessage();
    const [statusFilter, setStatusFilter] = useState("all");
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

    const [openCreate, setOpenCreate] = useState(false);
    const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
    const [deletingLocationId, setDeletingLocationId] = useState<string | null>(null);
    const [nextActiveState, setNextActiveState] = useState<boolean>(false);

    const [form, setForm] = useState<LocationForm>({
        warehouseId: "",
        code: "",
        description: "",
        isActive: true,
    });

    const loadLocations = async () => {
        if (!warehouse?.warehouseId || loading) return;
        clearFlash();
        setLoading(true);
        setError(null);
        try {
            const isActiveParam =
                statusFilter === "active" ? "true" : statusFilter === "inactive" ? "false" : undefined;

            const res = await listLocations({
                page,
                limit,
                isActive: isActiveParam,
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
    };

    useEffect(() => {
        if (!open) return;
        setPage(1);
        setStatusFilter("all");
    }, [open, warehouse?.warehouseId]);

    useEffect(() => {
        if (!open) return;
        void loadLocations();
    }, [open, page, statusFilter, warehouse?.warehouseId]);

    const openNew = () => {
        if (!warehouse?.warehouseId) return;
        setForm({
            warehouseId: warehouse.warehouseId,
            code: "",
            description: "",
            isActive: true,
        });
        setOpenCreate(true);
    };

    const openEdit = async (id: string) => {
        try {
            const row = await getLocationById(id);
            setForm({
                warehouseId: row.warehouseId,
                code: row.code ?? "",
                description: (row.description ?? "") as string,
                isActive: row.isActive,
            });
            setEditingLocationId(id);
        } catch {
            showFlash(errorResponse("No se pudo cargar la ubicación"));
        }
    };

    const saveCreate = async () => {
        if (!form.warehouseId || !form.code.trim()) return;

        try {
            await createLocation({
                warehouseId: form.warehouseId,
                code: form.code.trim(),
                description: form.description.trim() || undefined,
            });
            setOpenCreate(false);
            await loadLocations();
            showFlash(successResponse("Ubicación creada"));
        } catch {
            showFlash(errorResponse("Error al crear ubicación"));
        }
    };

    const saveEdit = async () => {
        if (!editingLocationId) return;

        try {
            await updateLocation(editingLocationId, {
                warehouseId: form.warehouseId || undefined,
                code: form.code.trim() || undefined,
                description: form.description.trim() || undefined,
            });

            await updateLocationActive(editingLocationId, { isActive: form.isActive });
            setEditingLocationId(null);
            await loadLocations();
            showFlash(successResponse("Ubicación actualizada"));
        } catch {
            showFlash(errorResponse("Error al editar ubicación"));
        }
    };

    const confirmToggleActive = async () => {
        if (!deletingLocationId) return;

        try {
            await updateLocationActive(deletingLocationId, { isActive: nextActiveState });
            setDeletingLocationId(null);
            await loadLocations();
            showFlash(successResponse(nextActiveState ? "Ubicación restaurada" : "Ubicación desactivada"));
        } catch {
            showFlash(errorResponse("Error al cambiar estado"));
        }
    };

    const columns = useMemo<DataTableColumn<Location>[]>(
        () => [
            {
                id: "code",
                header: "Código",
                accessorKey: "code",
                className: "font-medium",
                cardTitle: true,
            },
            {
                id: "description",
                header: "Descripción",
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
            },
            {
                id: "actions",
                header: "Acciones",
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
                            title={row.isActive ? "Desactivar" : "Activar"}
                            onClick={() => {
                                setDeletingLocationId(row.locationId);
                                setNextActiveState(!row.isActive);
                            }}
                            tone={row.isActive ? "danger" : "primary"}
                            PRIMARY={PRIMARY}
                            PRIMARY_HOVER={PRIMARY_HOVER}
                        >
                            <Power className="h-4 w-4" />
                        </IconButton>
                    </div>
                ),
                className: "text-right",
                headerClassName: "text-right",
                hideable: false,
            },
        ],
        [openEdit],
    );

    const safePage = Math.max(1, pagination.page || page);

    if (!open || !warehouse) return null;

    return (
        <>
            <Modal
                open={open}
                title={`Ubicaciones del almacén - ${warehouse.name}`}
                onClose={onClose}
                className="w-[500px] max-h-[500px]"
            >
                <motion.div
                    initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.985, y: 6 }}
                    animate={shouldReduceMotion ? false : { opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.16 }}
                >
                    <div className="mb-4 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <SectionHeaderForm icon={MapPin} title="Ubicaciones" />
                            <div className="text-xs text-black/60">
                                {loading ? "Cargando..." : `${pagination.total} registros`}
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="grid grid-cols-2 items-center gap-2">
                                <FloatingSelect
                                    label="Estado"
                                    name="location-status-filter"
                                    value={statusFilter}
                                    options={statusFilterOptions}
                                    onChange={(value) => {
                                        setStatusFilter(value);
                                        setPage(1);
                                    }}
                                    placeholder="Estado"
                                    className="h-9 text-sm"
                                    containerClassName="min-w-[180px]"
                                />
                                <SystemButton
                                    size="sm"
                                    className="text-sm"
                                    leftIcon={<Plus className="h-4 w-4" />}
                                    style={{ backgroundColor: primaryColor, borderColor: `color-mix(in srgb, ${primaryColor} 20%, transparent)` }}
                                    onClick={openNew}
                                    onMouseEnter={(e) => {
                                        (e.currentTarget as HTMLButtonElement).style.backgroundColor = primaryHover;
                                    }}
                                    onMouseLeave={(e) => {
                                        (e.currentTarget as HTMLButtonElement).style.backgroundColor = primaryColor;
                                    }}
                                >
                                    Nueva ubicación
                                </SystemButton>
                            </div>

                            <div className="flex items-center gap-2">
                            </div>
                        </div>
                    </div>

                    <DataTable
                        tableId={`warehouse-locations-${warehouse.warehouseId}`}
                        data={locations}
                        columns={columns}
                        rowKey="locationId"
                        loading={loading}
                        emptyMessage="No hay ubicaciones con los filtros actuales."
                        animated={!shouldReduceMotion}
                        tableClassName="text-sm"
                        pagination={{
                            page: safePage,
                            limit: pagination.limit || limit,
                            total: pagination.total,
                        }}
                        onPageChange={(nextPage) => setPage(Math.max(1, nextPage))}
                    />

                    {error && <div className="px-5 py-4 text-sm text-rose-600">{error}</div>}
                </motion.div>
            </Modal>

            {openCreate && (
                <Modal
                    open={openCreate}
                    title="Nueva ubicación"
                    onClose={() => setOpenCreate(false)}
                    className="w-[300px] max-h-[300px]"
                >
                    <LocationFormFields form={form} setForm={setForm} />
                    <div className="mt-4 flex justify-end gap-2">
                        <SystemButton variant="outline" size="md" className="rounded-2xl" onClick={() => setOpenCreate(false)}>
                            Cancelar
                        </SystemButton>
                        <SystemButton
                            size="md"
                            className="rounded-2xl"
                            style={{ backgroundColor: primaryColor, borderColor: `color-mix(in srgb, ${primaryColor} 20%, transparent)` }}
                            onClick={() => void saveCreate()}
                            disabled={!form.warehouseId || !form.code.trim()}
                        >
                            Guardar
                        </SystemButton>
                    </div>
                </Modal>
            )}

            {editingLocationId && (
                <Modal
                    open={Boolean(editingLocationId)}
                    title="Editar ubicación"
                    onClose={() => setEditingLocationId(null)}
                    className="w-[300px] max-h-[300px]"
                >
                    <LocationFormFields form={form} setForm={setForm} />
                    <div className="mt-4 flex justify-end gap-2">
                        <SystemButton variant="outline" size="md" className="rounded-2xl" onClick={() => setEditingLocationId(null)}>
                            Cancelar
                        </SystemButton>
                        <SystemButton
                            size="md"
                            className="rounded-2xl"
                            style={{ backgroundColor: primaryColor, borderColor: `color-mix(in srgb, ${primaryColor} 20%, transparent)` }}
                            onClick={() => void saveEdit()}
                        >
                            Guardar cambios
                        </SystemButton>
                    </div>
                </Modal>
            )}

            {deletingLocationId && (
                <Modal
                    open={Boolean(deletingLocationId)}
                    title={nextActiveState ? "Restaurar ubicación" : "Desactivar ubicación"}
                    onClose={() => setDeletingLocationId(null)}
                    className="w-[300px] max-h-[300px]"
                >
                    <p className="text-sm text-black/70">
                        {nextActiveState ? "Se activará la ubicación nuevamente." : "Se desactivará la ubicación seleccionada."}
                    </p>
                    <div className="mt-4 flex justify-end gap-2">
                        <SystemButton variant="outline" size="md" className="rounded-2xl" onClick={() => setDeletingLocationId(null)}>
                            Cancelar
                        </SystemButton>
                        <SystemButton
                            size="md"
                            variant="danger"
                            className="rounded-2xl"
                            onClick={() => void confirmToggleActive()}
                        >
                            Confirmar
                        </SystemButton>
                    </div>
                </Modal>
            )}
        </>
    );
}

function LocationFormFields({ form, setForm }: { form: LocationForm; setForm: Dispatch<SetStateAction<LocationForm>> }) {
    return (
        <div className="space-y-4">
            <SectionHeaderForm icon={MapPin} title="Datos de ubicación" />
            <FloatingInput
                label="Código"
                name="location-code"
                value={form.code}
                onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
            />

            <FloatingInput
                label="Descripción (opcional)"
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
