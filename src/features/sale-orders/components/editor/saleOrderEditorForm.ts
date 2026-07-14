import type {
  ClientApiDocType,
  ClientApiType,
  CreateClientBody,
  UpdateClientBody,
} from "@/features/clients/types/clientApi";
import type {
  SaleOrder,
  SaleOrderAttachment,
  SaleOrderEditPolicy,
  SaleOrderItemInput,
  SaveSaleOrderWithClientDto,
} from "../../types/saleOrder";
import {
  normalizeSaleOrderItems,
  toSaleOrderItemCommands,
} from "@/features/sale-orders/utils/saleOrderItemComponents";
import { toLocalDateKey } from "@/shared/utils/functionPurchases";

export type SaleOrderEditorTelephone = {
  id?: string;
  number: string;
  isMain: boolean;
  isActive?: boolean;
};

export type SaleOrderEditorClientData = {
  type: ClientApiType;
  fullName: string;
  docType: ClientApiDocType;
  docNumber: string;
  reference: string;
  address: string;
  departmentId: string;
  provinceId: string;
  districtId: string;
  isActive: boolean;
  telephonesReplace: SaleOrderEditorTelephone[];
};

export type SaleOrderEditorPayment = {
  id?: string;
  clientKey: string;
  bankAccountId?: string | null;
  method: string;
  amount: number;
  date?: string;
  operationNumber?: string | null;
  note?: string | null;
  photo?: File | null;
  existingPhotoUrl?: string | null;
  existingAttachmentId?: string | null;
};

export type SaleOrderEditorForm = {
  clientMode: "existing" | "create" | "update";
  selectedClientId: string;
  clientData: SaleOrderEditorClientData;
  workflowId: string;
  warehouseId: string;
  agencyDetail: string;
  sourceId: string;
  scheduleDate: string;
  deliveryDate: string;
  deliveryCost: number;
  logisticsCost: number;
  logisticsGeneratesPayable: boolean;
  discount: number;
  note: string;
  advertisingCode: string;
  observation: string;
  sendDate: string;
  sendCode: string;
  sendAddress: string;
  assignedBy: string;
  reserveBool: boolean | null;
  items: SaleOrderItemInput[];
  payments: SaleOrderEditorPayment[];
  shippingPhoto: File | null;
  existingShippingPhotoUrl: string | null;
  existingShippingAttachmentId: string | null;
  removedAttachmentIds: string[];
  createdAt: string | null;
  editPolicy: SaleOrderEditPolicy;
};

const editablePolicy: SaleOrderEditPolicy = {
  stockStatus: "NONE",
  productsEditable: true,
  warehouseEditable: true,
  isFinal: false,
  reason: null,
};

const emptyClient = (): SaleOrderEditorClientData => ({
  type: "NEW",
  fullName: "",
  docType: "DNI",
  docNumber: "",
  reference: "",
  address: "",
  departmentId: "",
  provinceId: "",
  districtId: "",
  isActive: true,
  telephonesReplace: [
    { number: "", isMain: true, isActive: true },
  ],
});

export function buildEmptySaleOrderEditorForm(): SaleOrderEditorForm {
  return {
    clientMode: "create",
    selectedClientId: "",
    clientData: emptyClient(),
    workflowId: "",
    warehouseId: "",
    agencyDetail: "",
    sourceId: "",
    scheduleDate: toLocalDateKey(new Date()),
    deliveryDate: "",
    deliveryCost: 0,
    logisticsCost: 0,
    logisticsGeneratesPayable: false,
    discount: 0,
    note: "",
    advertisingCode: "",
    observation: "",
    sendDate: "",
    sendCode: "",
    sendAddress: "",
    assignedBy: "",
    reserveBool: null,
    items: [],
    payments: [],
    shippingPhoto: null,
    existingShippingPhotoUrl: null,
    existingShippingAttachmentId: null,
    removedAttachmentIds: [],
    createdAt: null,
    editPolicy: editablePolicy,
  };
}

