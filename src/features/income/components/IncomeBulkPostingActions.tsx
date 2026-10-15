import { CheckCircle2, ListChecks, X } from "lucide-react";
import { SystemButton } from "@/shared/components/components/SystemButton";

type Props = {
  active: boolean;
  selectedCount: number;
  posting?: boolean;
  onStart: () => void;
  onCancel: () => void;
  onPost: () => void;
};

export function IncomeBulkPostingActions({
  active,
  selectedCount,
  posting = false,
  onStart,
  onCancel,
  onPost,
}: Props) {
  if (!active) {
    return (
      <SystemButton
        size="icon"
        variant="outline"
        className="h-11 w-11"
        tooltip="Contabilizar"
        aria-label="Contabilizar"
        onClick={onStart}
        leftIcon={<ListChecks className="h-4 w-4" aria-hidden="true" />}
      />
    );
  }

  return (
    <>
      <SystemButton
        size="icon"
        variant="primary"
        className="h-11 w-11"
        tooltip="Contabilizar pagos"
        aria-label="Contabilizar pagos"
        disabled={selectedCount === 0 || posting}
        onClick={onPost}
        leftIcon={<CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
      />
      <SystemButton
        size="icon"
        variant="danger"
        className="h-11 w-11"
        tooltip="Cancelar selección"
        aria-label="Cancelar selección"
        onClick={onCancel}
        leftIcon={<X className="h-4 w-4" aria-hidden="true" />}
      />
    </>
  );
}
