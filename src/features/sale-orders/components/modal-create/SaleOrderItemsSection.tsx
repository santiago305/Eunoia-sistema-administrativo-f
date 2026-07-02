import { startTransition, useCallback, useMemo, useState } from "react";
import { Bike, Pencil, Plus, Trash2 } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { DataTable } from "@/shared/components/table/DataTable";
import type { DataTableColumn } from "@/shared/components/table/types";
import type { CreateSaleOrderDto, SaleOrderItemInput } from "@/features/sale-orders/types/saleOrder";
import { SaleOrderItemEditorModal } from "@/features/sale-orders/components/modal-create/SaleOrderItemEditorModal";
import { buildEmptySaleOrderItem } from "@/features/sale-orders/utils/saleOrderForm";
import { Modal } from "@/shared/components/modales/Modal";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { normalizeMoney, parseDecimalInput } from "@/shared/utils/functionPurchases";
import { SaleOrderItemComponentsStockModal } from "@/features/sale-orders/components/modal-create/SaleOrderItemComponentsStockModal";

type Props = {
    form: CreateSaleOrderDto;
    setForm: Dispatch<SetStateAction<CreateSaleOrderDto>>;
};

type ItemRow = SaleOrderItemInput & { id: string; rowIndex: number };

export function SaleOrderItemsSection({ form, setForm }: Props) {
    const [openEditor, setOpenEditor] = useState(false);
    const [openTarifa, setOpenTarifa] = useState(false);
    const [openDetail, setOpenDetail] = useState(false);
    const [detailItem, setDetailItem] = useState<SaleOrderItemInput | null>(null);
    const [tarifa, setTarifa] = useState(0);
    const [editIndex, setEditIndex] = useState<number | null>(null);
    const [draft, setDraft] = useState<SaleOrderItemInput>(() => buildEmptySaleOrderItem());

    const subTotal = useMemo(() => (form.items ?? []).reduce((acc, item) => acc + (item.total ?? 0), 0), [form.items]);
    const deliveryCost = form.deliveryCost ?? 0;
    const total = subTotal + deliveryCost;

    const rows = useMemo<ItemRow[]>(() => (form.items ?? []).map((item, index) => ({ ...item, id: `item-${index}`, rowIndex: index })), [form.items]);

    const columns = useMemo<DataTableColumn<ItemRow>[]>(
        () => [
            { id: "description", header: "Descripción", cell: (row) => <span className="truncate">{row.description}</span> },
            {
                id: "quantity",
                header: "Cantidad",
                cell: (row) => <span className="tabular-nums">{row.quantity}</span>,
            },
            {
                id: "unitPrice",
                header: "Precio unit.",
                cell: (row) => <span className="tabular-nums">{row.unitPrice.toLocaleString("es-PE", { style: "currency", currency: "PEN" })}</span>,
            },
            {
                id: "total",
                header: "Total",
                cell: (row) => <span className="tabular-nums">{row.total.toLocaleString("es-PE", { style: "currency", currency: "PEN" })}</span>,
            },
            {
                id: "actions",
                header: "Acciones",
                stopRowClick: true,
                cell: (row) => (
                    <div className="flex justify-center gap-2">
                        <SystemButton
                            size="icon"
                            variant="outline"
                            className="h-8 w-8"
                            title="Editar"
                            onClick={() => {
                                setEditIndex(row.rowIndex);
                                setDraft(form.items[row.rowIndex]);
                                setOpenEditor(true);
                            }}
                        >
                            <Pencil className="h-4 w-4" />
                        </SystemButton>
                        <SystemButton
                            size="icon"
                            variant="danger"
                            className="h-8 w-8"
                            title="Eliminar"
                            onClick={() => {
                                startTransition(() =>
                                    setForm((prev) => ({
                                        ...prev,
                                        items: (prev.items ?? []).filter((_, i) => i !== row.rowIndex),
                                    })),
                                );
                            }}
                        >
                            <Trash2 className="h-4 w-4" />
                        </SystemButton>
                    </div>
                ),
            },
        ],
        [form.items, setForm],
    );

    const openCreate = useCallback(() => {
        setEditIndex(null);
        setDraft(buildEmptySaleOrderItem());
        setOpenEditor(true);
    }, []);

    const confirm = useCallback(() => {
        startTransition(() => {
            setForm((prev) => {
                const items = [...(prev.items ?? [])];
                if (editIndex === null) items.push(draft);
                else items[editIndex] = draft;
                return { ...prev, items };
            });
        });
        setOpenEditor(false);
    }, [draft, editIndex, setForm]);

    const openTarifaModal = useCallback(() => {
        setTarifa(form.deliveryCost ?? 0);
        setOpenTarifa(true);
    }, [form.deliveryCost]);

    return (
        <section className="overflow-hidden flex flex-col">
            <div className="px-3 sm:px-4 flex items-center justify-end gap-2">
                <SystemButton variant="motion" leftIcon={<Bike className="h-4 w-4" />} onClick={openTarifaModal}>
                    Tarifa
                </SystemButton>
                <SystemButton leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
                    Agregar Pack
                </SystemButton>
            </div>

            <div className="px-3 sm:px-4 mt-3 flex-1 overflow-auto">
                <DataTable
                    tableId="sale-orders-items"
                    data={rows}
                    columns={columns}
                    rowKey="id"
                    onRowClick={(row) => {
                        const selected = form.items?.[row.rowIndex] ?? null;
                        setDetailItem(selected);
                        setOpenDetail(true);
                    }}
                />
                <div className="p-2 space-y-1">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">SubTotal:</span>
                        <span className="text-sm">{subTotal.toLocaleString("es-PE", { style: "currency", currency: "PEN" })}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Costo de envío:</span>
                        <span className="text-sm">{deliveryCost.toLocaleString("es-PE", { style: "currency", currency: "PEN" })}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Total:</span>
                        <span className="text-sm">{total.toLocaleString("es-PE", { style: "currency", currency: "PEN" })}</span>
                    </div>
                </div>
            </div>

            <SaleOrderItemEditorModal
                open={openEditor}
                title={editIndex === null ? "Agregar Producto" : "Editar Producto"}
                value={draft}
                onChange={setDraft}
                onClose={() => setOpenEditor(false)}
                onConfirm={confirm}
            />
            <SaleOrderItemComponentsStockModal open={openDetail} onClose={() => setOpenDetail(false)} warehouseId={form.warehouseId} item={detailItem} />
            <Modal open={openTarifa} onClose={() => setOpenTarifa(false)} title="Tarifa de envío">
                <div className="p-4">
                    <FloatingInput
                        label="Precio unit."
                        name="item-unit-price"
                        type="number"
                        min={0}
                        step="0.01"
                        value={String(tarifa)}
                        onChange={(e) => {
                            setTarifa(normalizeMoney(parseDecimalInput(e.target.value)));
                        }}
                    />
                </div>
                <div className="p-4 border-t flex justify-end gap-2">
                    <SystemButton variant="outline" onClick={() => setOpenTarifa(false)}>
                        Cancelar
                    </SystemButton>
                    <SystemButton
                        onClick={() => {
                            setForm((prev) => ({ ...prev, deliveryCost: Math.max(0, tarifa) }));
                            setOpenTarifa(false);
                        }}
                    >
                        Guardar
                    </SystemButton>
                </div>
            </Modal>
        </section>
    );
}