export function calculateSaleOrderTotals(
  items: Array<{ total?: number | null }>,
  deliveryCost: number,
  discount: number,
) {
  const subTotal = items.reduce(
    (sum, item) => sum + Number(item.total ?? 0),
    0,
  );
  const normalizedDelivery = Math.max(0, Number(deliveryCost || 0));
  const normalizedDiscount = Math.max(0, Number(discount || 0));
  return {
    subTotal,
    deliveryCost: normalizedDelivery,
    discount: normalizedDiscount,
    total: Math.max(0, subTotal + normalizedDelivery - normalizedDiscount),
  };
}

export function mapSaleOrderToEditorForm(
  order: SaleOrder,
): SaleOrderEditorForm {
  const base = buildEmptySaleOrderEditorForm();
  const attachments = order.attachments ?? [];
  const isShippingProof = (type: string) =>
    type === "SHIPPING_PHOTO" || type === "SHIPPING_PROOF";
  const isSalePaymentProof = (type: string) =>
    type === "PAYMENT_PROOF" || type === "SALE_PAYMENT_PROOF";
  const shipping = attachments.find(
    (attachment) => isShippingProof(attachment.type),
  );
  const proofByPaymentId = new Map(
    attachments
      .filter(
        (attachment) =>
          isSalePaymentProof(attachment.type) &&
          attachment.saleOrderPaymentId,
      )
      .map((attachment) => [
        attachment.saleOrderPaymentId!,
        attachment,
      ]),
  );
  const client = order.client;

  return {
    ...base,
    clientMode: client ? "update" : "create",
    selectedClientId: client?.id ?? "",
    clientData: client
      ? {
          type: client.type,
          fullName: client.fullName ?? "",
          docType: client.docType,
          docNumber: client.docNumber ?? "",
          reference: client.reference ?? "",
          address: client.address ?? "",
          departmentId: client.departmentId ?? "",
          provinceId: client.provinceId ?? "",
          districtId: client.districtId ?? "",
          isActive: client.isActive,
          telephonesReplace: (client.telephones ?? []).map((telephone) => ({
            id: telephone.id,
            number: telephone.number,
            isMain: telephone.isMain,
            isActive: telephone.isActive,
          })),
        }
      : emptyClient(),
    workflowId: order.workflow?.id ?? order.workflowId ?? "",
    warehouseId: order.warehouse?.id ?? "",
    agencyDetail: order.agencyDetail ?? "",
    sourceId: order.source?.id ?? "",
    scheduleDate: order.scheduleDate ?? "",
    deliveryDate: order.deliveryDate ?? "",
    deliveryCost: Number(order.deliveryCost ?? 0),
    logisticsCost: Number(order.logisticsCost ?? order.deliveryCost ?? 0),
    logisticsGeneratesPayable: Boolean(order.logisticsGeneratesPayable),
    discount: Number(order.discount ?? 0),
    note: order.note ?? "",
    advertisingCode: order.advertisingCode ?? "",
    observation: order.observation ?? "",
    sendDate: order.sendDate?.slice(0, 10) ?? "",
    sendCode: order.sendCode ?? "",
    sendAddress: order.sendAddress ?? "",
    assignedBy: order.assignedBy?.id ?? "",
    reserveBool: order.reserveBool ?? null,
    items: normalizeSaleOrderItems(order.items ?? []),
    payments: (order.payments ?? []).map((payment) => {
      const attachment = proofByPaymentId.get(payment.id);
      return {
        id: payment.id,
        clientKey: payment.clientKey ?? payment.id,
        bankAccountId: payment.bankAccount?.id ?? null,
        method: payment.method,
        amount: Number(payment.amount ?? 0),
        date: payment.date?.slice(0, 10),
        operationNumber: payment.operationNumber,
        note: payment.note,
        photo: null,
        existingPhotoUrl:
          attachment?.url ?? payment.paymentPhoto ?? null,
        existingAttachmentId: attachment?.id ?? null,
      };
    }),
    shippingPhoto: null,
    existingShippingPhotoUrl: shipping?.url ?? order.sendPhoto ?? null,
    existingShippingAttachmentId: shipping?.id ?? null,
    removedAttachmentIds: [],
    createdAt: order.createdAt ?? null,
    editPolicy: order.editPolicy ?? editablePolicy,
  };
}

