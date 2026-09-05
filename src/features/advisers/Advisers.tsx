import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Power, PowerOff, ScanLine } from "lucide-react";
import { PageShell } from "@/shared/layouts/PageShell";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { DataTable } from "@/shared/components/table/DataTable";
import type { DataTableColumn } from "@/shared/components/table/types";
import { DataTableSearchBar, DataTableSearchChips, type DataTableRecentSearchItem, type DataTableSavedSearchItem } from "@/shared/components/table/search";
import { DataTableActionsPopover } from "@/shared/components/components/DataTableActionsPopover";
import { StatusPill } from "@/shared/components/components/StatusTag";
import { Modal } from "@/shared/components/modales/Modal";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { AlertModal } from "@/shared/components/components/AlertModal";
import { usePermissions } from "@/shared/hooks/usePermissions";
import { createAdviser, deleteAdviserSearchMetric, getAdviserSearchState, listAdviserOrders, listAdviserSummary, saveAdviserSearchMetric, setAdviserActive, type AdviserOption, type AdviserOrderListItem } from "@/shared/services/adviserService";
import { listUsers, type UserApiListItem } from "@/shared/services/userService";
import { SaleOrderAdviserImportAliasesModal } from "@/features/sale-orders/components/SaleOrderAdviserImportAliasesModal";
import { SaleOrderDetailsModal } from "@/features/sale-orders/components/SaleOrderDetailsModal";
import { fetchSaleOrderById } from "@/shared/services/saleOrderService";
import type { SaleOrder } from "@/features/sale-orders/types/saleOrder";
import { AdviserSmartSearchPanel } from "./components/AdviserSmartSearchPanel";
import type { AdviserSearchRule, AdviserSearchSnapshot, AdviserSearchStateResponse } from "./types/adviserSearch";
import { applyAdviserSearchRule, buildAdviserSearchChips, removeAdviserSearchKey, sanitizeAdviserSearchSnapshot, type AdviserSearchFilterKey } from "./utils/adviserSmartSearch";
import { endOfMonth, getDateKey, startOfMonth } from "@/shared/components/components/date-picker/dateUtils";

const PAGE_SIZE = 25;
const money = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const centered = "text-center";
const centeredHeader = "text-center [&>div]:justify-center";
const dateFormatter = new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" });

const currentMonthPeriod = () => {
  const today = new Date();
  return { startDate: startOfMonth(today), endDate: endOfMonth(today) };
};

const orderNumber = (order: AdviserOrderListItem) => {
  if (order.serie && order.correlative != null) return `${order.serie}-${order.correlative}`;
  if (order.correlative != null) return String(order.correlative);
  return order.serie ?? "Sin número";
};

