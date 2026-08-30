import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import { Edit3, Plus, Power, PowerOff, ScanLine } from "lucide-react";
import { PageShell } from "@/shared/layouts/PageShell";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { DataTable } from "@/shared/components/table/DataTable";
import type { DataTableColumn } from "@/shared/components/table/types";
import { DataTableSearchBar, DataTableSearchChips, type DataTableRecentSearchItem, type DataTableSavedSearchItem } from "@/shared/components/table/search";
import { DataTableActionsPopover } from "@/shared/components/components/DataTableActionsPopover";
import { StatusPill } from "@/shared/components/components/StatusTag";
import { Modal } from "@/shared/components/modales/Modal";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { AlertModal } from "@/shared/components/components/AlertModal";
import { usePermissions } from "@/shared/hooks/usePermissions";
import { createAdviser, deleteAdviserSearchMetric, getAdviserSearchState, listAdviserSummary, saveAdviserSearchMetric, setAdviserActive, updateAdviser, type AdviserOption } from "@/shared/services/adviserService";
import { listUsers, type UserApiListItem } from "@/shared/services/userService";
import { SaleOrderAdviserImportAliasesModal } from "@/features/sale-orders/components/SaleOrderAdviserImportAliasesModal";
import { AdviserSmartSearchPanel } from "./components/AdviserSmartSearchPanel";
import type { AdviserSearchRule, AdviserSearchSnapshot, AdviserSearchStateResponse } from "./types/adviserSearch";
import { applyAdviserSearchRule, buildAdviserSearchChips, removeAdviserSearchKey, sanitizeAdviserSearchSnapshot, type AdviserSearchFilterKey } from "./utils/adviserSmartSearch";

const PAGE_SIZE = 25;
const money = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const centered = "text-center";
const centeredHeader = "text-center [&>div]:justify-center";

