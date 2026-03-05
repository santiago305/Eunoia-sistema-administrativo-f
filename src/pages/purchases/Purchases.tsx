import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { PageTitle } from "@/components/PageTitle";
import { FilterableSelect } from "@/components/SelectFilterable";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { errorResponse } from "@/common/utils/response";
import { useSidebarContext } from "@/components/dashboard/SidebarContext";
import { listAll } from "@/services/supplierService";
import { listActive } from "@/services/warehouseServices";
import { listPurchaseOrders } from "@/services/purchaseService";
import { money, toDateInputValue, tryShowPicker, todayIso } from "@/utils/functionPurchases";
import type { PurchaseOrder } from "@/types/purchase";
import type { SupplierOption } from "@/types/supplier";
import type { Warehouse } from "@/types/warehouse";
import { VoucherDocTypes, type VoucherDocType, PurchaseOrderStatuses, type PurchaseOrderStatus, PaymentFormTypes } from "@/types/purchaseEnums";
import { PaymentModal } from "./components/PaymentModal";
import { PaymentListModal } from "./components/PaymentListModal";
import { QuotaListModal } from "./components/QuotaListModal";

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
  const { setCollapsed } = useSidebarContext();

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

  const [supplierOptions, setSupplierOptions] = useState<(SupplierOption & { doc?: string })[]>([]);
  const [warehouseOptions, setWarehouseOptions] = useState<{ value: string; label: string; address?: string }[]>([]);
  const [modalPayment, setModalPayment] = useState(false);
  const [modalPaymentList, setModalPaymentList] = useState(false);
  const [modalQuotaList, setModalQuotaList] = useState(false);

  const [totalPaid, setTotalPaid] = useState(0);
  const [totalToPay, setTotalToPay] = useState(0);
  const [totalPo, setTotalPo] = useState(0);
  const [poId, setPoId] = useState("");
  const [paymentForm, setPaymentForm] = useState("");
  

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
            label: display || s.supplierId,
            doc: s.documentNumber ?? "",
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
        res?.map((s: Warehouse) => {
          const address = `${s.department}-${s.province}-${s.district}`;
          return {
            value: s.warehouseId,
            label: s.name,
            address,
          };
        }) ?? [];
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
    setCollapsed(true);
  }, [setCollapsed]);

  useEffect(() => {
    void loadPurchases();
  }, [page, debouncedNumero, supplierId, warehouseId, documentType, statusFilter, fromDate, toDate]);

  useEffect(() => {
    if (apiPage !== page) setPage(apiPage);
  }, [apiPage, page]);

  const totalPages = Math.max(1, Math.ceil(total / (apiLimit || limit)));
  const startIndex = total === 0 ? 0 : (apiPage - 1) * (apiLimit || limit) + 1;
  const endIndex = Math.min(apiPage * (apiLimit || limit), total);

  const supplierMetaById = useMemo(() => {
    const map = new Map<string, { label: string; doc?: string }>();
    supplierOptions.forEach((opt) => {
      if (opt.value) map.set(opt.value, { label: opt.label, doc: opt.doc });
    });
    return map;
  }, [supplierOptions]);

  const warehouseMetaById = useMemo(() => {
    const map = new Map<string, { label: string; address?: string }>();
    warehouseOptions.forEach((opt) => {
      if (opt.value) map.set(opt.value, { label: opt.label, address: opt.address });
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
                  <th className="py-3 px-3 text-left">Fecha emision</th>
                  <th className="py-3 px-3 text-left">Documento</th>
                  <th className="py-3 px-3 text-left">Numero</th>
                  <th className="py-3 px-3 text-left">Proveedor</th>
                  <th className="py-3 px-3 text-left">Almacen</th>
                  <th className="py-3 px-3 text-left">Forma de pago</th>
                  <th className="py-3 px-3 text-left">Total</th>
                  <th className="py-3 px-3 text-left">Pagado</th>
                  <th className="py-3 px-3 text-left">Pendiente</th>
                  <th className="py-3 px-3 text-left">Estado</th>
                  <th className="py-3 px-3 text-left">Opciones</th>
                </tr>
              </thead>
              <tbody key={listKey}>
                {purchases.map((purchase) => {
                  const numero = [purchase.serie, purchase.correlative]
                    .filter((v) => v !== null && v !== undefined && String(v).length > 0)
                    .join("-");
                  const supplierMeta = purchase.supplierId ? supplierMetaById.get(purchase.supplierId) : undefined;
                  const warehouseMeta = purchase.warehouseId ? warehouseMetaById.get(purchase.warehouseId) : undefined;
                  const statusLabel = purchase.status ? statusLabels[purchase.status] ?? purchase.status : "-";
                  const docLabel = purchase.documentType ? docTypeLabels[purchase.documentType] ?? purchase.documentType : "-";
                  const date = purchase.dateIssue?.slice(0,10);
                  const time = purchase.dateIssue
                      ? new Date(purchase.dateIssue).toLocaleTimeString("es-PE", {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                        })
                      : undefined;         
                  return (
                    <tr key={purchase.poId ?? `${purchase.supplierId}-${purchase.createdAt ?? numero}`} className="border-b border-black/5">
                      <td className="py-3 px-3 text-black/70">
                        {date} <br />
                        {time}
                      </td>
                      <td className="py-3 px-3 text-black/70">{docLabel}</td>
                      <td className="py-3 px-3 text-black/70">{numero}</td>
                      <td className="py-3 px-3 text-black/70">
                        <div>{supplierMeta?.label ?? "-"}</div>
                        <div className="text-xs text-black/50">{supplierMeta?.doc ?? ""}</div>
                      </td>
                      <td className="py-3 px-3 text-black/70">
                        <div>{warehouseMeta?.label ?? "-"}</div>
                        <div className="text-xs text-black/50">{warehouseMeta?.address ?? ""}</div>
                      </td>
                      <td className="py-3 px-3 text-black/70">
                        {purchase.paymentForm}
                      </td>
                      <td className="py-3 px-3 text-left text-black/70 tabular-nums">
                        {money(purchase.total ?? 0, purchase.currency)}
                      </td>
                      <td className="py-3 px-3 text-left text-black/70 tabular-nums">
                        {money(purchase.totalPaid ?? 0, purchase.currency)}
                      </td>
                      <td className="py-3 px-3 text-left text-black/70 tabular-nums">
                        {money(purchase.totalToPay ?? 0, purchase.currency)}
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex rounded-full px-2 py-1 text-[11px] font-medium bg-slate-50 text-slate-700">
                          {statusLabel}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {
                          purchase.paymentForm !== PaymentFormTypes.CREDITO &&
                          purchase.totalPaid != purchase.total && (
                            <button
                              className="w-full rounded-lg px-3 py-2 text-left text-xs text-black/70 hover:bg-black/[0.04]"
                              onClick={() => {
                                setModalPayment(true);
                                setTotalPaid(purchase.totalPaid);
                                setTotalToPay(purchase.totalToPay);
                                setPoId(purchase.poId ?? "");
                              }}
                              type="button"
                            >
                              Pago
                            </button>
                          )
                        }
                        <button
                          className="w-full rounded-lg px-3 py-2 text-left text-xs text-black/70 hover:bg-black/[0.04]"
                          onClick={() => {
                            setModalPaymentList(true);
                            setPoId(purchase.poId ?? "");
                            setTotalPo(purchase.total);
                            setPaymentForm(purchase.paymentForm);
                          }}
                          type="button"
                        >
                          Listar pagos
                        </button>
                        {
                          purchase.paymentForm === PaymentFormTypes.CREDITO && (
                            <button
                              className="w-full rounded-lg px-3 py-2 text-left text-xs text-black/70 hover:bg-black/[0.04]"
                              onClick={() => {
                                setModalQuotaList(true);
                                setPoId(purchase.poId ?? "");
                              }}
                              type="button"
                            >
                              Ver cuotas
                            </button>
                          )
                        }
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
      {
        modalPayment && (
          <PaymentModal
            title="Formulario de Pago"
            close={() =>{
              setModalPayment(false);
            }}
            className="max-w-[800px]"
            totalPaid={totalPaid}
            totalToPay={totalToPay}
            poId={poId}
            loadPurchases={loadPurchases}
          />
        )
      }
      {
        modalPaymentList && (
        <PaymentListModal
          title="Pagos"
          close={() =>{
            setModalPaymentList(false);
          }}
          poId= {poId}
          total={totalPo}
          className="max-w-[800px]"
          loadPurchases={loadPurchases}
          credit= {
            paymentForm === PaymentFormTypes.CONTADO ? false : true
          }
        />
        )
      }
      {
        modalQuotaList && (
        <QuotaListModal
          title="Cuotas"
          close={() =>{
            setModalQuotaList(false);
          }}
          poId= {poId}
          className="max-w-[800px]"
        />
        )
      }
    </div>
  );
}
