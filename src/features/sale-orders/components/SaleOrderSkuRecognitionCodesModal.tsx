import { useCallback } from "react";
import { RecognitionCodesModal } from "@/shared/components/recognition-codes/RecognitionCodesModal";
import {
  createSaleOrderSkuRecognitionCode,
  deleteSaleOrderSkuRecognitionCode,
  listSaleOrderSkuRecognitionCodes,
  updateSaleOrderSkuRecognitionCode,
} from "@/shared/services/saleOrderService";

type Props = {
  open: boolean;
  canManage: boolean;
  onClose: () => void;
};

export function SaleOrderSkuRecognitionCodesModal({ open, canManage, onClose }: Props) {
  const listCodes = useCallback(
    (params: { page: number; limit: number; q?: string }) =>
      listSaleOrderSkuRecognitionCodes(params),
    [],
  );
  const createCode = useCallback(
    (payload: { code: string; replaceDeleted?: boolean }) =>
      createSaleOrderSkuRecognitionCode(payload),
    [],
  );
  const updateCode = useCallback(
    (id: string, payload: { code: string; replaceDeleted?: boolean }) =>
      updateSaleOrderSkuRecognitionCode(id, payload),
    [],
  );
  const deleteCode = useCallback(
    (id: string) => deleteSaleOrderSkuRecognitionCode(id),
    [],
  );

  return (
    <RecognitionCodesModal
      open={open}
      onClose={onClose}
      title="Códigos de reconocimiento"
      tableId="sale-order-sku-recognition-codes-table"
      canManage={canManage}
      listCodes={listCodes}
      createCode={createCode}
      updateCode={updateCode}
      deleteCode={deleteCode}
    />
  );
}
