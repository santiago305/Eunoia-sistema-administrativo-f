import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { Modal } from "@/components/settings/modal";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Pencil, Plus, Power } from "lucide-react";

import { createLocation, getLocationById, listLocations, updateLocation, updateLocationActive } from "@/services/locationServices";
import type { Location, LocationForm } from "@/pages/warehouse/types/location";
import { errorResponse, successResponse } from "@/common/utils/response";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { IconButton } from "@/components/IconBoton";

type WarehouseRef = { warehouseId: string; name: string } | null;

const PRIMARY = "#21b8a6";
const PRIMARY_HOVER = "#1aa392";

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
            const res = await listLocations({
                page,
                limit,
                isActive:statusFilter === "active" ? "true" : "false",
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

    const safePage = Math.max(1, pagination.page || page);
    const totalPages = Math.max(1, pagination.totalPages);
    const startIndex = pagination.total === 0 ? 0 : (safePage - 1) * (pagination.limit || limit) + 1;
    const endIndex = Math.min(safePage * (pagination.limit || limit), pagination.total);

    const listKey = useMemo(() => `${page}|${statusFilter}|${warehouse?.warehouseId ?? ""}`, [page, statusFilter, warehouse?.warehouseId]);

    if (!open || !warehouse) return null;

    return (
        <>
            <Modal title={`Ubicaciones del almacén - ${warehouse.name}`} onClose={onClose} className="max-w-4xl">
                <motion.div
                    initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.985, y: 6 }}
                    animate={shouldReduceMotion ? false : { opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.16 }}
                >
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="rounded-lg border border-black/10 bg-black/[0.02] px-3 py-2 text-sm">
                                Total: <span className="font-semibold text-black">{pagination.total}</span>
                            </div>
                            <select
                                className="h-9 rounded-lg border border-black/10 bg-white px-3 text-sm outline-none focus:ring-2"
                                style={{ "--tw-ring-color": `${primaryColor}33` } as React.CSSProperties}
                                value={statusFilter}
                                onChange={(e) => {
                                    setStatusFilter(e.target.value);
                                    setPage(1);
                                }}
                            >
                                <option value="active">Activos</option>
                                <option value="inactive">Eliminados</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm hover:bg-black/[0.03] focus:outline-none focus:ring-2 focus:ring-black/10"
                                onClick={() => void loadLocations()}
                                disabled={loading}
                            >
                                {loading ? "Cargando..." : "Refrescar"}
                            </button>
                            <button
                                type="button"
                                onClick={openNew}
                                className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-white focus:outline-none focus:ring-2"
                                style={{ backgroundColor: primaryColor, borderColor: `${primaryColor}33` }}
                                onMouseEnter={(e) => {
                                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = primaryHover;
                                }}
                                onMouseLeave={(e) => {
                                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = primaryColor;
                                }}
                            >
                                <Plus className="h-4 w-4" /> Nueva ubicación
                            </button>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-black/10 bg-white shadow-sm overflow-hidden">
                        <div className="max-h-[60vh] overflow-auto">
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 z-10 bg-white">
                                    <tr className="border-b border-black/10 text-xs text-black/60">
                                        <th className="py-3 px-4 text-left">Código</th>
                                        <th className="py-3 px-4 text-left">Descripción</th>
                                        <th className="py-3 px-4 text-left">Estado</th>
                                        <th className="py-3 px-4 text-right">Acciones</th>
                                    </tr>
                                </thead>

                                <AnimatePresence mode="wait" initial={false}>
                                    <motion.tbody
                                        key={listKey}
                                        initial={shouldReduceMotion ? false : { opacity: 0 }}
                                        animate={shouldReduceMotion ? false : { opacity: 1 }}
                                        exit={shouldReduceMotion ? undefined : { opacity: 0 }}
                                    >
                                        {locations.map((loc) => (
                                            <tr key={loc.locationId} className="border-b border-black/5 hover:bg-black/[0.02]">
                                                <td className="py-3 px-4 font-medium">{loc.code}</td>
                                                <td className="py-3 px-4 text-black/70">{loc.description ?? "-"}</td>
                                                <td className="py-3 px-4">
                                                    <span
                                                        className={[
                                                            "inline-flex rounded-full px-2 py-1 text-[11px] font-medium",
                                                            loc.isActive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700",
                                                        ].join(" ")}
                                                    >
                                                        {loc.isActive ? "Activo" : "Inactivo"}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <IconButton
                                                            title="Editar"
                                                            onClick={() => void openEdit(loc.locationId)}
                                                            PRIMARY={PRIMARY}
                                                            PRIMARY_HOVER={PRIMARY_HOVER}
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </IconButton>
                                                        <IconButton
                                                            title={loc.isActive ? "Desactivar" : "Activar"}
                                                            onClick={() => {
                                                                setDeletingLocationId(loc.locationId);
                                                                setNextActiveState(!loc.isActive);
                                                            }}
                                                            tone={loc.isActive ? "danger" : "primary"}
                                                            PRIMARY={PRIMARY}
                                                            PRIMARY_HOVER={PRIMARY_HOVER}
                                                        >
                                                            <Power className="h-4 w-4" />
                                                        </IconButton>                                                    
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </motion.tbody>
                                </AnimatePresence>
                            </table>

                            {!loading && locations.length === 0 && (
                                <div className="px-5 py-8 text-sm text-black/60">No hay ubicaciones con los filtros actuales.</div>
                            )}
                            {error && <div className="px-5 py-4 text-sm text-rose-600">{error}</div>}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-4 border-t border-black/10 text-sm text-black/60">
                        <span className="hidden sm:inline">
                            Mostrando {startIndex}-{endIndex} de {pagination.total}
                        </span>

                        <div className="flex items-center gap-2">
                            <button
                                className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm hover:bg-black/[0.03] disabled:opacity-40"
                                disabled={!pagination.hasPrev || loading}
                                onClick={() => setPage(Math.max(1, safePage - 1))}
                                type="button"
                            >
                                Anterior
                            </button>

                            <span className="tabular-nums">
                                Pagina {safePage} de {totalPages}
                            </span>

                            <button
                                className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm hover:bg-black/[0.03] disabled:opacity-40"
                                disabled={!pagination.hasNext || loading}
                                onClick={() => setPage(safePage + 1)}
                                type="button"
                            >
                                Siguiente
                            </button>
                        </div>
                    </div>
                </motion.div>
            </Modal>

            {openCreate && (
                <Modal title="Nueva ubicación" onClose={() => setOpenCreate(false)} className="max-w-lg">
                    <LocationFormFields form={form} setForm={setForm} />
                    <div className="mt-4 flex justify-end gap-2">
                        <button className="rounded-2xl border border-black/10 px-4 py-2 text-sm" onClick={() => setOpenCreate(false)}>
                            Cancelar
                        </button>
                        <button
                            className="rounded-2xl border px-4 py-2 text-sm text-white"
                            style={{ backgroundColor: primaryColor, borderColor: `${primaryColor}33` }}
                            onClick={() => void saveCreate()}
                            disabled={!form.warehouseId || !form.code.trim()}
                        >
                            Guardar
                        </button>
                    </div>
                </Modal>
            )}

            {editingLocationId && (
                <Modal title="Editar ubicación" onClose={() => setEditingLocationId(null)} className="max-w-lg">
                    <LocationFormFields form={form} setForm={setForm} />
                    <div className="mt-4 flex justify-end gap-2">
                        <button className="rounded-2xl border border-black/10 px-4 py-2 text-sm" onClick={() => setEditingLocationId(null)}>
                            Cancelar
                        </button>
                        <button
                            className="rounded-2xl border px-4 py-2 text-sm text-white"
                            style={{ backgroundColor: primaryColor, borderColor: `${primaryColor}33` }}
                            onClick={() => void saveEdit()}
                        >
                            Guardar cambios
                        </button>
                    </div>
                </Modal>
            )}

            {deletingLocationId && (
                <Modal title={nextActiveState ? "Restaurar ubicación" : "Desactivar ubicación"} onClose={() => setDeletingLocationId(null)} className="max-w-md">
                    <p className="text-sm text-black/70">
                        {nextActiveState ? "Se activará la ubicación nuevamente." : "Se desactivará la ubicación seleccionada."}
                    </p>
                    <div className="mt-4 flex justify-end gap-2">
                        <button className="rounded-2xl border border-black/10 px-4 py-2 text-sm" onClick={() => setDeletingLocationId(null)}>
                            Cancelar
                        </button>
                        <button
                            className="rounded-2xl border px-4 py-2 text-sm text-white"
                            style={{ backgroundColor: primaryColor, borderColor: `${primaryColor}33` }}
                            onClick={() => void confirmToggleActive()}
                        >
                            Confirmar
                        </button>
                    </div>
                </Modal>
            )}
        </>
    );
}

function LocationFormFields({ form, setForm }: { form: LocationForm; setForm: Dispatch<SetStateAction<LocationForm>> }) {
    return (
        <div className="space-y-3">
            <label className="text-sm">
                Código
                <input
                    className="mt-2 h-10 w-full rounded-lg border border-black/10 px-3 text-sm"
                    value={form.code}
                    onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
                    placeholder=""
                />
            </label>

            <label className="text-sm">
                Descripción (opcional)
                <input
                    className="mt-2 h-10 w-full rounded-lg border border-black/10 px-3 text-sm"
                    value={form.description}
                    onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder=""
                />
            </label>

            <label className="text-sm">
                Estado
                <select
                    className="mt-2 h-10 w-full rounded-lg border border-black/10 px-3 text-sm bg-white"
                    value={form.isActive ? "active" : "inactive"}
                    onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.value === "active" }))}
                >
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                </select>
            </label>
        </div>
    );
}

export default function Locations() {
    return null;
}
