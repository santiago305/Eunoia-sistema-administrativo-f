import {
    forwardRef,
    startTransition,
    useCallback,
    useImperativeHandle,
    useState,
    type Dispatch,
    type ForwardedRef,
    type ReactElement,
    type RefAttributes,
    type SetStateAction,
} from "react";
import { Bike, Plus } from "lucide-react";
import { env } from "@/env";
import { SystemButton } from "@/shared/components/components/SystemButton";
import type {
    SaleOrderEditPolicy,
    SaleOrderItemComponentInput,
    SaleOrderItemInput,
} from "@/features/sale-orders/types/saleOrder";
import { SaleOrderItemEditorModal } from "@/features/sale-orders/components/modal-create/SaleOrderItemEditorModal";
import { buildEmptySaleOrderItem } from "@/features/sale-orders/utils/saleOrderForm";
import { Modal } from "@/shared/components/modales/Modal";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { normalizeMoney, parseDecimalInput } from "@/shared/utils/functionPurchases";
import { SaleOrderItemsTable } from "@/features/sale-orders/components/SaleOrderItemsTable";
import { ImagePreviewModal } from "@/shared/components/components/ImagePreviewModal";
import { getSku } from "@/shared/services/skuService";

type SaleOrderItemsForm = {
    items?: SaleOrderItemInput[] | null;
    deliveryCost?: number | null;
    discount?: number | null;
    warehouseId?: string | null;
    reserveBool?: boolean | null;
    editPolicy?: SaleOrderEditPolicy;
};

type Props<T extends SaleOrderItemsForm> = {
    form: T;
    setForm: Dispatch<SetStateAction<T>>;
    productsEditable?: boolean;
    showActions?: boolean;
};

const resolveImageUrl = (value?: string | null) => {
    if (!value) return "";
    if (/^(https?:|blob:|data:)/i.test(value)) return value;
    try {
        return new URL(value, env.apiBaseUrl).toString();
    } catch {
        return value;
    }
};

const getComponentImage = (component: SaleOrderItemComponentInput) =>
    resolveImageUrl(component.sku?.image ?? component.skuImage ?? null);

const getSkuDetailImage = (data: unknown) => {
    const detail = data as {
        image?: string | null;
        sku?: { image?: string | null } | null;
    } | null;

    return resolveImageUrl(detail?.sku?.image ?? detail?.image ?? null);
};

const resolveComponentImage = async (component: SaleOrderItemComponentInput) => {
    const cachedImage = getComponentImage(component);
    if (cachedImage) return cachedImage;

    const skuId = component.sku?.id ?? component.skuId ?? "";
    if (!skuId) return "";

    try {
        return getSkuDetailImage(await getSku(skuId));
    } catch {
        return "";
    }
};

export type SaleOrderItemsSectionHandle = {
    openCreate: () => void;
    openTariff: () => void;
};

function SaleOrderItemsSectionInner<T extends SaleOrderItemsForm>(
    {
        form,
        setForm,
        productsEditable = true,
        showActions = true,
    }: Props<T>,
    ref: ForwardedRef<SaleOrderItemsSectionHandle>,
) {
    const [openEditor, setOpenEditor] = useState(false);
    const [openTarifa, setOpenTarifa] = useState(false);
    const [previewImageUrl, setPreviewImageUrl] = useState("");
    const [tarifa, setTarifa] = useState(0);
    const [draft, setDraft] = useState<SaleOrderItemInput>(() => buildEmptySaleOrderItem());

    const openComponentImagePreview = useCallback(async (component: SaleOrderItemComponentInput) => {
        setPreviewImageUrl(await resolveComponentImage(component));
    }, []);

    const openCreate = useCallback(() => {
        setDraft(buildEmptySaleOrderItem());
        setOpenEditor(true);
    }, []);

    const confirm = useCallback(() => {
        startTransition(() => {
            setForm((prev) => {
                return { ...prev, items: [...(prev.items ?? []), draft] };
            });
        });
        setOpenEditor(false);
    }, [draft, setForm]);

    const openTarifaModal = useCallback(() => {
        setTarifa(form.deliveryCost ?? 0);
        setOpenTarifa(true);
    }, [form.deliveryCost]);

    useImperativeHandle(
        ref,
        () => ({
            openCreate,
            openTariff: openTarifaModal,
        }),
        [openCreate, openTarifaModal],
    );

    return (
        <section className="overflow-hidden flex flex-col">
            {showActions ? (
                <div className="px-3 sm:px-4 flex items-center justify-end gap-2">
                    <SystemButton variant="motion" leftIcon={<Bike className="h-4 w-4" />} onClick={openTarifaModal}>
                        Tarifa
                    </SystemButton>
                    <SystemButton leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate} disabled={!productsEditable}>
                        Agregar Pack
                    </SystemButton>
                </div>
            ) : null}

            <div
                className={`flex-1 overflow-hidden px-0 sm:px-0 ${
                    showActions ? "mt-0" : "mt-0"
                }`}
            >
                <SaleOrderItemsTable
                    items={form.items ?? []}
                    warehouseId={form.warehouseId ?? undefined}
                    reserveBool={form.reserveBool ?? null}
                    stockStatus={form.editPolicy?.stockStatus ?? "NONE"}
                    productsEditable={productsEditable}
                    onChangeItem={(nextItem, index) => {
                        setForm((previous) => ({
                            ...previous,
                            items: (previous.items ?? []).map((item, itemIndex) =>
                                itemIndex === index ? nextItem : item,
                            ),
                        }));
                    }}
                    onDelete={(_, index) => {
                        startTransition(() =>
                            setForm((previous) => ({
                                ...previous,
                                items: (previous.items ?? []).filter(
                                    (_item, itemIndex) => itemIndex !== index,
                                ),
                            })),
                        );
                    }}
                    onOpenDetail={(_item, _index, component) => {
                        void openComponentImagePreview(component);
                    }}
                />
            </div>

            <SaleOrderItemEditorModal
                open={openEditor}
                title="Agregar Pack"
                value={draft}
                onChange={setDraft}
                onClose={() => setOpenEditor(false)}
                onConfirm={confirm}
            />
            <ImagePreviewModal
                open={Boolean(previewImageUrl)}
                images={previewImageUrl ? [previewImageUrl] : []}
                currentIndex={0}
                onClose={() => setPreviewImageUrl("")}
                altPrefix="Imagen del SKU"
            />
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

export const SaleOrderItemsSection = forwardRef(
    SaleOrderItemsSectionInner,
) as <T extends SaleOrderItemsForm>(
    props: Props<T> &
        RefAttributes<SaleOrderItemsSectionHandle>,
) => ReactElement;
