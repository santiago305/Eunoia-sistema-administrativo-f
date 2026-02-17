import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { PageTitle } from "@/components/PageTitle";
import { Modal } from "@/components/settings/modal";

import { createLocation, getLocationById, listLocations, updateLocation, updateLocationActive } from "@/services/locationServices";

import { listWarehouses } from "@/services/warehouseServices";

import type { Location } from "@/types/location";
import { errorResponse, successResponse } from "@/common/utils/response";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Pencil, Plus, Power, Search, SlidersHorizontal } from "lucide-react";
import { LocationForm } from '@/types/location'
import { WarehouseOption } from "@/types/warehouse";

const PRIMARY = "#21b8a6";
const PRIMARY_HOVER = "#1aa392";



export default function WarehouseLocations() {
    const shouldReduceMotion = useReducedMotion();
    const { showFlash, clearFlash } = useFlashMessage();
    const [searchParams] = useSearchParams();

    const [pendingWarehouseFromQuery, setPendingWarehouseFromQuery] = useState<{
        warehouseId: string;
        warehouseName: string;
        create: boolean;
    } | null>(null);

    const [searchText, setSearchText] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [warehouseFilter, setWarehouseFilter] = useState("");
    const [page, setPage] = useState(1);
    const limit = 10;

    const [locations, setLocations] = useState<Location[]>([]);
    const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
    const [total, setTotal] = useState(0);
    const [apiPage, setApiPage] = useState(1);
    const [apiLimit, setApiLimit] = useState(limit);
    const [loading, setLoading] = useState(false);

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

    useEffect(() => {
        const t = setTimeout(() => {
            setDebouncedSearch(searchText.trim());
            setPage(1);
        }, 400);
        return () => clearTimeout(t);
    }, [searchText]);

    const loadWarehouses = async () => {
        try {
            const batch = 100;
            const first = await listWarehouses({ page: 1, limit: batch });
            const all = [...(first.items ?? [])];
            const pages = Math.max(1, Math.ceil((first.total ?? all.length) / batch));

            for (let p = 2; p <= pages; p += 1) {
                const res = await listWarehouses({ page: p, limit: batch });
                if (res.items?.length) all.push(...res.items);
            }

            setWarehouses(all.map((w) => ({ warehouseId: w.warehouseId, name: w.name })));
        } catch {
            setWarehouses([]);
            showFlash(errorResponse("Error al cargar almacenes"));
        }
    };

    const loadLocations = async () => {
        clearFlash();
        setLoading(true);
        try {
            const res = await listLocations({
                page,
                limit,
                q: debouncedSearch || undefined,
                isActive: statusFilter === "all" ? undefined : statusFilter === "active" ? "true" : "false",
                warehouseId: warehouseFilter || undefined,
            });

            setLocations(res.items ?? []);
            setTotal(res.total ?? 0);
            setApiPage(res.page ?? page);
            setApiLimit(res.limit ?? limit);
        } catch {
            setLocations([]);
            setTotal(0);
            showFlash(errorResponse("Error al listar ubicaciones"));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadWarehouses();
    }, []);

    useEffect(() => {
        void loadLocations();
    }, [page, debouncedSearch, statusFilter, warehouseFilter]);

    useEffect(() => {
        if (apiPage !== page) setPage(apiPage);
    }, [apiPage, page]);

    useEffect(() => {
        const warehouseId = searchParams.get("warehouseId") ?? "";
        const warehouseName = searchParams.get("warehouseName") ?? "";
        const create = searchParams.get("create") === "1";
        if (!warehouseId) return;
        setPendingWarehouseFromQuery({ warehouseId, warehouseName, create });
    }, [searchParams]);

    useEffect(() => {
        if (!pendingWarehouseFromQuery) return;

        const exists = warehouses.some((w) => w.warehouseId === pendingWarehouseFromQuery.warehouseId);
        if (!exists && pendingWarehouseFromQuery.warehouseName) {
            setWarehouses((prev) => {
                if (prev.some((w) => w.warehouseId === pendingWarehouseFromQuery.warehouseId)) return prev;
                return [{ warehouseId: pendingWarehouseFromQuery.warehouseId, name: pendingWarehouseFromQuery.warehouseName }, ...prev];
            });
        }

        setWarehouseFilter(pendingWarehouseFromQuery.warehouseId);
        setForm((prev) => ({ ...prev, warehouseId: pendingWarehouseFromQuery.warehouseId }));

        if (pendingWarehouseFromQuery.create) setOpenCreate(true);

        setPendingWarehouseFromQuery(null);
    }, [pendingWarehouseFromQuery, warehouses]);

    const totalPages = Math.max(1, Math.ceil(total / (apiLimit || limit)));
    const startIndex = total === 0 ? 0 : (apiPage - 1) * (apiLimit || limit) + 1;
    const endIndex = Math.min(apiPage * (apiLimit || limit), total);

    const openNew = () => {
        setForm({
            warehouseId: warehouseFilter || "",
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
        if (!form.warehouseId) return;
        if (!form.code.trim()) return;

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

            // mantiene el patrón del archivo de variantes:
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

    const listKey = useMemo(() => `${page}|${statusFilter}|${warehouseFilter}|${debouncedSearch}`, [page, statusFilter, warehouseFilter, debouncedSearch]);

    const warehouseNameById = useMemo(() => {
        const map = new Map<string, string>();
        warehouses.forEach((w) => map.set(w.warehouseId, w.name));
        return map;
    }, [warehouses]);

    return (
        <div className="w-full min-h-screen bg-white text-black">
            <PageTitle title="Almacenes · Ubicaciones" />

            <div className="mx-auto w-full max-w-[1500px] 2xl:max-w-[1700px] 3xl:max-w-[1900px] px-4 sm:px-6 lg:px-8 py-6 space-y-6">
                <motion.div
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
                    animate={shouldReduceMotion ? false : { opacity: 1, y: 0 }}
                    transition={{ duration: 0.18 }}
                    className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"
                >
                    <div className="space-y-1">
                        <h1 className="text-2xl font-semibold tracking-tight">Ubicaciones</h1>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <div className="rounded-2xl border border-black/10 bg-black/[0.02] px-3 py-2 text-xs">
                            Total: <span className="font-semibold text-black">{total}</span>
                        </div>

                        <button
                            type="button"
                            onClick={openNew}
                            className="inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs text-white focus:outline-none focus:ring-2"
                            style={{ backgroundColor: PRIMARY, borderColor: `${PRIMARY}33` }}
                            onMouseEnter={(e) => {
                                (e.currentTarget as HTMLButtonElement).style.backgroundColor = PRIMARY_HOVER;
                            }}
                            onMouseLeave={(e) => {
                                (e.currentTarget as HTMLButtonElement).style.backgroundColor = PRIMARY;
                            }}
                        >
                            <Plus className="h-4 w-4" /> Nueva ubicación
                        </button>
                    </div>
                </motion.div>

                {/* Filtros */}
                <motion.section
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
                    animate={shouldReduceMotion ? false : { opacity: 1, y: 0 }}
                    transition={{ duration: 0.18 }}
                    className="rounded-3xl border border-black/10 bg-white p-4 sm:p-5 shadow-sm"
                >
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px_240px] gap-3">
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" />
                            <input
                                className="h-11 w-full rounded-2xl border border-black/10 bg-white pl-10 pr-3 text-sm outline-none focus:ring-2"
                                style={{ "--tw-ring-color": `${PRIMARY}33` } as React.CSSProperties}
                                placeholder="Buscar por código o descripción"
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                            />
                        </div>

                        <div className="relative">
                            <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" />
                            <select
                                className="h-11 w-full appearance-none rounded-2xl border border-black/10 bg-white pl-10 pr-9 text-sm outline-none focus:ring-2"
                                style={{ "--tw-ring-color": `${PRIMARY}33` } as React.CSSProperties}
                                value={warehouseFilter}
                                onChange={(e) => {
                                    setWarehouseFilter(e.target.value);
                                    setPage(1);
                                }}
                            >
                                <option value="">Almacén (todos)</option>
                                {warehouses.map((w) => (
                                    <option key={w.warehouseId} value={w.warehouseId}>
                                        {w.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <select
                            className="h-11 w-full rounded-2xl border border-black/10 bg-white px-3 text-sm outline-none focus:ring-2"
                            style={{ "--tw-ring-color": `${PRIMARY}33` } as React.CSSProperties}
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                setPage(1);
                            }}
                        >
                            <option value="all">Estado (todos)</option>
                            <option value="active">Activos</option>
                            <option value="inactive">Inactivos</option>
                        </select>
                    </div>
                </motion.section>

                {/* Listado */}
                <section className="rounded-3xl border border-black/10 bg-white shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-black/10">
                        <p className="text-sm font-semibold">Listado de ubicaciones</p>
                        <p className="text-xs text-black/60">{loading ? "Cargando..." : `Mostrando ${startIndex}-${endIndex} de ${total}`}</p>
                    </div>

                    <div className="max-h-[calc(100vh-330px)] overflow-auto">
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-white z-10">
                                <tr className="border-b border-black/10 text-xs text-black/60">
                                    <th className="py-3 px-5 text-left">Código</th>
                                    <th className="py-3 px-5 text-left">Descripción</th>
                                    <th className="py-3 px-5 text-left">Almacén</th>
                                    <th className="py-3 px-5 text-left">Estado</th>
                                    <th className="py-3 px-5 text-right">Acciones</th>
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
                                        <tr key={loc.locationId} className="border-b border-black/5">
                                            <td className="py-3 px-5 font-medium">{loc.code}</td>
                                            <td className="py-3 px-5 text-black/70">{loc.description ?? "-"}</td>
                                            <td className="py-3 px-5 text-black/60">{warehouseNameById.get(loc.warehouseId) ?? loc.warehouseId}</td>
                                            <td className="py-3 px-5">
                                                <span
                                                    className={[
                                                        "inline-flex rounded-full px-2 py-1 text-[11px] font-medium",
                                                        loc.isActive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700",
                                                    ].join(" ")}
                                                >
                                                    {loc.isActive ? "Activo" : "Inactivo"}
                                                </span>
                                            </td>
                                            <td className="py-3 px-5">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 bg-white hover:bg-black/[0.03]"
                                                        onClick={() => void openEdit(loc.locationId)}
                                                        title="Editar"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </button>

                                                    <button
                                                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 bg-white hover:bg-black/[0.03]"
                                                        onClick={() => {
                                                            setDeletingLocationId(loc.locationId);
                                                            setNextActiveState(!loc.isActive);
                                                        }}
                                                        title={loc.isActive ? "Desactivar" : "Activar"}
                                                    >
                                                        <Power className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </motion.tbody>
                            </AnimatePresence>
                        </table>

                        {!loading && locations.length === 0 && <div className="px-5 py-8 text-sm text-black/60">No hay ubicaciones con los filtros actuales.</div>}
                    </div>

                    {/* Paginación */}
                    <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-4 border-t border-black/10 text-xs text-black/60">
                        <span className="hidden sm:inline">
                            Mostrando {startIndex}-{endIndex} de {total}
                        </span>

                        <div className="flex items-center gap-2">
                            <button className="rounded-2xl border border-black/10 bg-white px-3 py-2 disabled:opacity-40" disabled={page === 1} onClick={() => setPage(page - 1)}>
                                Anterior
                            </button>
                            <span>
                                Página {page} de {totalPages}
                            </span>
                            <button className="rounded-2xl border border-black/10 bg-white px-3 py-2 disabled:opacity-40" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                                Siguiente
                            </button>
                        </div>
                    </div>
                </section>
            </div>

            {/* MODALES */}
            {openCreate && (
                <Modal title="Nueva ubicación" onClose={() => setOpenCreate(false)} className="max-w-lg">
                    <LocationFormFields form={form} setForm={setForm} warehouses={warehouses} />
                    <div className="mt-4 flex justify-end gap-2">
                        <button className="rounded-2xl border border-black/10 px-4 py-2 text-sm" onClick={() => setOpenCreate(false)}>
                            Cancelar
                        </button>
                        <button
                            className="rounded-2xl border px-4 py-2 text-sm text-white"
                            style={{ backgroundColor: PRIMARY, borderColor: `${PRIMARY}33` }}
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
                    <LocationFormFields form={form} setForm={setForm} warehouses={warehouses} />
                    <div className="mt-4 flex justify-end gap-2">
                        <button className="rounded-2xl border border-black/10 px-4 py-2 text-sm" onClick={() => setEditingLocationId(null)}>
                            Cancelar
                        </button>
                        <button className="rounded-2xl border px-4 py-2 text-sm text-white" style={{ backgroundColor: PRIMARY, borderColor: `${PRIMARY}33` }} onClick={() => void saveEdit()}>
                            Guardar cambios
                        </button>
                    </div>
                </Modal>
            )}

            {deletingLocationId && (
                <Modal title={nextActiveState ? "Restaurar ubicación" : "Desactivar ubicación"} onClose={() => setDeletingLocationId(null)} className="max-w-md">
                    <p className="text-sm text-black/70">{nextActiveState ? "Se activará la ubicación nuevamente." : "Se desactivará la ubicación seleccionada."}</p>
                    <div className="mt-4 flex justify-end gap-2">
                        <button className="rounded-2xl border border-black/10 px-4 py-2 text-sm" onClick={() => setDeletingLocationId(null)}>
                            Cancelar
                        </button>
                        <button
                            className="rounded-2xl border px-4 py-2 text-sm text-white"
                            style={{ backgroundColor: PRIMARY, borderColor: `${PRIMARY}33` }}
                            onClick={() => void confirmToggleActive()}
                        >
                            Confirmar
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
}

function LocationFormFields({ form, setForm, warehouses }: { form: LocationForm; setForm: Dispatch<SetStateAction<LocationForm>>; warehouses: WarehouseOption[] }) {
    return (
        <div className="space-y-3">
            <label className="text-sm">
                Almacén
                <select
                    className="mt-2 h-10 w-full rounded-lg border border-black/10 px-3 text-sm bg-white"
                    value={form.warehouseId}
                    onChange={(e) => setForm((prev) => ({ ...prev, warehouseId: e.target.value }))}
                >
                    <option value="">Seleccionar almacén</option>
                    {warehouses.map((w) => (
                        <option key={w.warehouseId} value={w.warehouseId}>
                            {w.name}
                        </option>
                    ))}
                </select>
            </label>

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
