import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { PageTitle } from "@/components/PageTitle";
import { FilterableSelect } from "@/components/SelectFilterable";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { errorResponse, successResponse } from "@/common/utils/response";
import { useSidebarContext } from "@/components/dashboard/SidebarContext";
import { listAll } from "@/services/supplierService";
import { listActive } from "@/services/warehouseServices";
import { enterPurchaseOrder, listPurchaseOrders, setCancelPurchase, setSentPurchase } from "@/services/purchaseService";
import { money, toDateInputValue, tryShowPicker, todayIso, buildMonthStartIso } from "@/utils/functionPurchases";
import { PaymentModal } from "./components/PaymentModal";
import { PaymentListModal } from "./components/PaymentListModal";
import { QuotaListModal } from "./components/QuotaListModal";
import { useNavigate } from "react-router-dom";
import { SupplierOption } from "../providers/types/supplier";
import { Warehouse } from "../warehouse/types/warehouse";
import { PurchaseOrder } from "./types/purchase";
import { PurchaseOrderStatus, PurchaseOrderStatuses, VoucherDocType, VoucherDocTypes, PaymentFormTypes } from "./types/purchaseEnums";
import TimerToEnd, { formatDate } from "@/component/TimerToEnd";
import { Dropdown } from "./components/PurchaseDropdown";
import { Menu, OctagonAlert, Timer } from "lucide-react";

const PRIMARY = "#21b8a6";

const statusLabels: Record<PurchaseOrderStatus, string> = {
  [PurchaseOrderStatuses.DRAFT]: "Borrador",
  [PurchaseOrderStatuses.SENT]: "Esperando",
  [PurchaseOrderStatuses.PARTIAL]: "Parcial",
  [PurchaseOrderStatuses.RECEIVED]: "Recibido",
  [PurchaseOrderStatuses.CANCELLED]: "Cancelado",
};

const docTypeLabels: Record<VoucherDocType, string> = {
  [VoucherDocTypes.FACTURA]: "Factura",
  [VoucherDocTypes.BOLETA]: "Boleta",
  [VoucherDocTypes.NOTA_VENTA]: "Nota de venta",
};

const normalizeNumber = (raw: string) => raw.trim().replace(/\s+/g, "");

