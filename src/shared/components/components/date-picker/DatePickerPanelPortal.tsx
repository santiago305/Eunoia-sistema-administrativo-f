import { createPortal } from "react-dom";
import type { CSSProperties, ReactNode, RefObject } from "react";

type DatePickerPanelPortalProps = {
  open: boolean;
  panelRef: RefObject<HTMLDivElement | null>;
  panelStyle: CSSProperties;
  panelId: string;
  children: ReactNode;
};

export function DatePickerPanelPortal({
  open,
  panelRef,
  panelStyle,
  panelId,
  children,
}: DatePickerPanelPortalProps) {
  if (!open) return null;

  return createPortal(
    <div
      ref={panelRef}
      style={panelStyle}
      id={panelId}
      data-floating-overlay-root="true"
    >
      {children}
    </div>,
    document.body,
  );
}