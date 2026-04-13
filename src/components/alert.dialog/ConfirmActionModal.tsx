import type { ReactNode } from "react";
import { Modal } from "@/components/modales/Modal";
import { SystemButton } from "@/components/SystemButton";

type ConfirmActionModalProps = {
  open: boolean;
  title: string;
  description?: ReactNode;
  warning?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: "primary" | "danger";
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  className?: string;
  bodyClassName?: string;
};

export function ConfirmActionModal({
  open,
  title,
  description,
  warning,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  confirmVariant = "danger",
  onClose,
  onConfirm,
  bodyClassName,
}: ConfirmActionModalProps) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      bodyClassName={bodyClassName}
    >
      {warning ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-[11px] text-rose-800">
          {warning}
        </div>
      ) : null}

      {description ? <p className="text-[11px] text-black/70">{description}</p> : null}

      <div className="mt-4 flex justify-end gap-2">
        <SystemButton variant="outline" size="sm" onClick={onClose}>
          {cancelLabel}
        </SystemButton>
        <SystemButton
          variant={confirmVariant === "primary" ? "primary" : "danger"}
          size="sm"
          onClick={() => {
            void onConfirm();
          }}
        >
          {confirmLabel}
        </SystemButton>
      </div>
    </Modal>
  );
}
