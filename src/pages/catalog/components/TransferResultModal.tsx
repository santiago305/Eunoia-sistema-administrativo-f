import { useEffect, useState } from "react";
import { Modal } from "@/components/settings/modal";
import { SystemButton } from "@/components/SystemButton";
import { getDocumentInventoryPdf } from "@/services/pdfServices";
import type { TransferResultModalProps } from "@/pages/catalog/types/transfer";

export function TransferResultModal({
    open,
    transferId,
    onNew,
    onGoToList,
    onClose,
    title,
    goToLabel,
}: TransferResultModalProps) {
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open || !transferId) {
            setPdfUrl(null);
            setError(null);
            setLoading(false);
            return;
        }

        let alive = true;
        let objectUrl: string | null = null;

        const loadPdf = async () => {
            setLoading(true);
            setError(null);
            setPdfUrl(null);
            try {
                const blob = await getDocumentInventoryPdf(transferId);
                if (!alive) return;
                objectUrl = URL.createObjectURL(blob);
                setPdfUrl(objectUrl);
            } catch {
                if (!alive) return;
                setError("No se pudo cargar el PDF.");
            } finally {
                if (alive) setLoading(false);
            }
        };

        void loadPdf();
        return () => {
            alive = false;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [transferId, open]);

    if (!open) return null;

    return (
        <Modal title={title} className="w-[800px] h-[95vh]" onClose={onClose}>
            <div className="space-y-6">
                <div className="rounded-2xl border border-black/10 overflow-hidden bg-white">
                    {loading && (
                        <div className="flex h-[60vh] items-center justify-center text-sm text-black/60">
                            Cargando PDF...
                        </div>
                    )}
                    {!loading && error && (
                        <div className="flex h-[60vh] items-center justify-center text-sm text-rose-600">
                            {error}
                        </div>
                    )}
                    {!loading && !error && pdfUrl && (
                        <iframe
                            title={`documento-transfer-${transferId}`}
                            src={pdfUrl}
                            className="h-[74vh] w-full overflow-auto"
                        />
                    )}
                    {!loading && !error && !pdfUrl && (
                        <div className="flex h-[60vh] items-center justify-center text-sm text-black/60">
                            No hay PDF disponible.
                        </div>
                    )}
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                    <SystemButton variant="outline" onClick={onNew} className="flex-1">
                        Ingresar nueva transferencia
                    </SystemButton>
                    <SystemButton onClick={onGoToList} className="flex-1">
                        {goToLabel}
                    </SystemButton>
                </div>
            </div>
        </Modal>
    );
}
