// src/pages/warehouses/Warehouses.tsx
import { useEffect, useMemo, useState } from "react";
import { PageTitle } from "@/components/PageTitle";
import { Modal } from "@/components/settings/modal";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Download, Pencil, Plus, Power, Search, SlidersHorizontal } from "lucide-react";

import { useWarehouses } from "@/hooks/useWarehouse";
import { listWarehouses } from "@/services/warehouseServices";

const PRIMARY = "#21b8a6";
const PRIMARY_HOVER = "#1aa392";

export default function Warehouses() {
    const shouldReduceMotion = useReducedMotion();
    const navigate = useNavigate();

    const [searchText, setSearchText] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [openCreate, setOpenCreate] = useState(false);
    const [editingWarehouseId, setEditingWarehouseId] = useState<string | null>(null);
    const [deletingWarehouseId, setDeletingWarehouseId] = useState<string | null>(null);

    const [form, setForm] = useState({
        name: "",
        department: "",
        province: "",
        district: "",
        address: "",
        isActive: true,
    });

    const [page, setPage] = useState(1);
    const [debouncedQ, setDebouncedQ] = useState("");
    const limit = 10;

    const [exporting, setExporting] = useState(false);

    const fadeUp = {
        hidden: { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0, transition: { duration: 0.18 } },
        exit: { opacity: 0, y: 6, transition: { duration: 0.12 } },
    };

    const list = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.03, delayChildren: 0.02 } },
        exit: { opacity: 0, transition: { duration: 0.12 } },
    };

    const item = {
        hidden: { opacity: 0, y: 6 },
        show: { opacity: 1, y: 0, transition: { duration: 0.14 } },
        exit: { opacity: 0, y: 6, transition: { duration: 0.1 } },
    };

    const queryParams = useMemo(
        () => ({
            page,
            limit,
            isActive: statusFilter === "all" ? undefined : statusFilter === "active" ? "true" : "false",
            q: debouncedQ.trim() || undefined,
        }),
        [page, limit, statusFilter, debouncedQ],
    );

    const { items: warehouses, total, page: apiPage, limit: apiLimit, loading, error, create, update, setActive } = useWarehouses(queryParams);

    useEffect(() => {
        if (apiPage && apiPage !== page) setPage(apiPage);
    }, [apiPage, page]);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedQ(searchText.trim());
            setPage(1);
        }, 450);
        return () => clearTimeout(handler);
    }, [searchText]);

    const effectiveLimit = apiLimit ?? limit;
    const totalPages = Math.max(1, Math.ceil(total / effectiveLimit));
    const startIndex = total === 0 ? 0 : (apiPage - 1) * effectiveLimit + 1;
    const endIndex = Math.min(apiPage * effectiveLimit, total);

    const sortedWarehouses = useMemo(() => {
        return [...warehouses].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }, [warehouses]);

    const listKey = useMemo(() => `${page}|${statusFilter}|${debouncedQ}`, [page, statusFilter, debouncedQ]);

    const startCreate = () => {
        setForm({
            name: "",
            department: "",
            province: "",
            district: "",
            address: "",
            isActive: true,
        });
        setOpenCreate(true);
    };

    const startEdit = (warehouseId: string) => {
        const w = warehouses.find((x) => x.warehouseId === warehouseId);
        if (!w) return;

        setForm({
            name: w.name,
            department: w.department,
            province: w.province,
            district: w.district,
            address: w.address ?? "",
            isActive: w.isActive,
        });
        setEditingWarehouseId(warehouseId);
    };

    const saveCreate = async () => {
        if (!form.name.trim()) return;
        if (!form.department.trim()) return;
        if (!form.province.trim()) return;
        if (!form.district.trim()) return;

        await create({
            name: form.name.trim(),
            department: form.department.trim(),
            province: form.province.trim(),
            district: form.district.trim(),
            address: form.address.trim() || null,
            isActive: form.isActive,
        });

        setOpenCreate(false);
    };

    const saveEdit = async () => {
        if (!editingWarehouseId) return;

        await update(editingWarehouseId, {
            name: form.name.trim() || undefined,
            department: form.department.trim() || undefined,
            province: form.province.trim() || undefined,
            district: form.district.trim() || undefined,
            address: form.address.trim() || null,
        });

        await setActive(editingWarehouseId, form.isActive);
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
        }>,
    ) => {
        const header = ["id", "name", "department", "province", "district", "address", "isActive", "createdAt", "updatedAt"];
        const escape = (value: string) => {
            if (value.includes('"') || value.includes(",") || value.includes("\n")) return `"${value.replace(/"/g, '""')}"`;
            return value;
        };

        const lines = rows.map((row, index) => {
            const csvId = String(index + 1).padStart(5, "0");
            return [csvId, row.name, row.department, row.province, row.district, row.address ?? "", String(row.isActive), formatDate(row.createdAt), formatDate(row.updatedAt)]
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

            // respeta filtros actuales
            const first = await listWarehouses({ ...queryParams, page: 1, limit: pageSize });
            const allItems = [...(first.items ?? [])];
            const pages = Math.max(1, Math.ceil((first.total ?? allItems.length) / pageSize));

            for (let p = 2; p <= pages; p += 1) {
                const res = await listWarehouses({ ...queryParams, page: p, limit: pageSize });
                if (res.items?.length) allItems.push(...res.items);
            }

            const sorted = [...allItems].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
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

    const StatusPill = ({ active }: { active: boolean }) => (
        <span
            className={[
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset",
                active ? "bg-[color:var(--p-50)] text-[color:var(--p-700)] ring-[color:var(--p-200)]" : "bg-rose-50 text-rose-700 ring-rose-200",
            ].join(" ")}
            style={
                active
                    ? ({
                          "--p-50": `${PRIMARY}14`,
                          "--p-200": `${PRIMARY}33`,
                          "--p-700": PRIMARY,
                      } as React.CSSProperties)
                    : undefined
            }
        >
            <span className={["h-1.5 w-1.5 rounded-full", active ? "bg-[color:var(--p-dot)]" : "bg-rose-500"].join(" ")} style={active ? ({ "--p-dot": PRIMARY } as React.CSSProperties) : undefined} />
            {active ? "Activo" : "Inactivo"}
        </span>
    );

    const IconButton = ({
        onClick,
        title,
        children,
        tone = "neutral",
    }: {
        onClick: (e: React.MouseEvent) => void;
        title: string;
        children: React.ReactNode;
        tone?: "neutral" | "primary" | "danger";
    }) => {
        const styles =
            tone === "primary"
                ? "border-[color:var(--p-200)] bg-[color:var(--p)] text-white hover:bg-[color:var(--p-hover)] focus:ring-[color:var(--p-200)]"
                : tone === "danger"
                  ? "border-rose-600/20 bg-rose-50 text-rose-700 hover:bg-rose-100 focus:ring-rose-600/25"
                  : "border-black/10 bg-white hover:bg-black/[0.03] focus:ring-black/10";

        return (
            <button
                type="button"
                title={title}
                aria-label={title}
                onClick={onClick}
                className={["inline-flex h-9 w-9 items-center justify-center rounded-xl border transition", styles, "focus:outline-none focus:ring-2"].join(" ")}
                style={
                    tone === "primary"
                        ? ({
                              "--p": PRIMARY,
                              "--p-hover": PRIMARY_HOVER,
                              "--p-200": `${PRIMARY}33`,
                          } as React.CSSProperties)
                        : undefined
                }
            >
                {children}
            </button>
        );
    };

    return (
        <div className="w-full min-h-screen bg-white text-black">
            <PageTitle title="Almacenes" />

            <div className="mx-auto w-full max-w-[1500px] 2xl:max-w-[1700px] 3xl:max-w-[1900px] px-4 sm:px-6 lg:px-8 py-6 space-y-6">
                {/* Header */}
                <motion.div
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
                    animate={shouldReduceMotion ? false : { opacity: 1, y: 0 }}
                    transition={{ duration: 0.18 }}
                    className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"
                >
                    <div className="space-y-1">
                        <h1 className="text-2xl font-semibold tracking-tight">Almacenes</h1>
                        <p className="text-sm text-black/60">Maestro de almacenes.</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <div className="rounded-2xl border border-black/10 bg-black/[0.02] px-3 py-2 text-xs">
                            Total: <span className="font-semibold text-black">{total}</span>
                        </div>

                        <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-3 py-2 text-xs hover:bg-black/[0.03] disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-black/10"
                            onClick={downloadCsv}
                            disabled={exporting}
                            title="Exportar CSV"
                        >
                            <Download className="h-4 w-4" />
                            {exporting ? "Exportando..." : "Exportar CSV"}
                        </button>

                        <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs text-white focus:outline-none focus:ring-2"
                            onClick={startCreate}
                            title="Nuevo almacén"
                            style={{
                                backgroundColor: PRIMARY,
                                borderColor: `${PRIMARY}33`,
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
                            Nuevo almacén
                        </button>
                    </div>
                </motion.div>

                {/* Filtros */}
                <motion.section
                    initial={shouldReduceMotion ? false : "hidden"}
                    animate={shouldReduceMotion ? false : "show"}
                    variants={fadeUp}
                    className="rounded-3xl border border-black/10 bg-white p-4 sm:p-5 shadow-sm"
                >
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-3">
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" />
                            <input
                                className="h-11 w-full rounded-2xl border border-black/10 bg-white pl-10 pr-3 text-sm outline-none focus:ring-2"
                                style={{ "--tw-ring-color": `${PRIMARY}33` } as React.CSSProperties}
                                placeholder="Buscar ( nombre / depto / provincia / distrito)"
                                value={searchText}
                                onChange={(event) => {
                                    setSearchText(event.target.value);
                                    setPage(1);
                                }}
                            />
                        </div>

                        <div className="relative">
                            <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" />
                            <select
                                className="h-11 w-full appearance-none rounded-2xl border border-black/10 bg-white pl-10 pr-9 text-sm outline-none focus:ring-2"
                                style={{ "--tw-ring-color": `${PRIMARY}33` } as React.CSSProperties}
                                value={statusFilter}
                                onChange={(event) => {
                                    setStatusFilter(event.target.value);
                                    setPage(1);
                                }}
                            >
                                <option value="all">Estado (todos)</option>
                                <option value="active">Activos</option>
                                <option value="inactive">Inactivos</option>
                            </select>
                            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-black/40">▾</span>
                        </div>
                    </div>
                </motion.section>

                {/* Listado */}
                <motion.section
                    initial={shouldReduceMotion ? false : "hidden"}
                    animate={shouldReduceMotion ? false : "show"}
                    variants={fadeUp}
                    className="rounded-3xl border border-black/10 bg-white shadow-sm overflow-hidden"
                >
                    <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-black/10">
                        <div>
                            <p className="text-sm font-semibold">Listado de almacenes</p>
                            <p className="text-xs text-black/60">Scroll interno + acciones claras.</p>
                        </div>

                        <div className="text-xs text-black/60 hidden sm:block">{loading ? "Cargando..." : `Mostrando ${startIndex}-${endIndex} de ${total}`}</div>
                    </div>

                    {/* DESKTOP */}
                    <div className="hidden lg:block">
                        <div className="max-h-[calc(100vh-340px)] overflow-auto">
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 z-10 bg-white">
                                    <tr className="border-b border-black/10 text-xs text-black/60">
                                        <th className="py-3 px-5 text-left">ID</th>
                                        <th className="py-3 px-5 text-left">Almacén</th>
                                        <th className="py-3 px-5 text-left">Ubicación</th>
                                        <th className="py-3 px-5 text-left">Dirección</th>
                                        <th className="py-3 px-5 text-left">Estado</th>
                                        <th className="py-3 px-5 text-right">Acciones</th>
                                    </tr>
                                </thead>

                                <AnimatePresence mode="wait" initial={false}>
                                    <motion.tbody
                                        key={listKey}
                                        variants={shouldReduceMotion ? undefined : list}
                                        initial={shouldReduceMotion ? false : "hidden"}
                                        animate={shouldReduceMotion ? false : "show"}
                                        exit={shouldReduceMotion ? undefined : "exit"}
                                    >
                                        {sortedWarehouses.map((w, index) => {
                                            const displayId = String(startIndex + index).padStart(7, "0");
                                            const location = `${w.department} · ${w.province} · ${w.district}`;

                                            return (
                                                <motion.tr key={w.warehouseId} variants={shouldReduceMotion ? undefined : item} layout className="border-b border-black/5 hover:bg-black/[0.02]">
                                                    <td className="py-4 px-5 text-black/60 tabular-nums">{displayId}</td>

                                                    <td className="py-4 px-5">
                                                        <div className="min-w-0">
                                                            <p className="font-medium leading-5 truncate">{w.name}</p>
                                                            <p className="text-xs text-black/50 truncate">UUID: {w.warehouseId}</p>
                                                        </div>
                                                    </td>

                                                    <td className="py-4 px-5 text-black/70">
                                                        <p className="truncate max-w-[520px]">{location}</p>
                                                        <p className="text-xs text-black/50 mt-1">Creado: {formatDate(w.createdAt)}</p>
                                                    </td>

                                                    <td className="py-4 px-5 text-black/70">
                                                        <p className="line-clamp-2 max-w-[520px]">{w.address || "-"}</p>
                                                    </td>

                                                    <td className="py-4 px-5">
                                                        <StatusPill active={w.isActive} />
                                                    </td>

                                                    <td className="py-4 px-5">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <IconButton
                                                                title="Editar"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    startEdit(w.warehouseId);
                                                                }}
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </IconButton>

                                                            <IconButton
                                                                title={w.isActive ? "Desactivar" : "Activar"}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setDeletingWarehouseId(w.warehouseId);
                                                                }}
                                                                tone={w.isActive ? "danger" : "primary"}
                                                            >
                                                                <Power className="h-4 w-4" />
                                                            </IconButton>
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            );
                                        })}
                                    </motion.tbody>
                                </AnimatePresence>
                            </table>

                            {warehouses.length === 0 && !loading && <div className="px-5 py-8 text-sm text-black/60">No hay almacenes con los filtros actuales.</div>}
                            {error && <div className="px-5 py-4 text-sm text-rose-600">{String(error)}</div>}
                        </div>
                    </div>

                    {/* MOBILE */}
                    <div className="lg:hidden">
                        <AnimatePresence mode="wait" initial={false}>
                            <motion.div
                                key={listKey}
                                variants={shouldReduceMotion ? undefined : list}
                                initial={shouldReduceMotion ? false : "hidden"}
                                animate={shouldReduceMotion ? false : "show"}
                                exit={shouldReduceMotion ? undefined : "exit"}
                                className="max-h-[calc(100vh-360px)] overflow-auto p-4 sm:p-5 space-y-3"
                            >
                                {sortedWarehouses.map((w, index) => {
                                    const displayId = String(startIndex + index).padStart(7, "0");
                                    const location = `${w.department} · ${w.province} · ${w.district}`;

                                    return (
                                        <motion.div key={w.warehouseId} variants={shouldReduceMotion ? undefined : item} layout className="rounded-3xl border border-black/10 bg-white p-4 shadow-sm">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="text-xs text-black/50 tabular-nums">ID: {displayId}</p>
                                                    <p className="mt-1 font-semibold truncate">{w.name}</p>
                                                    <p className="mt-1 text-sm text-black/70 truncate">{location}</p>
                                                    <p className="mt-1 text-sm text-black/70 line-clamp-2">{w.address || "-"}</p>
                                                    <div className="mt-3">
                                                        <StatusPill active={w.isActive} />
                                                    </div>
                                                </div>

                                                <div className="flex flex-col gap-2">
                                                    <IconButton
                                                        title="Editar"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            startEdit(w.warehouseId);
                                                        }}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </IconButton>

                                                    <IconButton
                                                        title={w.isActive ? "Desactivar" : "Activar"}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setDeletingWarehouseId(w.warehouseId);
                                                        }}
                                                        tone={w.isActive ? "danger" : "primary"}
                                                    >
                                                        <Power className="h-4 w-4" />
                                                    </IconButton>
                                                </div>
                                            </div>

                                            <div className="mt-3 text-[11px] text-black/50 truncate">UUID: {w.warehouseId}</div>
                                        </motion.div>
                                    );
                                })}

                                {warehouses.length === 0 && !loading && (
                                    <div className="rounded-3xl border border-black/10 bg-white p-4 text-sm text-black/60">No hay almacenes con los filtros actuales.</div>
                                )}
                                {error && <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{String(error)}</div>}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Footer paginación */}
                    <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-4 border-t border-black/10 text-xs text-black/60">
                        <span className="hidden sm:inline">
                            Mostrando {startIndex}-{endIndex} de {total}
                        </span>

                        <div className="flex items-center gap-2">
                            <button
                                className="rounded-2xl border border-black/10 bg-white px-3 py-2 text-xs hover:bg-black/[0.03] disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-black/10"
                                disabled={page === 1}
                                onClick={() => setPage(page - 1)}
                                type="button"
                            >
                                Anterior
                            </button>

                            <span className="tabular-nums">
                                Página {page} de {totalPages}
                            </span>

                            <button
                                className="rounded-2xl border border-black/10 bg-white px-3 py-2 text-xs hover:bg-black/[0.03] disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-black/10"
                                disabled={page === totalPages || totalPages === 0}
                                onClick={() => setPage(page + 1)}
                                type="button"
                            >
                                Siguiente
                            </button>
                        </div>
                    </div>
                </motion.section>
            </div>

            {/* MODALES */}
            {openCreate && (
                <Modal title="Nuevo almacén" onClose={() => setOpenCreate(false)} className="max-w-lg">
                    <motion.div
                        initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.985, y: 6 }}
                        animate={shouldReduceMotion ? false : { opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.16 }}
                    >
                        <div className="space-y-3">
                            <label className="text-sm">
                                Nombre
                                <input
                                    className="mt-2 h-11 w-full rounded-2xl border border-black/10 px-3 text-sm outline-none focus:ring-2"
                                    style={{ "--tw-ring-color": `${PRIMARY}33` } as React.CSSProperties}
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                />
                            </label>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <label className="text-sm">
                                    Departamento
                                    <input
                                        className="mt-2 h-11 w-full rounded-2xl border border-black/10 px-3 text-sm outline-none focus:ring-2"
                                        style={{ "--tw-ring-color": `${PRIMARY}33` } as React.CSSProperties}
                                        value={form.department}
                                        onChange={(e) => setForm({ ...form, department: e.target.value })}
                                    />
                                </label>
                                <label className="text-sm">
                                    Provincia
                                    <input
                                        className="mt-2 h-11 w-full rounded-2xl border border-black/10 px-3 text-sm outline-none focus:ring-2"
                                        style={{ "--tw-ring-color": `${PRIMARY}33` } as React.CSSProperties}
                                        value={form.province}
                                        onChange={(e) => setForm({ ...form, province: e.target.value })}
                                    />
                                </label>
                            </div>

                            <label className="text-sm">
                                Distrito
                                <input
                                    className="mt-2 h-11 w-full rounded-2xl border border-black/10 px-3 text-sm outline-none focus:ring-2"
                                    style={{ "--tw-ring-color": `${PRIMARY}33` } as React.CSSProperties}
                                    value={form.district}
                                    onChange={(e) => setForm({ ...form, district: e.target.value })}
                                />
                            </label>

                            <label className="text-sm">
                                Dirección (opcional)
                                <textarea
                                    className="mt-2 min-h-[90px] w-full rounded-2xl border border-black/10 px-3 py-2 text-sm outline-none focus:ring-2"
                                    style={{ "--tw-ring-color": `${PRIMARY}33` } as React.CSSProperties}
                                    value={form.address}
                                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                                />
                            </label>

                            {/* <label className="text-sm">
                                Estado
                                <select
                                    className="mt-2 h-11 w-full rounded-2xl border border-black/10 px-3 text-sm bg-white outline-none focus:ring-2"
                                    style={{ "--tw-ring-color": `${PRIMARY}33` } as React.CSSProperties}
                                    value={form.isActive ? "active" : "inactive"}
                                    onChange={(e) => setForm({ ...form, isActive: e.target.value === "active" })}
                                >
                                    <option value="active">Activo</option>
                                    <option value="inactive">Inactivo</option>
                                </select>
                            </label> */}
                        </div>

                        <div className="mt-4 flex justify-end gap-2">
                            <button
                                className="rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm hover:bg-black/[0.03] focus:outline-none focus:ring-2 focus:ring-black/10"
                                onClick={() => setOpenCreate(false)}
                            >
                                Cancelar
                            </button>
                            <button
                                className="rounded-2xl border px-4 py-2 text-sm text-white focus:outline-none focus:ring-2"
                                style={
                                    {
                                        backgroundColor: PRIMARY,
                                        borderColor: `${PRIMARY}33`,
                                        "--tw-ring-color": `${PRIMARY}33`,
                                    } as React.CSSProperties
                                }
                                onMouseEnter={(e) => {
                                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = PRIMARY_HOVER;
                                }}
                                onMouseLeave={(e) => {
                                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = PRIMARY;
                                }}
                                onClick={saveCreate}
                            >
                                Guardar
                            </button>
                        </div>
                    </motion.div>
                </Modal>
            )}

            {editingWarehouseId && (
                <Modal title="Editar almacén" onClose={() => setEditingWarehouseId(null)} className="max-w-lg">
                    <motion.div
                        initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.985, y: 6 }}
                        animate={shouldReduceMotion ? false : { opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.16 }}
                    >
                        <div className="space-y-3">
                            <label className="text-sm">
                                Nombre
                                <input
                                    className="mt-2 h-11 w-full rounded-2xl border border-black/10 px-3 text-sm outline-none focus:ring-2"
                                    style={{ "--tw-ring-color": `${PRIMARY}33` } as React.CSSProperties}
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                />
                            </label>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <label className="text-sm">
                                    Departamento
                                    <input
                                        className="mt-2 h-11 w-full rounded-2xl border border-black/10 px-3 text-sm outline-none focus:ring-2"
                                        style={{ "--tw-ring-color": `${PRIMARY}33` } as React.CSSProperties}
                                        value={form.department}
                                        onChange={(e) => setForm({ ...form, department: e.target.value })}
                                    />
                                </label>
                                <label className="text-sm">
                                    Provincia
                                    <input
                                        className="mt-2 h-11 w-full rounded-2xl border border-black/10 px-3 text-sm outline-none focus:ring-2"
                                        style={{ "--tw-ring-color": `${PRIMARY}33` } as React.CSSProperties}
                                        value={form.province}
                                        onChange={(e) => setForm({ ...form, province: e.target.value })}
                                    />
                                </label>
                            </div>

                            <label className="text-sm">
                                Distrito
                                <input
                                    className="mt-2 h-11 w-full rounded-2xl border border-black/10 px-3 text-sm outline-none focus:ring-2"
                                    style={{ "--tw-ring-color": `${PRIMARY}33` } as React.CSSProperties}
                                    value={form.district}
                                    onChange={(e) => setForm({ ...form, district: e.target.value })}
                                />
                            </label>

                            <label className="text-sm">
                                Dirección (opcional)
                                <textarea
                                    className="mt-2 min-h-[90px] w-full rounded-2xl border border-black/10 px-3 py-2 text-sm outline-none focus:ring-2"
                                    style={{ "--tw-ring-color": `${PRIMARY}33` } as React.CSSProperties}
                                    value={form.address}
                                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                                />
                            </label>

                            {/* <label className="text-sm">
                                Estado
                                <select
                                    className="mt-2 h-11 w-full rounded-2xl border border-black/10 px-3 text-sm bg-white outline-none focus:ring-2"
                                    style={{ "--tw-ring-color": `${PRIMARY}33` } as React.CSSProperties}
                                    value={form.isActive ? "active" : "inactive"}
                                    onChange={(e) => setForm({ ...form, isActive: e.target.value === "active" })}
                                >
                                    <option value="active">Activo</option>
                                    <option value="inactive">Inactivo</option>
                                </select>
                            </label> */}
                        </div>

                        <div className="mt-4 flex justify-end gap-2">
                            <button
                                className="rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm hover:bg-black/[0.03] focus:outline-none focus:ring-2 focus:ring-black/10"
                                onClick={() => setEditingWarehouseId(null)}
                            >
                                Cancelar
                            </button>
                            <button
                                className="rounded-2xl border px-4 py-2 text-sm text-white focus:outline-none focus:ring-2"
                                style={
                                    {
                                        backgroundColor: PRIMARY,
                                        borderColor: `${PRIMARY}33`,
                                        "--tw-ring-color": `${PRIMARY}33`,
                                    } as React.CSSProperties
                                }
                                onMouseEnter={(e) => {
                                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = PRIMARY_HOVER;
                                }}
                                onMouseLeave={(e) => {
                                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = PRIMARY;
                                }}
                                onClick={saveEdit}
                            >
                                Guardar cambios
                            </button>
                        </div>
                    </motion.div>
                </Modal>
            )}

            {deletingWarehouseId && (
                <Modal title="Confirmar acción" onClose={() => setDeletingWarehouseId(null)} className="max-w-md">
                    <motion.div
                        initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.985, y: 6 }}
                        animate={shouldReduceMotion ? false : { opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.16 }}
                    >
                        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                            <span className="font-semibold">Ojo:</span> estás por cambiar el estado de un almacén. Hazlo solo si estás seguro.
                        </div>

                        <p className="mt-3 text-sm text-black/70">¿Confirmas esta acción? Puede afectar disponibilidad, reportes y procesos internos.</p>

                        <div className="mt-4 flex justify-end gap-2">
                            <button
                                className="rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm hover:bg-black/[0.03] focus:outline-none focus:ring-2 focus:ring-black/10"
                                onClick={() => setDeletingWarehouseId(null)}
                            >
                                Cancelar
                            </button>
                            <button
                                className="rounded-2xl border border-rose-600/20 bg-rose-600 px-4 py-2 text-sm text-white hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-600/25"
                                onClick={confirmDelete}
                            >
                                Confirmar
                            </button>
                        </div>
                    </motion.div>
                </Modal>
            )}
        </div>
    );
}
