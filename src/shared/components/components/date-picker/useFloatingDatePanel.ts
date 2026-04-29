import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { dispatchCloseAllFloatingSelects } from "../floatingSelectEvents";
import {
  CLOSE_ALL_FLOATING_DATES_EVENT,
  dispatchCloseAllFloatingDates,
} from "../floatingDateEvents";
import { UI_LAYERS } from "@/shared/components/ui/layers";

type UseFloatingDatePanelOptions = {
  disabled?: boolean;
  readOnly?: boolean;
  panelMinWidth?: number;
  preferredHeight?: number;
  onClose?: () => void;
};

type CloseAllFloatingDatesDetail = {
  sourceId?: string;
};

export function useFloatingDatePanel({
  disabled = false,
  readOnly = false,
  panelMinWidth = 320,
  preferredHeight = 340,
  onClose,
}: UseFloatingDatePanelOptions = {}) {
  const instanceId = useId();

  const hiddenPanelStyle = useMemo<CSSProperties>(
    () => ({
      position: "fixed",
      top: 0,
      left: 0,
      width: panelMinWidth,
      visibility: "hidden",
      pointerEvents: "none",
      zIndex: UI_LAYERS.floatingSelect,
    }),
    [panelMinWidth],
  );

  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>(hiddenPanelStyle);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const canOpen = !disabled && !readOnly;

  const closePanel = useCallback(() => {
    setOpen(false);
    onClose?.();
  }, [onClose]);

  const openPanel = useCallback(() => {
    if (!canOpen) return;

    dispatchCloseAllFloatingSelects();
    dispatchCloseAllFloatingDates(instanceId);

    setPanelStyle(hiddenPanelStyle);
    setOpen(true);
  }, [canOpen, hiddenPanelStyle, instanceId]);

  const togglePanel = useCallback(() => {
    if (!canOpen) return;

    setOpen((current) => {
      if (current) {
        onClose?.();
        return false;
      }

      dispatchCloseAllFloatingSelects();
      dispatchCloseAllFloatingDates(instanceId);
      return true;
    });
  }, [canOpen, instanceId, onClose]);

  const updatePanelPosition = useCallback(() => {
    const triggerEl = triggerRef.current;
    const panelEl = panelRef.current;

    if (!triggerEl || !panelEl) {
      closePanel();
      return;
    }

    const rect = triggerEl.getBoundingClientRect();
    const spacing = 8;
    const viewportPadding = 8;
    const width = Math.max(rect.width, panelMinWidth);
    const spaceBelow = window.innerHeight - rect.bottom - spacing - viewportPadding;
    const spaceAbove = rect.top - spacing - viewportPadding;
    const openAbove = spaceBelow < preferredHeight && spaceAbove > spaceBelow;

    const top = openAbove
      ? Math.max(viewportPadding, rect.top - spacing - panelEl.offsetHeight)
      : rect.bottom + spacing;

    const left = Math.min(
      Math.max(viewportPadding, rect.left),
      Math.max(viewportPadding, window.innerWidth - width - viewportPadding),
    );

    setPanelStyle({
      position: "fixed",
      top,
      left,
      width,
      visibility: "visible",
      pointerEvents: "auto",
      zIndex: UI_LAYERS.floatingSelect,
    });
  }, [closePanel, panelMinWidth, preferredHeight]);

  useEffect(() => {
    if (!open) {
      setPanelStyle(hiddenPanelStyle);
    }
  }, [hiddenPanelStyle, open]);

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (
        rootRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }

      closePanel();
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closePanel();
      }
    };

    const handleCloseAllDates = (event: Event) => {
      const customEvent = event as CustomEvent<CloseAllFloatingDatesDetail>;
      const sourceId = customEvent.detail?.sourceId;

      if (sourceId === instanceId) {
        return;
      }

      closePanel();
    };

    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener(CLOSE_ALL_FLOATING_DATES_EVENT, handleCloseAllDates);

    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener(CLOSE_ALL_FLOATING_DATES_EVENT, handleCloseAllDates);
    };
  }, [closePanel, instanceId]);

  useLayoutEffect(() => {
    if (!open) return;

    let raf1 = 0;
    let raf2 = 0;

    raf1 = window.requestAnimationFrame(() => {
      updatePanelPosition();
      raf2 = window.requestAnimationFrame(() => {
        updatePanelPosition();
      });
    });

    return () => {
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
    };
  }, [open, updatePanelPosition]);

  useEffect(() => {
    if (!open) return;

    const handleViewportChange = () => {
      updatePanelPosition();
    };

    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [open, updatePanelPosition]);

  return {
    open,
    panelStyle,
    rootRef,
    triggerRef,
    panelRef,
    canOpen,
    openPanel,
    closePanel,
    togglePanel,
    updatePanelPosition,
  };
}