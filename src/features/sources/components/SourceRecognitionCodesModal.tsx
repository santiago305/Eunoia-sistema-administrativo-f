import { useCallback } from "react";
import type { Source } from "@/features/sources/types/source";
import { RecognitionCodesModal } from "@/shared/components/recognition-codes/RecognitionCodesModal";
import {
  createSourceRecognitionCode,
  deleteSourceRecognitionCode,
  listSourceRecognitionCodes,
  updateSourceRecognitionCode,
} from "@/shared/services/sourceService";

type Props = {
  open: boolean;
  source: Source | null;
  canManage: boolean;
  onClose: () => void;
};

export function SourceRecognitionCodesModal({ open, source, canManage, onClose }: Props) {
  const listCodes = useCallback(
    (params: { page: number; limit: number; q?: string }) => {
      if (!source) return Promise.resolve({ items: [], total: 0 });
      return listSourceRecognitionCodes(source.id, params);
    },
    [source],
  );
  const createCode = useCallback(
    (payload: { code: string; replaceDeleted?: boolean }) => {
      if (!source) return Promise.reject(new Error("Enganche no seleccionado"));
      return createSourceRecognitionCode(source.id, payload);
    },
    [source],
  );
  const updateCode = useCallback(
    (id: string, payload: { code: string; replaceDeleted?: boolean }) => {
      if (!source) return Promise.reject(new Error("Enganche no seleccionado"));
      return updateSourceRecognitionCode(source.id, id, payload);
    },
    [source],
  );
  const deleteCode = useCallback(
    (id: string) => {
      if (!source) return Promise.reject(new Error("Enganche no seleccionado"));
      return deleteSourceRecognitionCode(source.id, id);
    },
    [source],
  );

  return (
    <RecognitionCodesModal
      open={open}
      onClose={onClose}
      title="Códigos de reconocimiento"
      tableId="source-recognition-codes-table"
      canManage={canManage}
      listCodes={listCodes}
      createCode={createCode}
      updateCode={updateCode}
      deleteCode={deleteCode}
    />
  );
}