export default function Advisers() {
  const { can } = usePermissions();
  const canManage = can("advisers.manage");
  const [items, setItems] = useState<AdviserOption[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
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
  const [editing, setEditing] = useState<AdviserOption | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");

  const draftSnapshot = useMemo(() => sanitizeAdviserSearchSnapshot({ q: searchText, filters: searchFilters }), [searchFilters, searchText]);
  const executedSnapshot = useMemo(() => sanitizeAdviserSearchSnapshot({ q: appliedSearchText, filters: searchFilters }), [appliedSearchText, searchFilters]);
  const loadSearchState = useCallback(async () => { try { setSearchState(await getAdviserSearchState()); } catch { setSearchState(null); } }, []);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await listAdviserSummary({ page, limit: PAGE_SIZE, q: executedSnapshot.q, filters: executedSnapshot.filters });
      setItems(response.items ?? []); setTotal(response.total ?? 0);
      if (executedSnapshot.q || executedSnapshot.filters.length) void loadSearchState();
    } finally { setLoading(false); }
  }, [executedSnapshot, loadSearchState, page]);
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
  const saveEdit = async () => { if (!editing) return; setSaving(true); try { await updateAdviser(editing.id, { name: editName, email: editEmail }); setEditing(null); await load(); } finally { setSaving(false); } };

  const columns = useMemo<DataTableColumn<AdviserOption>[]>(() => [
    { id: "name", header: "Asesor", accessorKey: "name", cell: (row) => <div><div className="font-semibold text-zinc-900">{row.name}</div><div className="text-xs text-zinc-500">{row.email}</div></div> },
    { id: "assignedOrders", header: "Pedidos asignados", cell: (row) => row.assignedOrders ?? 0, sortAccessor: (row) => row.assignedOrders ?? 0, headerClassName: centeredHeader, className: centered },
    { id: "soldTotal", header: "Total dinero vendido", cell: (row) => money.format(row.soldTotal ?? 0), sortAccessor: (row) => row.soldTotal ?? 0, headerClassName: centeredHeader, className: centered },
    { id: "collectedTotal", header: "Total dinero recaudado", cell: (row) => money.format(row.collectedTotal ?? 0), sortAccessor: (row) => row.collectedTotal ?? 0, headerClassName: centeredHeader, className: centered },
    { id: "status", header: "Estado", cell: (row) => <StatusPill active={row.isActive !== false} PRIMARY="hsl(var(--primary))" />, headerClassName: centeredHeader, className: centered },
    { id: "actions", header: "Acciones", stopRowClick: true, visible: canManage, headerClassName: centeredHeader, className: centered, cell: (row) => <div className="flex justify-center"><DataTableActionsPopover actions={[{ id: "codes", label: "Códigos", icon: <ScanLine className="h-4 w-4" />, onClick: () => setCodesFor(row) }, { id: "edit", label: "Editar", icon: <Edit3 className="h-4 w-4" />, onClick: () => { setEditing(row); setEditName(row.name); setEditEmail(row.email); } }, { id: "toggle", label: row.isActive ? "Desactivar" : "Activar", icon: row.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />, onClick: () => setPending(row) }]} /></div> },
  ], [canManage]);

  return <PageShell>
    <DataTableSearchChips chips={chips} onRemove={(chip) => removeRule(chip.removeKey)} />
    <DataTable tableId="advisers-table" data={items} columns={columns} rowKey="id" loading={loading} selectableColumns searchMode="server" pagination={{ page, limit: PAGE_SIZE, total }} onPageChange={setPage} emptyMessage="No hay asesores con los filtros actuales."
      toolbarSearchContent={<DataTableSearchBar value={searchText} onChange={setSearchText} onSubmitSearch={submitSearch} searchLabel="Busca tu asesor" searchName="adviser-smart-search" canSaveMetric={Boolean(draftSnapshot.q || draftSnapshot.filters.length)} saveLoading={savingMetric} onSaveMetric={saveMetric}><AdviserSmartSearchPanel recent={recentSearches} saved={savedMetrics} snapshot={draftSnapshot} catalogs={searchState?.catalogs} filterQuery={searchText} onApplySnapshot={applySnapshot} onApplyRule={applyRule} onRemoveRule={removeRule} onDeleteMetric={(id) => void deleteMetric(id)} /></DataTableSearchBar>}
      toolbarActions={canManage ? <SystemButton size="icon" variant="outline" className="h-11 w-11 rounded-md shadow-sm" tooltip="Agregar asesor" title="Agregar asesor" leftIcon={<Plus className="h-4 w-4" />} onClick={() => void openAdd()} /> : null} />
    <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Agregar asesor"><div className="space-y-4"><FloatingSelect label="Usuario del sistema" name="adviser-user" value={selectedUser} options={users.filter((user) => !user.deleted).map((user) => ({ value: user.id, label: `${user.name} (${user.email})` }))} onChange={setSelectedUser} searchable emptyMessage="No hay usuarios disponibles" /><div className="flex justify-end"><SystemButton onClick={() => void add()} loading={saving} disabled={!selectedUser}>Agregar</SystemButton></div></div></Modal>
    <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title="Editar asesor"><div className="space-y-3"><FloatingInput label="Nombre" name="adviser-name" value={editName} onChange={(event) => setEditName(event.target.value)} /><FloatingInput label="Correo" name="adviser-email" value={editEmail} onChange={(event) => setEditEmail(event.target.value)} /><div className="flex justify-end"><SystemButton onClick={() => void saveEdit()} loading={saving}>Guardar</SystemButton></div></div></Modal>
    <AlertModal open={Boolean(pending)} onClose={() => setPending(null)} onConfirm={() => void toggle()} type={pending?.isActive ? "warning" : "restore"} title={pending?.isActive ? "Desactivar asesor" : "Activar asesor"} message={pending?.isActive ? "El asesor no podrá recibir nuevas asignaciones." : "El asesor podrá recibir nuevas asignaciones."} confirmText={pending?.isActive ? "Desactivar" : "Activar"} loading={saving} />
    <SaleOrderAdviserImportAliasesModal open={Boolean(codesFor)} adviserUserId={codesFor?.id} adviserName={codesFor?.name} canManage={canManage} onClose={() => setCodesFor(null)} />
  </PageShell>;
}