export default function Purchases() {
  const { showFlash, clearFlash } = useFlashMessage();
  const navigate = useNavigate();

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
    if (loading) return;
    clearFlash();
    setLoading(true);
    setError(null);
    const number = normalizeNumber(debouncedNumero);
    try {
      const res = await listPurchaseOrders({
        page,
        limit,
        supplierId: supplierId || undefined,
        warehouseId: warehouseId || undefined,
        documentType: documentType || undefined,
        status: statusFilter || undefined,
        number: number || undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
      });
      setPurchases(res.items ?? []);
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
      setPurchases([]);
      setPagination((prev) => ({
        ...prev,
        total: 0,
        totalPages: 1,
        hasPrev: false,
        hasNext: false,
      }));
      setError("Error al listar compras");
      showFlash(errorResponse("Error al listar compras"));
    } finally {
      setLoading(false);
    }
  };
  
  const setSent = async (id:string) => {
    clearFlash();
    try {
      const res = await setSentPurchase(id);
      if(res.type === 'error'){
        showFlash(errorResponse(res.message));
      }
      if(res.type === 'success'){
        showFlash(successResponse(res.message));
        loadPurchases();
      }
    } catch {
      showFlash(errorResponse("Error al iniciar espera de mercaderia"));
    }
  };
  const cancelOrder = async (id:string) => {
    clearFlash();
    try {
      const res = await setCancelPurchase(id);
      if(res.type === 'error'){
        showFlash(errorResponse(res.message));
      }
      if(res.type === 'success'){
        showFlash(successResponse(res.message));
        loadPurchases();
      }
    } catch {
      showFlash(errorResponse("Error al iniciar espera de mercaderia"));
    }
  };
  const EnterToWarehouse = async (id:string) => {
    clearFlash();
    try {
      const res = await enterPurchaseOrder(id);
      if(res.type === 'error'){
        showFlash(errorResponse(res.message));
        loadPurchases();
      }
      if(res.type === 'success'){
        showFlash(successResponse(res.message));
        loadPurchases();
      }
    } catch {
      showFlash(errorResponse("Error al ingresar a almacen"));
      loadPurchases();
    }
  };

  useEffect(() => {
    void loadSuppliers();
    void loadWarehouses();
  }, []);

  useEffect(() => {
    void loadPurchases();
  }, [page, debouncedNumero, supplierId, warehouseId, documentType, statusFilter, fromDate, toDate]);

  const now = new Date().toISOString();

  const safePage = Math.max(1, pagination.page || page);
  const totalPages = Math.max(1, pagination.totalPages);
  const startIndex = pagination.total === 0 ? 0 : (safePage - 1) * (pagination.limit || limit) + 1;
  const endIndex = Math.min(safePage * (pagination.limit || limit), pagination.total);

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
      <div className="w-full min-h-screen bg-white">
          <PageTitle title="Compras" />
          <div className="mx-auto w-full max-w-[1500px] 2xl:max-w-[1700px] 3xl:max-w-[1900px] px-4 sm:px-6 lg:px-8 pt-2 space-y-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div className="space-y-1">
                      <h1 className="text-xl font-semibold tracking-tight">Compras</h1>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                      <div className="rounded-lg border border-black/10 bg-black/[0.02] px-3 py-0 text-[10px]">
                          Total: <span className="font-semibold text-black">{pagination.total}</span>
                      </div>
                  </div>
              </div>

              <section className=" bg-gray-50 shadow-sm  p-4 space-y-3">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-[0.2fr_0.2fr_0.5fr_1fr_1fr_0.5fr_0.6fr]">
                      <label className="text-[10px] text-black/60 font-bold">
                          Fecha inicio
                          <input
                              type="date"
                              className="h-8 w-full rounded-lg border border-black/10 bg-white px-3 text-[10px] outline-none focus:ring-2"
                              style={ringStyle}
                              value={toDateInputValue(fromDate)}
                              onClick={(e) => tryShowPicker(e.currentTarget)}
                              onChange={(e) => {
                                  setFromDate(e.target.value);
                                  setPage(1);
                              }}
                          />
                      </label>
                      <label className="text-[10px] text-black/60 font-bold">
                          Fecha fin
                          <input
                              type="date"
                              className="h-8 w-full rounded-lg border border-black/10 bg-white px-3 text-[10px] outline-none focus:ring-2"
                              style={ringStyle}
                              value={toDateInputValue(toDate)}
                              onClick={(e) => tryShowPicker(e.currentTarget)}
                              onChange={(e) => {
                                  setToDate(e.target.value);
                                  setPage(1);
                              }}
                          />
                      </label>
                      <label className="text-[10px] text-black/60 font-bold">
                          Número de documento
                          <input
                              className="h-8 w-full rounded-lg border border-black/10 bg-white pl-10 pr-3 text-[10px] outline-none focus:ring-2"
                              style={ringStyle}
                              value={numeroInput}
                              onChange={(e) => setNumeroInput(e.target.value)}
                          />
                      </label>

                      <label className="text-[10px] text-black/60 font-bold">
                          Proveedor
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
                              className="h-8"
                              textSize="text-[10px]"
                          />
                      </label>

                      <label className="text-[10px] text-black/60 font-bold">
                          Almacen
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
                              className="h-8"
                              textSize="text-[10px]"
                          />
                      </label>

                      <label className="text-[10px] text-black/60 font-bold">
                          Tipo de documento
                          <select
                              className="h-8 w-full appearance-none rounded-lg border border-black/10 bg-white px-3 text-[10px] outline-none focus:ring-2"
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

                      <label className="text-[10px] text-black/60 font-semibold">
                          Estado
                          <select
                              className="h-8 w-full appearance-none rounded-lg border border-black/10 bg-white px-3 text-[10px] outline-none focus:ring-2"
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

              <section className=" border-black/10 bg-white shadow-sm overflow-hidden">
                  <div className="max-h-[calc(100vh-220px)] min-h-[calc(100vh-220px)] overflow-auto">
                      <table className="w-full h-full table-fixed">
                          <thead className="sticky top-0 z-10 bg-gray-50">
                              <tr className="border-b border-black/10 text-black/60 text-[10px]">
                                  <th className="py-3 px-3 text-left w-[60px]">Fecha emision</th>
                                  <th className="py-3 px-3 text-left w-[40px]">Documento</th>
                                  <th className="py-3 px-3 text-left w-[50px]">Numero</th>
                                  <th className="py-3 px-3 text-left w-[130px]">Proveedor</th>
                                  <th className="py-3 px-3 text-left w-[92px]">Almacen</th>
                                  <th className="py-3 px-3 text-left w-[45px]">Forma</th>
                                  <th className="py-3 px-3 text-left w-[50px]">Total</th>
                                  <th className="py-3 px-3 text-left w-[50px]">Pagado</th>
                                  <th className="py-3 px-3 text-left w-[50px]">Pendiente</th>
                                  <th className="py-3 px-3 text-left w-[50px]">Estado</th>
                                  <th className="py-3 px-3 text-center w-[83px]">T. Espera</th>
                                  <th className="py-3 px-3 text-left w-[60px]">Ing. Almacen</th>
                                  <th className="py-3 px-0 text-left w-[20px]"></th>
                              </tr>
                          </thead>
                          <tbody key={listKey}>
                              {purchases.map((purchase) => {
                                  const numero = [purchase.serie, purchase.correlative].filter((v) => v !== null && v !== undefined && String(v).length > 0).join("-");
                                  const supplierMeta = purchase.supplierId ? supplierMetaById.get(purchase.supplierId) : undefined;
                                  const warehouseMeta = purchase.warehouseId ? warehouseMetaById.get(purchase.warehouseId) : undefined;
                                  const statusLabel = purchase.status ? (statusLabels[purchase.status] ?? purchase.status) : "-";
                                  const docLabel = purchase.documentType ? (docTypeLabels[purchase.documentType] ?? purchase.documentType) : "-";
                                  const date = formatDate(new Date(purchase.dateIssue ?? ""));
                                  const time = purchase.dateIssue
                                      ? new Date(purchase.dateIssue).toLocaleTimeString("es-PE", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                            second: "2-digit",
                                        })
                                      : undefined;
                                  const dateEnter = formatDate(new Date(purchase.expectedAt ?? ""));
                                  const timeEnter = purchase.expectedAt
                                      ? new Date(purchase.expectedAt).toLocaleTimeString("es-PE", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                            second: "2-digit",
                                        })
                                      : undefined;
                                  return (
                                      <tr key={purchase.poId ?? `${purchase.supplierId}-${purchase.createdAt ?? numero}`} className="border-b border-black/5 text-[10px]">
                                          <td className="py-1 px-3 text-black/70">
                                              {date} <br />
                                              {time}
                                          </td>
                                          <td className="py-1 px-3 text-black/70">{docLabel}</td>
                                          <td className="py-1 px-3 text-black/70">{numero}</td>
                                          <td className="py-1 px-3 text-black/70">
                                              <div>{supplierMeta?.label ?? "-"}</div>
                                              <div className="text-[10px] text-black/50">{supplierMeta?.doc ?? ""}</div>
                                          </td>
                                          <td className="py-1 px-3 text-black/70">
                                              <div>{warehouseMeta?.label ?? "-"}</div>
                                          </td>
                                          <td className="py-1 px-3 text-black/70">{purchase.paymentForm}</td>
                                          <td className="py-1 px-3 text-left text-black/70 tabular-nums">{money(purchase.total ?? 0, purchase.currency)}</td>
                                          <td className="py-1 px-3 text-left text-black/70 tabular-nums">{money(purchase.totalPaid ?? 0, purchase.currency)}</td>
                                          <td className="py-1 px-3 text-left text-black/70 tabular-nums">{money(purchase.totalToPay ?? 0, purchase.currency)}</td>
                                          <td className="py-1 px-3">
                                              <span className="inline-flex rounded-lg px-2 py-1 text-[10px] font-medium bg-slate-50 text-slate-700">{statusLabel}</span>
                                          </td>
                                          <td className="py-1 px-3 align-middle">
                                              <div className="flex h-full items-center justify-center">
                                                  {purchase.status === PurchaseOrderStatuses.SENT && (
                                                      <span className="inline-flex rounded-lg px-2 py-1 text-[10px] font-medium bg-slate-50 text-slate-700">
                                                          <TimerToEnd from={now} to={purchase.expectedAt ?? ""} 
                                                          loadPurchases={loadPurchases} />
                                                      </span>
                                                  )}
                                                  {purchase.status === PurchaseOrderStatuses.PARTIAL && (
                                                      <span className="flex flex-col items-center rounded-lg px-2 py-1 text-[10px] font-medium bg-slate-50 text-slate-700">
                                                          <OctagonAlert className="h-4 w-4" />
                                                          <span className="mt-1">Por Ing.</span>
                                                      </span>
                                                  )}
                                                  {purchase.status === PurchaseOrderStatuses.RECEIVED && (
                                                      <span className="flex flex-col items-center rounded-lg p-1 text-[10px] font-medium bg-slate-50 text-slate-700">
                                                          <Timer className="h-4 w-4" />
                                                          <span className="mt-1">Completado</span>
                                                      </span>
                                                  )}
                                              </div>
                                          </td>
                                          <td className="py-1 px-3 text-black/70">
                                              {dateEnter} <br />
                                              {timeEnter}
                                          </td>
                                          <td className="py-1 px-0">
                                              <Dropdown
                                                  trigger={<Menu className="h-4 w-4" />}
                                                  itemClassName="w-full rounded-lg px-3 py-2 text-left text-[10px] text-black/70 hover:bg-black/[0.04]"
                                                  items={[
                                                      (purchase.status === PurchaseOrderStatuses.SENT ||
                                                          purchase.status === PurchaseOrderStatuses.PARTIAL) && {
                                                          label: "Ingresar Almacen",
                                                          onClick: () => EnterToWarehouse(purchase.poId ?? ""),
                                                      },
                                                      purchase.status === PurchaseOrderStatuses.DRAFT && {
                                                          label: "Procesar",
                                                          onClick: () => setSent(purchase.poId ?? ""),
                                                      },
                                                      purchase.status === PurchaseOrderStatuses.DRAFT && {
                                                          label: "Cancelar",
                                                          onClick: () => cancelOrder(purchase.poId ?? ""),
                                                      },
                                                      purchase.status === PurchaseOrderStatuses.DRAFT && {
                                                          label: "Editar",
                                                          onClick: () => navigate(`/compra/${purchase.poId}`),
                                                      },
                                                      {
                                                          label: "Listar pagos",
                                                          onClick: () => {
                                                              setModalPaymentList(true);
                                                              setPoId(purchase.poId ?? "");
                                                              setTotalPo(purchase.total);
                                                              setPaymentForm(purchase.paymentForm);
                                                          },
                                                      },
                                                      purchase.paymentForm !== PaymentFormTypes.CREDITO &&
                                                          purchase.totalPaid != purchase.total && {
                                                              label: "Pago",
                                                              onClick: () => {
                                                                  setModalPayment(true);
                                                                  setTotalPaid(purchase.totalPaid ?? 0);
                                                                  setTotalToPay(purchase.totalToPay ?? 0);
                                                                  setPoId(purchase.poId ?? "");
                                                              },
                                                          },
                                                      purchase.paymentForm === PaymentFormTypes.CREDITO && {
                                                          label: "Ver cuotas",
                                                          onClick: () => {
                                                              setModalQuotaList(true);
                                                              setPoId(purchase.poId ?? "");
                                                          },
                                                      },
                                                  ].filter(Boolean)}
                                              />
                                          </td>
                                      </tr>
                                  );
                              })}
                          </tbody>
                      </table>

                      {!loading && purchases.length === 0 && <div className="px-5 py-8 text-[10px] text-black/60">No hay compras con los filtros actuales.</div>}
                      {error && <div className="px-5 py-4 text-[10px] text-rose-600">{error}</div>}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-4 border-t border-black/10 text-[10px] text-black/60">
                      <span className="hidden sm:inline">
                          Mostrando {startIndex}-{endIndex} de {pagination.total}
                      </span>

                      <div className="flex items-center gap-2">
                          <button
                              className="rounded-lg border border-black/10 bg-white px-3 py-2 text-[10px] hover:bg-black/[0.03] disabled:opacity-40"
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
                              className="rounded-lg border border-black/10 bg-white px-3 py-2 text-[10px] hover:bg-black/[0.03] disabled:opacity-40"
                              disabled={!pagination.hasNext || loading}
                              onClick={() => setPage(safePage + 1)}
                              type="button"
                          >
                              Siguiente
                          </button>
                      </div>
                  </div>
              </section>
          </div>
          {modalPayment && (
              <PaymentModal
                  title="Formulario de Pago"
                  close={() => {
                      setModalPayment(false);
                  }}
                  className="max-w-[800px]"
                  totalPaid={totalPaid}
                  totalToPay={totalToPay}
                  poId={poId}
                  loadPurchases={loadPurchases}
              />
          )}
          {modalPaymentList && (
              <PaymentListModal
                  title="Pagos"
                  close={() => {
                      setModalPaymentList(false);
                  }}
                  poId={poId}
                  total={totalPo}
                  className="max-w-[800px]"
                  loadPurchases={loadPurchases}
                  credit={paymentForm === PaymentFormTypes.CONTADO ? false : true}
              />
          )}
          {modalQuotaList && (
              <QuotaListModal
                  title="Cuotas"
                  close={() => {
                      setModalQuotaList(false);
                  }}
                  poId={poId}
                  className="max-w-[800px]"
                  loadPurchases={loadPurchases}
              />
          )}
      </div>
  );
}


