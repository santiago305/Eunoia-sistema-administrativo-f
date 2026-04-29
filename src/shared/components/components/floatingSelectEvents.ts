export const CLOSE_ALL_FLOATING_SELECTS_EVENT = "floating-select:close-all";

// Global UI contract for floating selects.
// Any overlay-like component may dispatch this event when opening or closing
// to ensure orphaned select panels never remain mounted on screen.
// The current contract is intentionally small: "close all" is enough for
// selects and modals today, while leaving room to evolve into a broader
// floating-layer registry if popovers, date pickers, or command palettes
// need shared coordination later.
export function dispatchCloseAllFloatingSelects() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CLOSE_ALL_FLOATING_SELECTS_EVENT));
}
