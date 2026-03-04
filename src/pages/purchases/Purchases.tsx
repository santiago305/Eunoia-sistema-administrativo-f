import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { PageTitle } from "@/components/PageTitle";
import { FilterableSelect } from "@/components/SelectFilterable";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { errorResponse } from "@/common/utils/response";
import { listAll } from "@/services/supplierService";
import { listActive } from "@/services/warehouseServices";
import { listPurchaseOrders } from "@/services/purchaseService";
import { money, toDateInputValue, tryShowPicker, todayIso } from "@/utils/functionPurchases";
import type { PurchaseOrder } from "@/types/purchase";
import type { SupplierOption } from "@/types/supplier";
import type { Warehouse } from "@/types/warehouse";
import { VoucherDocTypes, type VoucherDocType, PurchaseOrderStatuses, type PurchaseOrderStatus } from "@/types/purchaseEnums";

const PRIMARY = "#21b8a6";

const statusLabels: Record<PurchaseOrderStatus, string> = {
  [PurchaseOrderStatuses.DRAFT]: "Borrador",
  [PurchaseOrderStatuses.SENT]: "Enviado",
  [PurchaseOrderStatuses.PARTIAL]: "Parcial",
  [PurchaseOrderStatuses.RECEIVED]: "Recibido",
  [PurchaseOrderStatuses.CANCELLED]: "Cancelado",
};

const docTypeLabels: Record<VoucherDocType, string> = {
  [VoucherDocTypes.FACTURA]: "Factura",
  [VoucherDocTypes.BOLETA]: "Boleta",
  [VoucherDocTypes.NOTA_VENTA]: "Nota de venta",
};

const buildMonthStartIso = () => {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10);
};

const parseNumero = (raw: string) => {
  const clean = raw.trim();
  if (!clean) return { serie: undefined, correlative: undefined };
  const normalized = clean.replace(/\s+/g, "");
  if (normalized.includes("-")) {
    const [seriePart, correlativePart] = normalized.split("-");
    const correlative = Number.parseInt(correlativePart ?? "", 10);
    return {
      serie: seriePart || undefined,
      correlative: Number.isFinite(correlative) ? correlative : undefined,
    };
  }
  const asNumber = Number.parseInt(normalized, 10);
  if (Number.isFinite(asNumber) && normalized.match(/^\d+$/)) {
    return { serie: undefined, correlative: asNumber };
  }
  return { serie: normalized || undefined, correlative: undefined };
};

