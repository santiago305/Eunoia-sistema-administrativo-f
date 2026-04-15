export const CLOSE_ALL_FLOATING_SELECTS_EVENT = "floating-select:close-all";

export function dispatchCloseAllFloatingSelects() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CLOSE_ALL_FLOATING_SELECTS_EVENT));
}