export function markAttachmentRemoved(
  form: SaleOrderEditorForm,
  attachmentId?: string | null,
): SaleOrderEditorForm {
  if (!attachmentId || form.removedAttachmentIds.includes(attachmentId)) {
    return form;
  }
  return {
    ...form,
    removedAttachmentIds: [
      ...form.removedAttachmentIds,
      attachmentId,
    ],
  };
}

export function toSaveSaleOrderWithClientDto(
  form: SaleOrderEditorForm,
): SaveSaleOrderWithClientDto {
  const clientData: CreateClientBody = {
    type: form.clientData.type,
    fullName: form.clientData.fullName.trim(),
    docType: form.clientData.docType,
    docNumber:
      form.clientData.docType === "NONE"
        ? ""
        : form.clientData.docNumber.trim(),
    reference: form.clientData.reference.trim() || undefined,
    address: form.clientData.address.trim() || undefined,
    departmentId: form.clientData.departmentId,
    provinceId: form.clientData.provinceId,
    districtId: form.clientData.districtId,
    isActive: form.clientData.isActive,
    telephonesReplace: form.clientData.telephonesReplace
      .filter((telephone) => telephone.number.trim())
      .map((telephone) => ({
        number: telephone.number.trim(),
        isMain: telephone.isMain,
        isActive: telephone.isActive,
      })),
  };
  const updateData: UpdateClientBody = {
    ...clientData,
    telephonesReplace: form.clientData.telephonesReplace
      .filter((telephone) => telephone.id || telephone.number.trim())
      .map((telephone) => ({
        id: telephone.id,
        number: telephone.number.trim() || undefined,
        isMain: telephone.isMain,
        isActive: telephone.isActive,
      })),
  };
  const client =
    form.clientMode === "existing"
      ? { mode: "existing" as const, id: form.selectedClientId }
      : form.clientMode === "update"
        ? {
            mode: "update" as const,
            id: form.selectedClientId,
            data: updateData,
          }
        : { mode: "create" as const, data: clientData };

  return {
    client,
    workflowId: form.workflowId,
    warehouseId: form.warehouseId || undefined,
    agencyDetail: form.agencyDetail.trim() || undefined,
    sourceId: form.sourceId || undefined,
    scheduleDate: form.scheduleDate || undefined,
    deliveryDate: form.deliveryDate || undefined,
    deliveryCost: Math.max(0, Number(form.deliveryCost || 0)),
    logisticsCost: Math.max(0, Number(form.logisticsCost || 0)),
    discount: Math.max(0, Number(form.discount || 0)),
    note: form.note.trim() || undefined,
    advertisingCode: form.advertisingCode.trim() || null,
    observation: form.observation.trim() || null,
    sendDate: form.sendDate || null,
    sendCode: form.sendCode.trim() || null,
    sendAddress: form.sendAddress.trim() || null,
    assignedBy: form.assignedBy || null,
    items: toSaleOrderItemCommands(form.items),
    payments: form.payments.map((payment) => ({
      id: payment.id,
      clientKey: payment.clientKey,
      bankAccountId: payment.bankAccountId ?? null,
      method: payment.method,
      amount: Number(payment.amount || 0),
      date: payment.date || undefined,
      operationNumber: payment.operationNumber?.trim() || null,
      note: payment.note?.trim() || null,
    })),
    removedAttachmentIds: form.removedAttachmentIds,
  };
}

export function findAttachmentForPayment(
  attachments: SaleOrderAttachment[],
  paymentId: string,
) {
  return attachments.find(
    (attachment) =>
      (attachment.type === "PAYMENT_PROOF" ||
        attachment.type === "SALE_PAYMENT_PROOF") &&
      attachment.saleOrderPaymentId === paymentId,
  );
}