export default function Purchases() {
  const { showFlash, clearFlash } = useFlashMessage();

  const [numeroInput, setNumeroInput] = useState("");
  const [debouncedNumero, setDebouncedNumero] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [documentType, setDocumentType] = useState<"" | VoucherDocType>("");
  const [statusFilter, setStatusFilter] = useState<"" | PurchaseOrderStatus>("");
  const [fromDate, setFromDate] = useState(() => buildMonthStartIso());
  const [toDate, setToDate] = useState(() => todayIso());
  const [page, setPage] = useState(1);
  const limit = 10;

  const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [apiPage, setApiPage] = useState(1);
  const [apiLimit, setApiLimit] = useState(limit);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [supplierOptions, setSupplierOptions] = useState<SupplierOption[]>([]);
  const [warehouseOptions, setWarehouseOptions] = useState<{ value: string; label: string }[]>([]);

  const ringStyle = { "--tw-ring-color": `${PRIMARY}33` } as CSSProperties;

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedNumero(numeroInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [numeroInput]);

  const loadSuppliers = async () => {
    try {
      const res = await listAll();
      const options =
        res?.map((s) => {
          const fullName = [s.name, s.lastName].filter(Boolean).join(" ").trim();
          const display = (fullName || s.tradeName || "").trim();
          const doc = s.documentNumber ? ` (${s.documentNumber})` : "";
          return {
            value: s.supplierId,
            label: `${display}${doc}`.trim() || s.supplierId,
          };
        }) ?? [];
      setSupplierOptions([{ value: "", label: "Todos" }, ...options]);
    } catch {
      setSupplierOptions([{ value: "", label: "Todos" }]);
      showFlash(errorResponse("Error al cargar proveedores"));
    }
  };

  const loadWarehouses = async () => {
    try {
      const res = await listActive();
      const options =
        res?.map((s: Warehouse) => ({
          value: s.warehouseId,
          label: `${s.name} (${s.department}-${s.province}-${s.district})`,
        })) ?? [];
      setWarehouseOptions([{ value: "", label: "Todos" }, ...options]);
    } catch {
      setWarehouseOptions([{ value: "", label: "Todos" }]);
      showFlash(errorResponse("Error al cargar almacenes"));
    }
  };

  const loadPurchases = async () => {
    clearFlash();
    setLoading(true);
    setError(null);
    const { serie, correlative } = parseNumero(debouncedNumero);
    try {
      const res = await listPurchaseOrders({
        page,
        limit,
        supplierId: supplierId || undefined,
        warehouseId: warehouseId || undefined,
        documentType: documentType || undefined,
        status: statusFilter || undefined,
        serie,
        correlative,
        from: fromDate || undefined,
        to: toDate || undefined,
      });
      setPurchases(res.items ?? []);
      setTotal(res.total ?? 0);
      setApiPage(res.page ?? page);
      setApiLimit(res.limit ?? limit);
    } catch {
      setPurchases([]);
      setTotal(0);
      setError("Error al listar compras");
      showFlash(errorResponse("Error al listar compras"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSuppliers();
    void loadWarehouses();
  }, []);

  useEffect(() => {
    void loadPurchases();
  }, [page, debouncedNumero, supplierId, warehouseId, documentType, statusFilter, fromDate, toDate]);

  useEffect(() => {
    if (apiPage !== page) setPage(apiPage);
  }, [apiPage, page]);

  const totalPages = Math.max(1, Math.ceil(total / (apiLimit || limit)));
  const startIndex = total === 0 ? 0 : (apiPage - 1) * (apiLimit || limit) + 1;
  const endIndex = Math.min(apiPage * (apiLimit || limit), total);

  const supplierLabelById = useMemo(() => {
    const map = new Map<string, string>();
    supplierOptions.forEach((opt) => {
      if (opt.value) map.set(opt.value, opt.label);
    });
    return map;
  }, [supplierOptions]);

  const warehouseLabelById = useMemo(() => {
    const map = new Map<string, string>();
    warehouseOptions.forEach((opt) => {
      if (opt.value) map.set(opt.value, opt.label);
    });
    return map;
  }, [warehouseOptions]);

  const listKey = useMemo(
    () => `${page}|${debouncedNumero}|${supplierId}|${warehouseId}|${documentType}|${statusFilter}|${fromDate}|${toDate}`,
    [page, debouncedNumero, supplierId, warehouseId, documentType, statusFilter, fromDate, toDate]
  );

  return (
    <div className="w-full min-h-screen bg-white text-black">
      <PageTitle title="Compras" />
      <div className="mx-auto w-full max-w-[1500px] 2xl:max-w-[1700px] 3xl:max-w-[1900px] px-4 sm:px-6 lg:px-8 py-2 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Compras</h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-lg border border-black/10 bg-black/[0.02] px-3 py-0 text-xs">
              Total: <span className="font-semibold text-black">{total}</span>
            </div>
          </div>
        </div>

        <section className=" bg-gray-50 px-4 py-2 shadow-sm rounded-2xl">
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[0.2fr_0.2fr]">
                <div>
                    <label className="text-xs text-black/60">Fecha inicio</label>
                    <input
                        type="date"
                        className="h-10 w-full rounded-lg border border-black/10 bg-white px-3 text-sm outline-none focus:ring-2"
                        style={ringStyle}
                        value={toDateInputValue(fromDate)}
                        onClick={(e) => tryShowPicker(e.currentTarget)}
                        onChange={(e) => {
                        setFromDate(e.target.value);
                        setPage(1);
                        }}
                    />
                </div>
                <div>
                    <label className="text-xs text-black/60">Fecha fin</label>
                    <input
                        type="date"
                        className="h-10 w-full rounded-lg border border-black/10 bg-white px-3 text-sm outline-none focus:ring-2"
                        style={ringStyle}
                        value={toDateInputValue(toDate)}
                        onClick={(e) => tryShowPicker(e.currentTarget)}
                        onChange={(e) => {
                        setToDate(e.target.value);
                        setPage(1);
                        }}
                    />
                </div>
            </div>
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-[0.5fr_1fr_1fr_0.5fr_0.6fr] mt-5 pb-3">
                <label className="text-xs text-black/60">Número de documento
                    <input
                        className="h-10 w-full rounded-lg border border-black/10 bg-white pl-10 pr-3 text-sm outline-none focus:ring-2"
                        style={ringStyle}
                        value={numeroInput}
                        onChange={(e) => setNumeroInput(e.target.value)}
                    />
                </label>

                <label className="text-xs text-black/60">Proveedor
                    <FilterableSelect
                    value={supplierId}
                    onChange={(value) => {
                        setSupplierId(value);
                        setPage(1);
                    }}
                    options={supplierOptions}
                    placement="bottom"
                    placeholder="Proveedor (todos)"
                    searchPlaceholder="Buscar proveedor..."
                    />
                </label>
    
                <label className="text-xs text-black/60">Almacen
                    <FilterableSelect
                    value={warehouseId}
                    onChange={(value) => {
                        setWarehouseId(value);
                        setPage(1);
                    }}
                    options={warehouseOptions}
                    placement="bottom"
                    placeholder="Almacen (todos)"
                    searchPlaceholder="Buscar almacen..."
                    />            
                </label>

                <label className="text-xs text-black/60">Tipo de documento
                  <select
                  className="h-10 w-full appearance-none rounded-lg border border-black/10 bg-white px-3 text-sm outline-none focus:ring-2"
                  style={ringStyle}
                  value={documentType}
                  onChange={(e) => {
                      setDocumentType(e.target.value as "" | VoucherDocType);
                      setPage(1);
                  }}
                  >
                      <option value="">Documento (todos)</option>
                      <option value={VoucherDocTypes.BOLETA}>Boleta</option>
                      <option value={VoucherDocTypes.FACTURA}>Factura</option>
                      <option value={VoucherDocTypes.NOTA_VENTA}>Nota de venta</option>
                  </select>
                </label>

                <label className="text-xs text-black/60">Estado
                  <select
                  className="h-10 w-full appearance-none rounded-lg border border-black/10 bg-white px-3 text-sm outline-none focus:ring-2"
                  style={ringStyle}
                  value={statusFilter}
                  onChange={(e) => {
                      setStatusFilter(e.target.value as "" | PurchaseOrderStatus);
                      setPage(1);
                  }}
                  >
                      <option value="">Estado (todos)</option>
                      <option value={PurchaseOrderStatuses.DRAFT}>Borrador</option>
                      <option value={PurchaseOrderStatuses.SENT}>Enviado</option>
                      <option value={PurchaseOrderStatuses.PARTIAL}>Parcial</option>
                      <option value={PurchaseOrderStatuses.RECEIVED}>Recibido</option>
                      <option value={PurchaseOrderStatuses.CANCELLED}>Cancelado</option>
                  </select>
                </label>
            </div>
        </section>

        <section className="rounded-3xl border border-black/10 bg-white shadow-sm overflow-hidden">
          <div className="max-h-[calc(100vh-320px)] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-white">
                <tr className="border-b border-black/10 text-xs text-black/60">
                  <th className="py-3 px-5 text-left">Fecha emision</th>
                  <th className="py-3 px-5 text-left">Numero</th>
                  <th className="py-3 px-5 text-left">Proveedor</th>
                  <th className="py-3 px-5 text-left">Almacen</th>
                  <th className="py-3 px-5 text-left">Documento</th>
                  <th className="py-3 px-5 text-left">Total</th>
                  <th className="py-3 px-5 text-left">Estado</th>
                </tr>
              </thead>

              <tbody key={listKey}>
                {purchases.map((purchase) => {
                  const numero = [purchase.serie, purchase.correlative]
                    .filter((v) => v !== null && v !== undefined && String(v).length > 0)
                    .join("-");
                  const supplierLabel = purchase.supplierId ? supplierLabelById.get(purchase.supplierId) : undefined;
                  const warehouseLabel = purchase.warehouseId ? warehouseLabelById.get(purchase.warehouseId) : undefined;
                  const statusLabel = purchase.status ? statusLabels[purchase.status] ?? purchase.status : "-";
                  const docLabel = purchase.documentType ? docTypeLabels[purchase.documentType] ?? purchase.documentType : "-";
                  return (
                    <tr key={purchase.poId ?? `${purchase.supplierId}-${purchase.createdAt ?? numero}`} className="border-b border-black/5">
                      <td className="py-3 px-5 text-black/70">{purchase.dateIssue?.slice(0, 10) ?? "-"}</td>
                      <td className="py-3 px-5 text-black/70">{numero || "-"}</td>
                      <td className="py-3 px-5 text-black/70">{supplierLabel ?? purchase.supplierId ?? "-"}</td>
                      <td className="py-3 px-5 text-black/70">{warehouseLabel ?? purchase.warehouseId ?? "-"}</td>
                      <td className="py-3 px-5 text-black/70">{docLabel}</td>
                      <td className="py-3 px-5 text-left text-black/70 tabular-nums">
                        {money(purchase.total ?? 0, purchase.currency)}
                      </td>
                      <td className="py-3 px-5">
                        <span className="inline-flex rounded-full px-2 py-1 text-[11px] font-medium bg-slate-50 text-slate-700">
                          {statusLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {!loading && purchases.length === 0 && (
              <div className="px-5 py-8 text-sm text-black/60">No hay compras con los filtros actuales.</div>
            )}
            {error && <div className="px-5 py-4 text-sm text-rose-600">{error}</div>}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-4 border-t border-black/10 text-xs text-black/60">
            <span className="hidden sm:inline">
              Mostrando {startIndex}-{endIndex} de {total}
            </span>

            <div className="flex items-center gap-2">
              <button
                className="rounded-lg border border-black/10 bg-white px-3 py-2 text-xs hover:bg-black/[0.03] disabled:opacity-40"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                type="button"
              >
                Anterior
              </button>

              <span className="tabular-nums">Pagina {page} de {totalPages}</span>

              <button
                className="rounded-lg border border-black/10 bg-white px-3 py-2 text-xs hover:bg-black/[0.03] disabled:opacity-40"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                type="button"
              >
                Siguiente
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
