import { useCallback, useEffect, useMemo, useState } from "react";
import { Edit3, Plus, Power, PowerOff, ScanLine } from "lucide-react";
import { PageShell } from "@/shared/layouts/PageShell";
import { PageActionsRow } from "@/shared/components/components/PageActionsRow";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { DataTable } from "@/shared/components/table/DataTable";
import type { DataTableColumn } from "@/shared/components/table/types";
import { DataTableActionsPopover } from "@/shared/components/components/DataTableActionsPopover";
import { StatusPill } from "@/shared/components/components/StatusTag";
import { Modal } from "@/shared/components/modales/Modal";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { AlertModal } from "@/shared/components/components/AlertModal";
import { usePermissions } from "@/shared/hooks/usePermissions";
import { listAdviserSummary, setAdviserActive, createAdviser, updateAdviser, type AdviserOption } from "@/shared/services/adviserService";
import { listUsers, type UserApiListItem } from "@/shared/services/userService";
import { SaleOrderAdviserImportAliasesModal } from "@/features/sale-orders/components/SaleOrderAdviserImportAliasesModal";

const money = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

export default function Advisers() {
  const { can } = usePermissions();
  const canManage = can("advisers.manage");
  const [items, setItems] = useState<AdviserOption[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [users, setUsers] = useState<UserApiListItem[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<AdviserOption | null>(null);
  const [codesFor, setCodesFor] = useState<AdviserOption | null>(null);
  const [editing, setEditing] = useState<AdviserOption | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try { const response = await listAdviserSummary({ page, limit: 25, q: query.trim() || undefined }); setItems(response.items ?? []); setTotal(response.total ?? 0); }
    finally { setLoading(false); }
  }, [page, query]);
  useEffect(() => { void load(); }, [load]);

  const openAdd = async () => { const response = await listUsers({ status: "active", page: 1 }); setUsers(response.items ?? []); setSelectedUser(""); setAddOpen(true); };
  const add = async () => { if (!selectedUser) return; setSaving(true); try { await createAdviser(selectedUser); setAddOpen(false); await load(); } finally { setSaving(false); } };
  const toggle = async () => { if (!pending) return; setSaving(true); try { await setAdviserActive(pending.id, !pending.isActive); setPending(null); await load(); } finally { setSaving(false); } };
  const saveEdit = async () => { if (!editing) return; setSaving(true); try { await updateAdviser(editing.id, { name: editName, email: editEmail }); setEditing(null); await load(); } finally { setSaving(false); } };
  const columns = useMemo<DataTableColumn<AdviserOption>[]>(() => [
    { id: "name", header: "Asesor", accessorKey: "name", cell: (row) => <div><div className="font-semibold text-zinc-900">{row.name}</div><div className="text-xs text-zinc-500">{row.email}</div></div> },
    { id: "assignedOrders", header: "Pedidos asignados", cell: (row) => row.assignedOrders ?? 0, sortAccessor: (row) => row.assignedOrders ?? 0 },
    { id: "soldTotal", header: "Total vendido", cell: (row) => money.format(row.soldTotal ?? 0), sortAccessor: (row) => row.soldTotal ?? 0 },
    { id: "collectedTotal", header: "Total recaudado", cell: (row) => money.format(row.collectedTotal ?? 0), sortAccessor: (row) => row.collectedTotal ?? 0 },
    { id: "status", header: "Estado", cell: (row) => <StatusPill active={row.isActive !== false} PRIMARY="hsl(var(--primary))" /> },
    { id: "actions", header: "Acciones", stopRowClick: true, visible: canManage, cell: (row) => <DataTableActionsPopover actions={[{ id: "codes", label: "Códigos", icon: <ScanLine className="h-4 w-4" />, onClick: () => setCodesFor(row) }, { id: "edit", label: "Editar", icon: <Edit3 className="h-4 w-4" />, onClick: () => { setEditing(row); setEditName(row.name); setEditEmail(row.email); } }, { id: "toggle", label: row.isActive ? "Desactivar" : "Activar", icon: row.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />, onClick: () => setPending(row) }]} /> },
  ], [canManage]);
  return <PageShell><PageActionsRow><SystemButton size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => void openAdd()} disabled={!canManage}>Agregar asesor</SystemButton></PageActionsRow><DataTable tableId="advisers-table" data={items} columns={columns} rowKey="id" loading={loading} selectableColumns={false} searchMode="server" searchPlaceholder="Buscar asesor..." searchValue={query} onSearchChange={(value) => { setQuery(value); setPage(1); }} pagination={{ page, limit: 25, total }} onPageChange={setPage} emptyMessage="No hay asesores registrados." /><Modal open={addOpen} onClose={() => setAddOpen(false)} title="Agregar asesor"><div className="space-y-4"><FloatingSelect label="Usuario del sistema" name="adviser-user" value={selectedUser} options={users.filter((user) => !user.deleted).map((user) => ({ value: user.id, label: `${user.name} (${user.email})` }))} onChange={setSelectedUser} searchable emptyMessage="No hay usuarios disponibles" /><div className="flex justify-end"><SystemButton onClick={() => void add()} loading={saving} disabled={!selectedUser}>Agregar</SystemButton></div></div></Modal><Modal open={Boolean(editing)} onClose={() => setEditing(null)} title="Editar asesor"><div className="space-y-3"><FloatingInput label="Nombre" name="adviser-name" value={editName} onChange={(event) => setEditName(event.target.value)} /><FloatingInput label="Correo" name="adviser-email" value={editEmail} onChange={(event) => setEditEmail(event.target.value)} /><div className="flex justify-end"><SystemButton onClick={() => void saveEdit()} loading={saving}>Guardar</SystemButton></div></div></Modal><AlertModal open={Boolean(pending)} onClose={() => setPending(null)} onConfirm={() => void toggle()} type={pending?.isActive ? "warning" : "restore"} title={pending?.isActive ? "Desactivar asesor" : "Activar asesor"} message={pending?.isActive ? "El asesor no podrá recibir nuevas asignaciones." : "El asesor podrá recibir nuevas asignaciones."} confirmText={pending?.isActive ? "Desactivar" : "Activar"} loading={saving} /><SaleOrderAdviserImportAliasesModal open={Boolean(codesFor)} adviserUserId={codesFor?.id} adviserName={codesFor?.name} canManage={canManage} onClose={() => setCodesFor(null)} /></PageShell>;
}
