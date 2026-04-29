import type { ReactNode } from "react";
import { Modal as BaseModal } from "@/shared/components/modales/Modal";

type LegacyModalProps = {
  title: string;
  children: ReactNode;
  onClose?: () => void;
  className?: string;
  closeOnBackdrop?: boolean;
};

export function Modal({
  title,
  children,
  onClose,
  className,
  closeOnBackdrop = true,
}: LegacyModalProps) {
  return (
    <BaseModal
      open
      title={title}
      onClose={onClose ?? (() => undefined)}
      className={className}
      closeOnOverlayClick={closeOnBackdrop}
      closeOnEscape={!!onClose}
      showCloseButton={!!onClose}
    >
      {children}
    </BaseModal>
  );
}
