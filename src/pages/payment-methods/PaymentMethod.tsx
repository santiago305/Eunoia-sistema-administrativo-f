import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Download, Menu, Pencil, Plus, Power, Search, SlidersHorizontal } from "lucide-react";
import { PageTitle } from "@/components/PageTitle";
import { Modal } from "@/components/settings/modal";
import { usePaymentMethods } from "@/hooks/usePaymentMethods";
import { listPaymentMethods } from "@/services/paymentMethodService";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { errorResponse, successResponse } from "@/common/utils/response";
import { PaymentMethodFormModal } from "@/pages/payment-methods/components/PaymentMethodFormModal";
import { Dropdown } from "@/pages/purchases/components/PurchaseDropdown";
import { StatusPill } from "@/components/StatusTag";
import { IconButton } from "@/components/IconBoton";
import { fadeUp, item, list } from "@/utils/animations";
import type { ListPaymentMethodsQuery } from "@/pages/payment-methods/types/paymentMethod";

const PRIMARY = "#21b8a6";
const PRIMARY_HOVER = "#1aa392";

export default function PaymentMethod() {
  const shouldReduceMotion = useReducedMotion();
  const { showFlash, clearFlash } = useFlashMessage();

  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [openCreate, setOpenCreate] = useState(false);
  const [editingMethodId, setEditingMethodId] = useState<string | null>(null);
  const [deletingMethodId, setDeletingMethodId] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [debouncedName, setDebouncedName] = useState("");
  const limit = 10;

  const [exporting, setExporting] = useState(false);

  const queryParams = useMemo(
    () => ({
      page,
      limit,
      isActive:
        statusFilter === "all"
          ? undefined
          : statusFilter === "active"
            ? ("true" as ListPaymentMethodsQuery["isActive"])
            : ("false" as ListPaymentMethodsQuery["isActive"]),
      name: debouncedName.trim() || undefined,
    }),
    [page, limit, statusFilter, debouncedName],
  );

  const { items: methods, total, page: apiPage, limit: apiLimit, loading, error, refresh, setActive } =
    usePaymentMethods(queryParams);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedName(searchText.trim());
      setPage(1);
    }, 450);
    return () => clearTimeout(handler);
  }, [searchText]);

  const effectiveLimit = apiLimit ?? limit;
  const safePage = Math.max(1, apiPage || page);
  const totalPages = Math.max(1, Math.ceil(total / effectiveLimit));
  const startIndex = total === 0 ? 0 : (safePage - 1) * effectiveLimit + 1;
  const endIndex = Math.min(safePage * effectiveLimit, total);
  const hasPrev = safePage > 1;
  const hasNext = safePage < totalPages;

  const sortedMethods = useMemo(() => {
    return [...methods].sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }));
  }, [methods]);

  const listKey = useMemo(() => `${page}|${statusFilter}|${debouncedName}`, [page, statusFilter, debouncedName]);

  const startCreate = () => {
    setEditingMethodId(null);
    setOpenCreate(true);
  };

  const openEdit = (methodId: string) => {
    setOpenCreate(false);
    setEditingMethodId(methodId);
  };

  const closeFormModal = () => {
    setOpenCreate(false);
    setEditingMethodId(null);
  };

  const confirmToggle = async () => {
    if (!deletingMethodId) return;
    clearFlash();
    try {
      const method = methods.find((m) => m.methodId === deletingMethodId);
      if (method) await setActive(deletingMethodId, !method.isActive);
      setDeletingMethodId(null);
      showFlash(successResponse("Estado del metodo de pago actualizado"));
    } catch {
      showFlash(errorResponse("Error al cambiar estado del metodo de pago"));
    }
  };

  const buildCsv = (
    rows: Array<{
      methodId: string;
      name: string;
      number?: string | null;
      isActive: boolean;
    }>,
  ) => {
    const header = ["id", "name", "number", "isActive"];
    const escape = (value: string) => {
      if (value.includes("\"") || value.includes(",") || value.includes("\n")) return `"${value.replace(/\"/g, "\"\"")}"`;
      return value;
    };
    const lines = rows.map((row, index) => {
      const csvId = String(index + 1).padStart(5, "0");
      return [csvId, row.name, row.number ?? "", String(row.isActive)]
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
      const baseQuery = { ...queryParams, page: 1, limit: pageSize };
      const first = await listPaymentMethods(baseQuery);
      const allItems = [...(first.items ?? [])];
      const pages = Math.max(1, Math.ceil((first.total ?? allItems.length) / pageSize));

      for (let p = 2; p <= pages; p += 1) {
        const res = await listPaymentMethods({ ...baseQuery, page: p, limit: pageSize });
        if (res.items?.length) allItems.push(...res.items);
      }

      const sorted = [...allItems].sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }));
      const csv = `\uFEFF${buildCsv(sorted)}`;

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "metodos_pago.csv";
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
      <PageTitle title="Metodos de pago" />
      <div className="mx-auto w-full max-w-[1500px] 2xl:max-w-[1700px] 3xl:max-w-[1900px] px-4 sm:px-6 lg:px-8 py-4 space-y-6">
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
          animate={shouldReduceMotion ? false : { opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"
        >
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">Metodos de pago</h1>
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
              title="Nuevo metodo de pago"
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
              Nuevo metodo
            </button>
          </div>
        </motion.div>

        <motion.section
          initial={shouldReduceMotion ? false : "hidden"}
          animate={shouldReduceMotion ? false : "show"}
          variants={fadeUp}
          className="bg-gray-50 p-4 sm:p-5 shadow-sm"
        >
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" />
              <input
                className="h-10 w-full rounded-lg border border-black/10 bg-white pl-10 pr-3 text-sm outline-none focus:ring-2"
                style={{ "--tw-ring-color": `${PRIMARY}33` } as CSSProperties}
                placeholder="Buscar por nombre"
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
                className="h-10 w-full appearance-none rounded-lg border border-black/10 bg-white pl-10 pr-9 text-sm outline-none focus:ring-2"
                style={{ "--tw-ring-color": `${PRIMARY}33` } as CSSProperties}
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

        <motion.section
          initial={shouldReduceMotion ? false : "hidden"}
          animate={shouldReduceMotion ? false : "show"}
          variants={fadeUp}
          className="bg-white shadow-sm overflow-hidden"
        >
          <div className="hidden lg:block">
            <div className="max-h-[calc(100vh-270px)] min-h-[calc(100vh-270px)] overflow-auto select-text">
              <table className="w-full text-[11px] select-text">
                <thead className="sticky top-0 z-10 bg-gray-50">
                  <tr className="border-b border-black/10 text-xs text-black/60">
                    <th className="py-3 px-5 text-left">Metodo</th>
                    <th className="py-3 px-5 text-left">Nómero</th>
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
                    {sortedMethods.map((method) => (
                      <motion.tr
                        key={method.methodId}
                        variants={shouldReduceMotion ? undefined : item}
                        layout
                        className="border-b border-black/5 hover:bg-black/[0.02]"
                      >
                        <td className="py-4 px-5 select-text">
                          <div className="min-w-0">
                            <p className="font-medium leading-5 truncate">{method.name}</p>
                            <p className="text-xs text-black/50 truncate">UUID: {method.methodId}</p>
                          </div>
                        </td>

                        <td className="py-4 px-5 text-black/70 select-text">
                          <p className="truncate max-w-[320px]">{method.number || "-"}</p>
                        </td>

                        <td className="py-4 px-5 select-text">
                          <StatusPill active={method.isActive} PRIMARY={PRIMARY} />
                        </td>

                        <td className="py-4 px-5 select-text">
                          <div className="flex items-center justify-end">
                            <Dropdown trigger={<Menu className="h-4 w-4" />} menuClassName="min-w-52 p-2">
                              <div className="flex flex-col gap-1">
                                <button
                                  type="button"
                                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[11px] text-black/80 hover:bg-black/[0.03]"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEdit(method.methodId);
                                  }}
                                >
                                  <Pencil className="h-4 w-4 text-black/60" />
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[11px] ${
                                    method.isActive ? "text-rose-700 hover:bg-rose-50" : "text-cyan-700 hover:bg-cyan-50"
                                  }`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeletingMethodId(method.methodId);
                                  }}
                                >
                                  <Power className="h-4 w-4" />
                                  {method.isActive ? "Desactivar" : "Activar"}
                                </button>
                              </div>
                            </Dropdown>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </motion.tbody>
                </AnimatePresence>
              </table>

              {methods.length === 0 && !loading && <div className="px-5 py-8 text-[11px] text-black/60">No hay metodos con los filtros actuales.</div>}
              {error && <div className="px-5 py-4 text-[11px] text-rose-600">{String(error)}</div>}
            </div>
          </div>

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
                {sortedMethods.map((method) => (
                  <motion.div
                    key={method.methodId}
                    variants={shouldReduceMotion ? undefined : item}
                    layout
                    className="rounded-lg border border-black/10 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="mt-1 font-semibold truncate">{method.name}</p>
                        <p className="mt-1 text-[11px] text-black/70 truncate">{method.number || "-"}</p>
                        <div className="mt-3">
                          <StatusPill active={method.isActive} PRIMARY={PRIMARY} />
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <IconButton
                          title="Editar"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEdit(method.methodId);
                          }}
                          PRIMARY={PRIMARY}
                          PRIMARY_HOVER={PRIMARY_HOVER}
                        >
                          <Pencil className="h-4 w-4" />
                        </IconButton>
                        <IconButton
                          title={method.isActive ? "Desactivar" : "Activar"}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingMethodId(method.methodId);
                          }}
                          tone={method.isActive ? "danger" : "primary"}
                          PRIMARY={PRIMARY}
                          PRIMARY_HOVER={PRIMARY_HOVER}
                        >
                          <Power className="h-4 w-4" />
                        </IconButton>
                      </div>
                    </div>

                    <div className="mt-3 text-[11px] text-black/50 truncate">UUID: {method.methodId}</div>
                  </motion.div>
                ))}

                {methods.length === 0 && !loading && (
                  <div className="rounded-lg border border-black/10 bg-white p-4 text-[11px] text-black/60">No hay metodos con los filtros actuales.</div>
                )}
                {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-[11px] text-rose-700">{String(error)}</div>}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-4 border-t border-black/10 text-xs text-black/60">
            <span className="hidden sm:inline">
              Mostrando {startIndex}-{endIndex} de {total}
            </span>

            <div className="flex items-center gap-2">
              <button
                className="rounded-lg border border-black/10 bg-white px-3 py-2 text-xs hover:bg-black/[0.03] disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-black/10"
                disabled={!hasPrev || loading}
                onClick={() => setPage(Math.max(1, safePage - 1))}
                type="button"
              >
                Anterior
              </button>

              <span className="tabular-nums">
                Pagina {safePage} de {totalPages}
              </span>

              <button
                className="rounded-lg border border-black/10 bg-white px-3 py-2 text-xs hover:bg-black/[0.03] disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-black/10"
                disabled={!hasNext || loading}
                onClick={() => setPage(safePage + 1)}
                type="button"
              >
                Siguiente
              </button>
            </div>
          </div>
        </motion.section>
      </div>

      <PaymentMethodFormModal
        open={openCreate || Boolean(editingMethodId)}
        mode={editingMethodId ? "edit" : "create"}
        paymentMethodId={editingMethodId}
        onClose={closeFormModal}
        onSaved={() => {
          void refresh();
        }}
        primaryColor={PRIMARY}
        entityLabel="metodo de pago"
      />

      {deletingMethodId && (
        <Modal title="Confirmar acción" onClose={() => setDeletingMethodId(null)} className="max-w-md">
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.985, y: 6 }}
            animate={shouldReduceMotion ? false : { opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.16 }}
          >
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-[11px] text-rose-800">
              <span className="font-semibold">Ojo:</span> estas por cambiar el estado de un metodo de pago. Hazlo solo si estas seguro.
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                className="rounded-lg border border-black/10 bg-white px-4 py-2 text-[11px] hover:bg-black/[0.03] focus:outline-none focus:ring-2 focus:ring-black/10"
                onClick={() => setDeletingMethodId(null)}
              >
                Cancelar
              </button>
              <button
                className="rounded-lg border border-rose-600/20 bg-rose-600 px-4 py-2 text-[11px] text-white hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-600/25"
                onClick={confirmToggle}
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
