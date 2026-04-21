import { PdfViewerModal } from "@/components/ModalOpenPdf";
import { SystemButton } from "@/components/SystemButton";
import { getPurchaseOrderPdf } from "@/services/pdfServices";
import { Plus, List } from "lucide-react";
import { useCallback } from "react";

type ModalNavegateProps = {
  open: boolean;
  onClose: () => void;
  onNewPurchase: () => void;
  onGoToList: () => void;
  poId?: string;
  primaryColor?: string;
  isEdit?: boolean;
};

const DEFAULT_PRIMARY = "hsl(var(--primary))";

export function ModalNavegate({
  open,
  onNewPurchase,
  onGoToList,
  poId,
  primaryColor,
  onClose,
}: ModalNavegateProps) {
  const accent = primaryColor ?? DEFAULT_PRIMARY;
  const loadPurchasePdf = useCallback(() => {
    if (!poId) {
      return Promise.reject(new Error("Missing purchase order id"));
    }
    return getPurchaseOrderPdf(poId);
  }, [poId]);

  return (
    <PdfViewerModal
      open={open}
      onClose={onClose}
      title="Compra procesada"
      // className="w-[800px] h-[93vh]"
      primaryColor={accent}
      loadWhen={Boolean(poId)}
      reloadKey={poId ?? null}
      iframeTitle={poId ? `orden-compra-${poId}` : "orden-compra"}
      getPdf={loadPurchasePdf}
      footer={
        <div className="flex flex-col gap-3 sm:flex-row">
          <SystemButton
            leftIcon={<Plus className="h-4 w-4" />}
            variant="ghost"
            className="flex-1 bg-gray-200"
            onClick={onNewPurchase}
          >
            Ingresar nueva compra
          </SystemButton>

          <SystemButton
            leftIcon={<List className="h-4 w-4" />}
            className="flex-1"
            style={{
              backgroundColor: accent,
              borderColor: `color-mix(in srgb, ${accent} 20%, transparent)`,
            }}
            onClick={onGoToList}
          >
            Ir a listado de compras
          </SystemButton>
        </div>
      }
    />
  );
}