export default function Advisers() {
  const { can } = usePermissions();
  const canManage = can("advisers.manage");
  const [items, setItems] = useState<AdviserOption[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [periodDraft, setPeriodDraft] = useState<{ startDate: Date | null; endDate: Date | null }>(() => currentMonthPeriod());
  const [period, setPeriod] = useState<{ startDate: Date; endDate: Date }>(() => currentMonthPeriod());
  const [searchText, setSearchText] = useState("");
  const [appliedSearchText, setAppliedSearchText] = useState("");
  const [searchFilters, setSearchFilters] = useState<AdviserSearchRule[]>([]);
  const [searchState, setSearchState] = useState<AdviserSearchStateResponse | null>(null);
  const [savingMetric, setSavingMetric] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [users, setUsers] = useState<UserApiListItem[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<AdviserOption | null>(null);
  const [codesFor, setCodesFor] = useState<AdviserOption | null>(null);
  const [ordersFor, setOrdersFor] = useState<AdviserOption | null>(null);
  const [adviserOrders, setAdviserOrders] = useState<AdviserOrderListItem[]>([]);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<SaleOrder | null>(null);

  const draftSnapshot = useMemo(() => sanitizeAdviserSearchSnapshot({ q: searchText, filters: searchFilters }), [searchFilters, searchText]);
  const executedSnapshot = useMemo(() => sanitizeAdviserSearchSnapshot({ q: appliedSearchText, filters: searchFilters }), [appliedSearchText, searchFilters]);
  const loadSearchState = useCallback(async () => { try { setSearchState(await getAdviserSearchState()); } catch { setSearchState(null); } }, []);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await listAdviserSummary({ page, limit: PAGE_SIZE, q: executedSnapshot.q, filters: executedSnapshot.filters, startDate: getDateKey(period.startDate), endDate: getDateKey(period.endDate) });
      setItems(response.items ?? []); setTotal(response.total ?? 0);
      if (executedSnapshot.q || executedSnapshot.filters.length) void loadSearchState();
    } finally { setLoading(false); }
  }, [executedSnapshot, loadSearchState, page, period]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void loadSearchState(); }, [loadSearchState]);

  const recentSearches = useMemo<DataTableRecentSearchItem<AdviserSearchSnapshot>[]>(() => (searchState?.recent ?? []).map((item) => ({ id: item.recentId, label: item.label, snapshot: item.snapshot })), [searchState]);
  const savedMetrics = useMemo<DataTableSavedSearchItem<AdviserSearchSnapshot>[]>(() => (searchState?.saved ?? []).map((item) => ({ id: item.metricId, name: item.name, label: item.label, snapshot: item.snapshot })), [searchState]);
  const chips = useMemo(() => buildAdviserSearchChips(executedSnapshot, searchState?.catalogs), [executedSnapshot, searchState]);
  const submitSearch = () => startTransition(() => { setAppliedSearchText(searchText.trim()); setPage(1); });
  const applySnapshot = (snapshot: AdviserSearchSnapshot) => startTransition(() => { const next = sanitizeAdviserSearchSnapshot(snapshot); setSearchText(next.q ?? ""); setAppliedSearchText(next.q ?? ""); setSearchFilters(next.filters); setPage(1); });
  const applyRule = (rule: AdviserSearchRule) => startTransition(() => { setSearchFilters((current) => applyAdviserSearchRule({ q: searchText, filters: current }, rule).filters); setPage(1); });
  const removeRule = (key: "q" | AdviserSearchFilterKey) => startTransition(() => { const next = removeAdviserSearchKey(executedSnapshot, key); setSearchText(next.q ?? ""); setAppliedSearchText(next.q ?? ""); setSearchFilters(next.filters); setPage(1); });
  const saveMetric = async (name: string) => { setSavingMetric(true); try { const response = await saveAdviserSearchMetric(name, draftSnapshot); if (response.type === "error") return false; await loadSearchState(); return true; } finally { setSavingMetric(false); } };
  const deleteMetric = async (id: string) => { await deleteAdviserSearchMetric(id); await loadSearchState(); };

  const openAdd = async () => { const response = await listUsers({ status: "active", page: 1 }); setUsers(response.items ?? []); setSelectedUser(""); setAddOpen(true); };
  const add = async () => { if (!selectedUser) return; setSaving(true); try { await createAdviser(selectedUser); setAddOpen(false); await load(); } finally { setSaving(false); } };
  const toggle = async () => { if (!pending) return; setSaving(true); try { await setAdviserActive(pending.id, !pending.isActive); setPending(null); await load(); } finally { setSaving(false); } };

  const changePeriod = ({ startDate, endDate }: { startDate: Date | null; endDate: Date | null }) => {
    if (!startDate && !endDate) {
      const next = currentMonthPeriod();
      setPeriodDraft(next); setPeriod(next); setPage(1); setOrdersPage(1);
      return;
    }
    setPeriodDraft({ startDate, endDate });
    if (startDate && endDate) {
      setPeriod({ startDate, endDate }); setPage(1); setOrdersPage(1);
    }
  };

  const openOrders = (adviser: AdviserOption) => { setAdviserOrders([]); setOrdersTotal(0); setOrdersFor(adviser); setOrdersPage(1); };
  const closeOrders = () => { setOrdersFor(null); setAdviserOrders([]); setOrdersTotal(0); };
  const openOrderDetail = async (order: AdviserOrderListItem) => {
    try {
      setSelectedOrder(await fetchSaleOrderById(order.id));
    } catch {
      setSelectedOrder(null);
    }
  };
  useEffect(() => {
    if (!ordersFor) return;
    let active = true;
    setOrdersLoading(true);
    void listAdviserOrders(ordersFor.id, { page: ordersPage, limit: PAGE_SIZE, startDate: getDateKey(period.startDate), endDate: getDateKey(period.endDate) })
      .then((response) => { if (active) { setAdviserOrders(response.items ?? []); setOrdersTotal(response.total ?? 0); } })
      .catch(() => { if (active) { setAdviserOrders([]); setOrdersTotal(0); } })
      .finally(() => { if (active) setOrdersLoading(false); });
    return () => { active = false; };
  }, [ordersFor, ordersPage, period]);

  const orderColumns = useMemo<DataTableColumn<AdviserOrderListItem>[]>(() => [
    { id: "number", header: "Pedido", cell: orderNumber, className: "font-semibold whitespace-nowrap" },
    { id: "client", header: "Cliente", accessorKey: "clientName", className: "max-w-[210px] truncate" },
    { id: "createdAt", header: "Fecha", cell: (order) => dateFormatter.format(new Date(order.createdAt)), sortAccessor: (order) => new Date(order.createdAt), className: centered, headerClassName: centeredHeader },
    { id: "state", header: "Estado", cell: (order) => <span className="inline-flex max-w-[130px] truncate rounded-full border px-2 py-1 text-[11px] font-medium" style={order.stateColor ? { borderColor: order.stateColor, color: order.stateColor } : undefined}>{order.stateName}</span>, className: centered, headerClassName: centeredHeader },
    { id: "total", header: "Vendido", cell: (order) => money.format(order.total), sortAccessor: "total", className: `${centered} whitespace-nowrap`, headerClassName: centeredHeader },
    { id: "collected", header: "Recaudado", cell: (order) => money.format(order.collectedTotal), sortAccessor: "collectedTotal", className: `${centered} whitespace-nowrap`, headerClassName: centeredHeader },
  ], []);

  const columns = useMemo<DataTableColumn<AdviserOption>[]>(() => [
    { id: "name", header: "Asesor", accessorKey: "name", cell: (row) => <div><div className="font-semibold text-zinc-900">{row.name}</div><div className="text-xs text-zinc-500">{row.email}</div></div> },
    { id: "assignedOrders", header: "Pedidos asignados", cell: (row) => <button type="button" className="inline-flex min-w-9 items-center justify-center rounded-md px-2 py-1 font-semibold text-primary transition hover:bg-primary/10 hover:underline" onClick={() => openOrders(row)} aria-label={`Ver pedidos asignados a ${row.name}`}>{row.assignedOrders ?? 0}</button>, sortAccessor: (row) => row.assignedOrders ?? 0, headerClassName: centeredHeader, className: centered, stopRowClick: true },
    { id: "soldTotal", header: "Total dinero vendido", cell: (row) => money.format(row.soldTotal ?? 0), sortAccessor: (row) => row.soldTotal ?? 0, headerClassName: centeredHeader, className: centered },
    { id: "collectedTotal", header: "Total dinero recaudado", cell: (row) => money.format(row.collectedTotal ?? 0), sortAccessor: (row) => row.collectedTotal ?? 0, headerClassName: centeredHeader, className: centered },
    { id: "status", header: "Estado", cell: (row) => <StatusPill active={row.isActive !== false} PRIMARY="hsl(var(--primary))" />, headerClassName: centeredHeader, className: centered },
    { id: "actions", header: "Acciones", stopRowClick: true, visible: canManage, headerClassName: centeredHeader, className: centered, cell: (row) => <div className="flex justify-center"><DataTableActionsPopover actions={[{ id: "codes", label: "Códigos", icon: <ScanLine className="h-4 w-4" />, onClick: () => setCodesFor(row) }, { id: "toggle", label: row.isActive ? "Desactivar" : "Activar", icon: row.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />, onClick: () => setPending(row) }]} /></div> },
  ], [canManage]);

  return <PageShell>
    <DataTableSearchChips chips={chips} onRemove={(chip) => removeRule(chip.removeKey)} />
    <DataTable tableId="advisers-table" data={items} columns={columns} rowKey="id" loading={loading} selectableColumns searchMode="server" pagination={{ page, limit: PAGE_SIZE, total }} onPageChange={setPage} emptyMessage="No hay asesores con los filtros actuales."
      rangeDates={{ startDate: periodDraft.startDate, endDate: periodDraft.endDate, onChange: changePeriod, label: "Período", name: "advisers-period" }}
      toolbarSearchContent={<DataTableSearchBar value={searchText} onChange={setSearchText} onSubmitSearch={submitSearch} searchLabel="Busca tu asesor" searchName="adviser-smart-search" canSaveMetric={Boolean(draftSnapshot.q || draftSnapshot.filters.length)} saveLoading={savingMetric} onSaveMetric={saveMetric}><AdviserSmartSearchPanel recent={recentSearches} saved={savedMetrics} snapshot={draftSnapshot} catalogs={searchState?.catalogs} filterQuery={searchText} onApplySnapshot={applySnapshot} onApplyRule={applyRule} onRemoveRule={removeRule} onDeleteMetric={(id) => void deleteMetric(id)} /></DataTableSearchBar>}
      toolbarActions={canManage ? <SystemButton size="icon" variant="outline" className="h-11 w-11 rounded-md shadow-sm" tooltip="Agregar asesor" title="Agregar asesor" leftIcon={<Plus className="h-4 w-4" />} onClick={() => void openAdd()} /> : null} />
    <Modal open={Boolean(ordersFor)} onClose={closeOrders} title={`Pedidos asignados · ${ordersFor?.name ?? ""}`} description={`${dateFormatter.format(period.startDate)} - ${dateFormatter.format(period.endDate)}`} className="w-[min(820px,calc(100vw-2rem))]" bodyClassName="p-3">
      <DataTable tableId="adviser-orders-detail" data={adviserOrders} columns={orderColumns} rowKey="id" loading={ordersLoading} responsiveMode="table" stickyHeader maxHeight="min(58vh,560px)" pagination={{ page: ordersPage, limit: PAGE_SIZE, total: ordersTotal }} onPageChange={setOrdersPage} onRowClick={(order) => void openOrderDetail(order)} emptyMessage="Este asesor no tiene pedidos asignados en el período seleccionado." paddingTablePaginated="py-1" />
    </Modal>
    <SaleOrderDetailsModal
      open={Boolean(selectedOrder)}
      order={selectedOrder}
      onClose={() => setSelectedOrder(null)}
      capabilities={{ canEdit: false, canManageAdvancedOrders: false, canAssignWorkflow: false }}
    />
    <Modal
      open={addOpen}
      onClose={() => setAddOpen(false)}
      title="Agregar asesor"
      description="Selecciona el usuario que trabajará como asesor."
      className="w-[min(560px,calc(100vw-2rem))]"
      headerClassName="px-5 py-4"
      bodyClassName="p-5 sm:p-6"
    >
      <div className="space-y-6">
        <FloatingSelect
          label="Usuario del sistema"
          name="adviser-user"
          value={selectedUser}
          options={users
            .filter((user) => !user.deleted)
            .map((user) => ({ value: user.id, label: `${user.name} (${user.email})` }))}
          onChange={setSelectedUser}
          searchable
          panelWidthMode="min-trigger"
          emptyMessage="No hay usuarios disponibles"
          className="h-11 text-sm"
        />
        <div className="flex justify-end border-t border-border pt-4">
          <SystemButton onClick={() => void add()} loading={saving} disabled={!selectedUser}>
            Agregar asesor
          </SystemButton>
        </div>
      </div>
    </Modal>
    <AlertModal open={Boolean(pending)} onClose={() => setPending(null)} onConfirm={() => void toggle()} type={pending?.isActive ? "warning" : "restore"} title={pending?.isActive ? "Desactivar asesor" : "Activar asesor"} message={pending?.isActive ? "El asesor no podrá recibir nuevas asignaciones." : "El asesor podrá recibir nuevas asignaciones."} confirmText={pending?.isActive ? "Desactivar" : "Activar"} loading={saving} />
    <SaleOrderAdviserImportAliasesModal open={Boolean(codesFor)} adviserUserId={codesFor?.id} adviserName={codesFor?.name} canManage={canManage} onClose={() => setCodesFor(null)} />
  </PageShell>;
}
