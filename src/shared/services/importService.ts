import axiosInstance from "@/shared/common/utils/axios";
import { API_IMPORTS_GROUP } from "@/shared/services/APIs";

type ExcelValue = string | number | boolean | null;

export type OrdersImportPreviewResponse = {
  totalRows: number;
  rows: Array<{
    rowNumber: number;
    productName: ExcelValue;
    orderDate: ExcelValue;
    deliveryDate: ExcelValue;
    city: ExcelValue;
    district: ExcelValue;
    recipientName: ExcelValue;
    address: ExcelValue;
    deliveryNote: ExcelValue;
    locality: ExcelValue;
    phone: ExcelValue;
    couponCode: ExcelValue;
    productCodes: ExcelValue;
    quantity: ExcelValue;
    total: ExcelValue;
    advance: ExcelValue;
    codAmount: ExcelValue;
    internalNote: ExcelValue;
    confirmedBy: ExcelValue;
  }>;
};

export const previewSaleOrdersImport = async (
  file: File,
): Promise<OrdersImportPreviewResponse> => {
  const formData = new FormData();

  formData.append("file", file);

  const response = await axiosInstance.post<OrdersImportPreviewResponse>(
    API_IMPORTS_GROUP.saleOrders,
    formData,
  );

  return response.data;
};
