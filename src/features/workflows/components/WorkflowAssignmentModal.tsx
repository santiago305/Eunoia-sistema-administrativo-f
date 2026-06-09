import { useEffect, useState } from "react";
import { Modal } from "@/shared/components/modales/Modal";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { listWorkflows } from "@/features/workflows/services/workflowService";
import { assignSaleOrderWorkflow } from "@/shared/services/saleOrderService";
import { parseApiError } from "@/shared/common/utils/handleApiError";

type Props = {
  open: boolean;
  saleOrderId: string;
  onClose: () => void;
  onAssigned: () => void | Promise<void>;
};

export function WorkflowAssignmentModal({ open, saleOrderId, onClose, onAssigned }: Props) {
  const [workflowId, setWorkflowId] = useState("");
  const [options, setOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setWorkflowId("");
    setError("");
    void listWorkflows()
      .then((items) =>
        setOptions(items.filter((item) => item.isActive).map((item) => ({ value: item.id, label: item.name }))),
      )
      .catch((err) => setError(parseApiError(err)));
  }, [open]);

  const assign = async () => {
    if (!workflowId) return;
    setLoading(true);
    setError("");
    try {
      await assignSaleOrderWorkflow(saleOrderId, workflowId);
      await onAssigned();
      onClose();
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} preventClose={loading} title="Asignar flujo" className="w-[420px]">
      <div className="space-y-3">
        <FloatingSelect
          label="Flujo"
          name="workflow-assignment"
          value={workflowId}
          onChange={setWorkflowId}
          options={options}
          searchable
        />
        {error ? <div className="rounded bg-rose-50 p-2 text-xs text-rose-700">{error}</div> : null}
        <div className="flex justify-end gap-2">
          <SystemButton variant="outline" onClick={onClose} disabled={loading}>Cerrar</SystemButton>
          <SystemButton onClick={() => void assign()} disabled={!workflowId || loading} loading={loading}>Asignar</SystemButton>
        </div>
      </div>
    </Modal>
  );
}
